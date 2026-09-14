/**
 * The cross-remote event contract.
 *
 * This map is the ONLY coupling permitted between the shell and its remotes, and
 * between remotes. A remote never imports another remote; it emits a typed
 * message the shell understands, and the shell decides what happens next.
 *
 * Adding a channel here is a deliberate, reviewable act: it widens the public
 * contract every app depends on. Treat it like an API schema, not a scratchpad.
 *
 * Channels come in two flavours, and the distinction matters:
 *   COMMANDS  ("please do this")     — cart:add, cart:setQty, cart:remove, cart:clear
 *   FACTS     ("this has happened")  — cart:updated, auth:changed, remote:error
 *
 * Remotes send commands and react to facts. Only the shell turns a command into
 * a fact, which is what keeps a single writer for shared state.
 */

/** One cart line as broadcast to remotes. null fields are still resolving. */
export interface CartLineSnapshot {
  productId: string;
  title: string | null;
  unitPriceCents: number | null;
  qty: number;
}

export type ShopEvents = {
  // ---- Commands ----------------------------------------------------------
  /** Catalog (or anywhere else) asks the shell to put a product in the cart. */
  'cart:add': { productId: string; qty: number };
  /** Cart UI asks for a quantity change. qty <= 0 removes the line. */
  'cart:setQty': { productId: string; qty: number };
  'cart:remove': { productId: string };
  'cart:clear': { reason: 'user' | 'checkout' };

  // ---- Facts -------------------------------------------------------------
  /**
   * The shell's authoritative cart state after it has reduced a command.
   * REPLAYED: a remote that mounts late still receives the current value on
   * subscribe, rather than rendering an empty cart until the next change.
   */
  'cart:updated': {
    count: number;
    subtotal: number;
    lines: CartLineSnapshot[];
  };
  /** Session changed. Remotes re-fetch or clear user-scoped data. REPLAYED. */
  'auth:changed': { userId: string | null };
  /** A remote failed to load or crashed; the shell surfaces this centrally. */
  'remote:error': { remote: string; message: string };
};

export type ShopEventName = keyof ShopEvents;

export type EventHandler<K extends ShopEventName> = (payload: ShopEvents[K]) => void;

/** Calling this removes the handler. Safe to call more than once. */
export type Unsubscribe = () => void;

export interface EventBus {
  /** Publish an event. Never throws, even if a subscriber does. */
  emit<K extends ShopEventName>(name: K, payload: ShopEvents[K]): void;
  /** Subscribe. Returns the unsubscribe function — always call it on cleanup. */
  on<K extends ShopEventName>(name: K, handler: EventHandler<K>): Unsubscribe;
}
