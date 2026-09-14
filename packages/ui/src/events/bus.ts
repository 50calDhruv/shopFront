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
}

export function createEventBus(options: CreateEventBusOptions = {}): EventBus {
  const { debug = false } = options;
  const channels = new Map<ShopEventName, Set<ErasedHandler>>();

  return {
    on<K extends ShopEventName>(name: K, handler: EventHandler<K>): Unsubscribe {
      let handlers = channels.get(name);
      if (!handlers) {
        handlers = new Set<ErasedHandler>();
        channels.set(name, handlers);
      }

      const erased = handler as ErasedHandler;
      handlers.add(erased);

      let active = true;
      return () => {
        // Guard so a double-unsubscribe can't delete a handler that a later
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

      const handlers = channels.get(name);
      if (!handlers || handlers.size === 0) return;

      // Copy before iterating: a handler is allowed to unsubscribe itself, or
      // subscribe something new, without corrupting this dispatch.
      for (const handler of [...handlers]) {
        try {
          handler(payload);
        } catch (error) {
          // One misbehaving remote must not stop delivery to the others.
          // This is failure isolation at the message layer, mirroring the
          // error boundaries that isolate remotes at the render layer.
          console.error(`[bus] subscriber for "${name}" threw:`, error);
        }
      }
    },
  };
}
