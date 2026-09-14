import type {
  EventBus,
  EventHandler,
  ShopEventName,
  ShopEvents,
  Unsubscribe,
} from './types';

/**
 * Internal storage type. The public `on`/`emit` signatures are fully generic and
 * type-safe; internally every handler is stored in one map, so the payload type
 * is erased at the storage boundary and re-applied on the way in and out.
 *
 * This is the one place a cast is justified: the generic signatures above already
 * guarantee a handler registered under key K only ever receives ShopEvents[K].
 */
type ErasedHandler = (payload: unknown) => void;

export interface CreateEventBusOptions {
  /** Log every emit to the console. Useful when demoing cross-remote flow. */
  debug?: boolean;
  /**
   * Channels whose most recent payload is delivered immediately to any new
   * subscriber ("sticky" / BehaviorSubject semantics).
   *
   * WHY THIS EXISTS — a genuine micro-frontend problem, not a nicety:
   * remotes mount at unpredictable times. The shell broadcasts `cart:updated`
   * when the cart changes, but the cart remote is lazy-loaded and may not
   * subscribe until minutes later, long after that broadcast. Without replay it
   * would render an empty cart until the user happened to change something.
   *
   * The alternative — a request/response round trip on mount — needs two more
   * channels and a correlation id to do properly. Replay expresses the same
   * intent as one flag.
   */
  replay?: readonly ShopEventName[];
}

export function createEventBus(options: CreateEventBusOptions = {}): EventBus {
  const { debug = false, replay = [] } = options;

  const channels = new Map<ShopEventName, Set<ErasedHandler>>();
  const replayable = new Set<ShopEventName>(replay);
  const lastPayload = new Map<ShopEventName, unknown>();

  function deliver(name: ShopEventName, handler: ErasedHandler, payload: unknown): void {
    try {
      handler(payload);
    } catch (error) {
      // One misbehaving remote must not stop delivery to the others. This is
      // failure isolation at the message layer, mirroring the error boundaries
      // that isolate remotes at the render layer.
      console.error(`[bus] subscriber for "${name}" threw:`, error);
    }
  }

  return {
    on<K extends ShopEventName>(name: K, handler: EventHandler<K>): Unsubscribe {
      let handlers = channels.get(name);
      if (!handlers) {
        handlers = new Set<ErasedHandler>();
        channels.set(name, handlers);
      }

      const erased = handler as ErasedHandler;
      handlers.add(erased);

      // Catch the late subscriber up. Synchronous on purpose: callers subscribe
      // from useEffect, so this lands before paint and avoids a flash of empty
      // state. Wrapped in the same try/catch as a normal delivery.
      if (replayable.has(name) && lastPayload.has(name)) {
        deliver(name, erased, lastPayload.get(name));
      }

      let active = true;
      return () => {
        // Guard so a double-unsubscribe cannot delete a handler that a later
        // subscription happens to reuse (React StrictMode double-invokes effects).
        if (!active) return;
        active = false;

        const current = channels.get(name);
        if (!current) return;
        current.delete(erased);
        if (current.size === 0) channels.delete(name);
      };
    },

    emit<K extends ShopEventName>(name: K, payload: ShopEvents[K]): void {
      if (debug) {
        console.debug('[bus] %s', name, payload);
      }

      if (replayable.has(name)) {
        lastPayload.set(name, payload);
      }

      const handlers = channels.get(name);
      if (!handlers || handlers.size === 0) return;

      // Copy before iterating: a handler is allowed to unsubscribe itself, or
      // subscribe something new, without corrupting this dispatch.
      for (const handler of [...handlers]) {
        deliver(name, handler, payload);
      }
    },
  };
}
