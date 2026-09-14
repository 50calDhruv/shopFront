import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import type { ReactNode } from 'react';
import { useEventBus, useEventBusSubscription } from '@shop/ui/events';

/**
 * WHY THE SHELL OWNS CART STATE (and not the cart remote)
 * -------------------------------------------------------
 * The obvious micro-frontend instinct is "the cart domain owns cart data", which
 * would put this state inside apps/cart. We deliberately do not, for one reason:
 *
 *   The cart-count badge must be correct BEFORE the cart remote has ever loaded,
 *   and must keep working if the cart remote is DOWN.
 *
 * If the remote owned the state, the badge would either force the shell to eagerly
 * load the cart remote on every page — defeating lazy loading — or show a wrong
 * count until the user visited /cart. And a failed cart remote would silently
 * zero the badge, which is the opposite of failure isolation.
 *
 * So: the shell owns cart *state* (small, cross-cutting, needed by shell chrome).
 * The cart remote owns cart *UI* — the drawer, quantity controls, checkout flow.
 * That split is the one that survives a remote being unavailable.
 */

export interface CartLine {
  productId: string;
  qty: number;
  /** null while the product details are still being resolved. */
  title: string | null;
  unitPriceCents: number | null;
}

interface CartState {
  lines: CartLine[];
}

type CartAction =
  | { type: 'add'; productId: string; qty: number }
  | { type: 'resolve'; productId: string; title: string; unitPriceCents: number }
  | { type: 'setQty'; productId: string; qty: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' }
  | { type: 'hydrate'; lines: CartLine[] };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'hydrate':
      return { lines: action.lines };

    case 'add': {
      const existing = state.lines.find((l) => l.productId === action.productId);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.productId === action.productId ? { ...l, qty: l.qty + action.qty } : l,
          ),
        };
      }
      // Added optimistically with unknown price so the badge updates on the same
      // frame as the click. Details fill in a moment later.
      return {
        lines: [
          ...state.lines,
          { productId: action.productId, qty: action.qty, title: null, unitPriceCents: null },
        ],
      };
    }

    case 'resolve':
      return {
        lines: state.lines.map((l) =>
          l.productId === action.productId
            ? { ...l, title: action.title, unitPriceCents: action.unitPriceCents }
            : l,
        ),
      };

    case 'setQty': {
      if (action.qty <= 0) {
        return { lines: state.lines.filter((l) => l.productId !== action.productId) };
      }
      return {
        lines: state.lines.map((l) =>
          l.productId === action.productId ? { ...l, qty: action.qty } : l,
        ),
      };
    }

    case 'remove':
      return { lines: state.lines.filter((l) => l.productId !== action.productId) };

    case 'clear':
      return { lines: [] };

    default:
      return state;
  }
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  /** True while any line is still resolving its price. */
  resolving: boolean;
  addItem: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'shop-front:cart';

function readStoredCart(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Validate every line at the boundary rather than trusting our own old writes.
    return parsed.flatMap((entry): CartLine[] => {
      if (typeof entry !== 'object' || entry === null) return [];
      const candidate = entry as Record<string, unknown>;
      if (typeof candidate['productId'] !== 'string') return [];
      if (typeof candidate['qty'] !== 'number' || candidate['qty'] <= 0) return [];
      return [
        {
          productId: candidate['productId'],
          qty: candidate['qty'],
          title: typeof candidate['title'] === 'string' ? candidate['title'] : null,
          unitPriceCents:
            typeof candidate['unitPriceCents'] === 'number'
              ? candidate['unitPriceCents']
              : null,
        },
      ];
    });
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const bus = useEventBus();
  const [state, dispatch] = useReducer(cartReducer, undefined, () => ({
    lines: readStoredCart(),
  }));

  /**
   * THE CANONICAL CROSS-REMOTE FLOW.
   * The catalog remote emits `cart:add`. It does not import this provider, know
   * the cart's shape, or touch the cart remote. It fires a typed message at the
   * shell and the shell decides what that means.
   */
  useEventBusSubscription('cart:add', ({ productId, qty }) => {
    dispatch({ type: 'add', productId, qty });
  });

  // Resolve titles/prices for optimistically-added lines.
  useEffect(() => {
    const pending = state.lines.filter((l) => l.unitPriceCents === null);
    if (pending.length === 0) return;

    const controller = new AbortController();

    for (const line of pending) {
      void (async () => {
        try {
          const response = await fetch(`/api/products/${line.productId}`, {
            signal: controller.signal,
          });
          if (!response.ok) return;

          const body: unknown = await response.json();
          const product = (body as { product?: unknown }).product;
          if (typeof product !== 'object' || product === null) return;

          const { title, priceCents } = product as { title?: unknown; priceCents?: unknown };
          if (typeof title !== 'string' || typeof priceCents !== 'number') return;

          dispatch({
            type: 'resolve',
            productId: line.productId,
            title,
            unitPriceCents: priceCents,
          });
        } catch {
          // Aborted or offline. The line stays pending and will retry on the
          // next mount; the badge count is already correct regardless.
        }
      })();
    }

    return () => controller.abort();
  }, [state.lines]);

  const count = useMemo(
    () => state.lines.reduce((sum, line) => sum + line.qty, 0),
    [state.lines],
  );

  const subtotalCents = useMemo(
    () =>
      state.lines.reduce(
        (sum, line) => sum + (line.unitPriceCents ?? 0) * line.qty,
        0,
      ),
    [state.lines],
  );

  const resolving = state.lines.some((l) => l.unitPriceCents === null);

  // Persist, then broadcast the authoritative totals. Remotes (the cart drawer,
  // any future mini-cart) listen rather than reaching into shell state.
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lines));
  }, [state.lines]);

  useEffect(() => {
    bus.emit('cart:updated', { count, subtotal: subtotalCents });
  }, [bus, count, subtotalCents]);

  const addItem = useCallback((productId: string, qty = 1) => {
    dispatch({ type: 'add', productId, qty });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    dispatch({ type: 'setQty', productId, qty });
  }, []);

  const removeItem = useCallback((productId: string) => {
    dispatch({ type: 'remove', productId });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: 'clear' });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines: state.lines,
      count,
      subtotalCents,
      resolving,
      addItem,
      setQty,
      removeItem,
      clear,
    }),
    [state.lines, count, subtotalCents, resolving, addItem, setQty, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (value === null) {
    throw new Error('useCart() must be used inside <CartProvider>');
  }
  return value;
}
