/**
 * Hand-written type declarations for federated remote modules.
 *
 * The plugin can generate these (`dts: true`), but that makes every build fetch
 * type bundles from live remotes over the network — which turns `pnpm build`
 * into a network dependency and hangs CI whenever a remote is down. For four
 * remotes each exposing one component, writing them by hand is both faster and
 * more honest about the contract.
 *
 * NOTE: nothing verifies these match what the remote actually exposes. That gap
 * is real — it is the federation equivalent of an untyped API boundary. A
 * production setup would either generate them in a pipeline step that runs after
 * the remotes build, or publish the contract as a versioned package.
 */
declare module 'catalog/App' {
  import type { ComponentType } from 'react';
  const App: ComponentType;
  export default App;
}

declare module 'cart/App' {
  import type { ComponentType } from 'react';
  const App: ComponentType;
  export default App;
}

declare module 'account/App' {
  import type { ComponentType } from 'react';
  const App: ComponentType;
  export default App;
}
