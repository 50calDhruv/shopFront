import { createEventBus } from '@shop/ui/events';

/**
 * The single bus instance for the whole page, created by the shell.
 *
 * Module-level so it is created exactly once and its identity is stable across
 * re-renders. Remotes receive it through <EventBusProvider>; they never import
 * this file — it lives in the shell, and a remote importing from the shell would
 * invert the dependency the architecture depends on.
 */
export const bus = createEventBus({
  debug: import.meta.env.DEV,

  // Facts that a late-mounting remote must know immediately on subscribe.
  // Commands are deliberately NOT replayed — replaying "cart:add" would re-add
  // the product every time a remote mounted.
  replay: ['cart:updated', 'auth:changed'],
});
