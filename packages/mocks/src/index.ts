/**
 * NOTE: `handlers` is deliberately NOT re-exported here.
 *
 * Re-exporting it statically while startMocks() also imports it dynamically made
 * Rollup give up on splitting: msw (~340 kB raw) landed in the shell's main
 * chunk and was downloaded before first paint, even though it is only needed
 * once the worker starts. Import it from '@shop/mocks/handlers' if you genuinely
 * need the list at module scope.
 */
export { orders, products, profile } from './data';
export type {
  Order,
  OrderLine,
  OrderStatus,
  Product,
  ProductCategory,
  Profile,
} from './types';

/**
 * Start the MSW service worker.
 *
 * WHY THIS PACKAGE EXISTS (a deliberate addition to the four-app brief):
 * A service worker is origin-scoped. In federated mode every remote's code runs
 * on the SHELL's origin, so the shell starts one worker and its handlers cover
 * every remote's fetches. But in standalone mode (`pnpm dev:catalog`) the remote
 * is its own origin and must start the same handlers itself.
 *
 * Both need the identical handler list. Putting it in a shared package is the
 * only way to get that without the shell statically importing catalog's source —
 * which would reintroduce exactly the build-time coupling micro-frontends exist
 * to remove.
 */
export async function startMocks(): Promise<void> {
  const { setupWorker } = await import('msw/browser');
  const { handlers } = await import('./handlers');

  const worker = setupWorker(...handlers);

  await worker.start({
    // Anything we have not mocked (the remoteEntry.js files, assets, HMR) must
    // pass straight through. Warning on those would be pure noise.
    onUnhandledRequest: 'bypass',
    quiet: true,
  });
}
