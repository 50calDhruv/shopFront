import { createContext, useContext, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { EventBus, EventHandler, ShopEventName } from './types';

/**
 * ⚠️  THIS MODULE IS WHY `@shop/ui` MUST BE A MODULE FEDERATION SINGLETON.
 *
 * React Context identity is per *module instance*, not per name. `createContext`
 * returns a brand-new object every time this file is evaluated. If the shell and
 * a remote each bundle their own copy of @shop/ui, there are two distinct context
 * objects in the page. The shell's <EventBusProvider> writes into its copy; the
 * remote's useEventBus() reads from its own — and finds nothing.
 *
 * That failure is silent by default (useContext just returns the default value),
 * which makes it brutal to debug. So the default here is `null` and the hook
 * throws loudly, naming the real cause. See the `shared` block in each app's
 * vite.config.ts.
 */
const EventBusContext = createContext<EventBus | null>(null);

export interface EventBusProviderProps {
  bus: EventBus;
  children: ReactNode;
}

/** Rendered once, by the shell. Remotes consume it, never create their own. */
export function EventBusProvider({ bus, children }: EventBusProviderProps) {
  return <EventBusContext.Provider value={bus}>{children}</EventBusContext.Provider>;
}

export function useEventBus(): EventBus {
  const bus = useContext(EventBusContext);

  if (bus === null) {
    throw new Error(
      'useEventBus() found no EventBusProvider.\n\n' +
        'Two possible causes:\n' +
        '  1. This tree genuinely is not inside the shell\'s <EventBusProvider>.\n' +
        '  2. More likely: @shop/ui was duplicated across the federation boundary,\n' +
        '     so this component is reading a different React Context object than\n' +
        '     the one the shell wrote to. Check that "@shop/ui" is listed with\n' +
        '     singleton: true in the `shared` block of EVERY app\'s vite.config.ts.',
    );
  }

  return bus;
}

/**
 * Subscribe for the lifetime of the component.
 *
 * The handler is held in a ref so that an inline arrow function (the normal way
 * to call this) does not resubscribe on every render, while still always seeing
 * fresh props and state. Only `name` re-subscribes.
 */
export function useEventBusSubscription<K extends ShopEventName>(
  name: K,
  handler: EventHandler<K>,
): void {
  const bus = useEventBus();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    return bus.on(name, (payload) => {
      handlerRef.current(payload);
    });
  }, [bus, name]);
}
