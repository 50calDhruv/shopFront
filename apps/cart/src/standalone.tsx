import { StrictMode, useEffect, useReducer } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import {
  EventBusProvider,
  createEventBus,
  useEventBus,
  useEventBusSubscription,
} from '@shop/ui/events';
import type { CartLineSnapshot } from '@shop/ui/events';
import { startMocks, products } from '@shop/mocks';
import App from './App';
import './index.css';

/**
 * STANDALONE MODE — `pnpm --filter @shop/cart dev`
 *
 * The cart remote is a pure mirror: it renders what the shell broadcasts and
 * sends commands back. So running it alone requires standing in for the shell's
 * half of that conversation — a miniature CartProvider that owns the state and
 * answers commands.
 *
 * This stub is the honest measure of this remote's coupling. It needs a router,
 * a bus, and a cart reducer, and nothing else. If it ever needed to stub auth,
 * navigation state and three more providers, that would be the signal the remote
 * had quietly become dependent on the shell's internals.
 */

const standaloneBus = createEventBus({
  debug: true,
  replay: ['cart:updated', 'auth:changed'],
});

type Action =
  | { type: 'add'; productId: string; qty: number }
  | { type: 'setQty'; productId: string; qty: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' };

function reducer(lines: CartLineSnapshot[], action: Action): CartLineSnapshot[] {
  switch (action.type) {
    case 'add': {
      const product = products.find((p) => p.id === action.productId);
      const existing = lines.find((l) => l.productId === action.productId);
      if (existing) {
        return lines.map((l) =>
          l.productId === action.productId ? { ...l, qty: l.qty + action.qty } : l,
        );
      }
      return [
        ...lines,
        {
          productId: action.productId,
          title: product?.title ?? null,
          unitPriceCents: product?.priceCents ?? null,
          qty: action.qty,
        },
      ];
    }
    case 'setQty':
      return action.qty <= 0
        ? lines.filter((l) => l.productId !== action.productId)
        : lines.map((l) =>
            l.productId === action.productId ? { ...l, qty: action.qty } : l,
          );
    case 'remove':
      return lines.filter((l) => l.productId !== action.productId);
    case 'clear':
      return [];
    default:
      return lines;
  }
}

/** Stands in for the shell's CartProvider: the single writer of cart state. */
function FakeShellCartOwner() {
  const bus = useEventBus();
  const [lines, dispatch] = useReducer(reducer, [
    // Seed a couple of lines so the page is not empty on first load.
    { productId: 'p-001', title: 'Aria Over-Ear Headphones', unitPriceCents: 32900, qty: 1 },
    { productId: 'p-008', title: 'Stack Archive Boxes', unitPriceCents: 6900, qty: 2 },
  ]);

  useEventBusSubscription('cart:add', (p) => dispatch({ type: 'add', ...p }));
  useEventBusSubscription('cart:setQty', (p) => dispatch({ type: 'setQty', ...p }));
  useEventBusSubscription('cart:remove', (p) => dispatch({ type: 'remove', ...p }));
  useEventBusSubscription('cart:clear', () => dispatch({ type: 'clear' }));

  useEffect(() => {
    bus.emit('cart:updated', {
      count: lines.reduce((sum, l) => sum + l.qty, 0),
      subtotal: lines.reduce((sum, l) => sum + (l.unitPriceCents ?? 0) * l.qty, 0),
      lines,
    });
  }, [bus, lines]);

  return null;
}

function StandaloneChrome() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3 rounded-lg bg-caution-50 px-4 py-3">
        <span className="text-sm font-semibold text-caution-600">Standalone mode</span>
        <p className="text-xs text-ink-600">
          The cart remote with a stub shell owning the state. Seeded with two lines.
        </p>
      </header>

      <FakeShellCartOwner />

      <main>
        <App />
      </main>
    </div>
  );
}

async function bootstrap(): Promise<void> {
  await startMocks();

  const container = document.getElementById('root');
  if (!container) throw new Error('#root missing from index.html');

  createRoot(container).render(
    <StrictMode>
      <EventBusProvider bus={standaloneBus}>
        <BrowserRouter>
          <StandaloneChrome />
        </BrowserRouter>
      </EventBusProvider>
    </StrictMode>,
  );
}

void bootstrap();
