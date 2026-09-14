/**
 * The cross-remote event contract.
 *
 * This map is the ONLY coupling permitted between the shell and its remotes, and
 * between remotes. A remote never imports another remote; it emits an event the
 * shell understands, and the shell decides what happens next.
 *
 * Adding a channel here is a deliberate, reviewable act: it widens the public
 * contract every app depends on. Treat it like an API schema, not a scratchpad.
 */
export type ShopEvents = {
  /** Catalog (or anywhere else) asks the shell to put a product in the cart. */
  'cart:add': { productId: string; qty: number };
  /** The shell broadcasts authoritative cart totals after it has reduced them. */
  'cart:updated': { count: number; subtotal: number };
  /** Session changed. Remotes re-fetch or clear user-scoped data. */
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
