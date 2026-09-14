/**
 * The ONE shared-dependency block, imported by all four apps.
 *
 * Plain .mjs rather than .ts on purpose: Vite bundles vite.config.ts with
 * esbuild and may leave a bare workspace import external. A .ts file would then
 * reach Node and explode. .mjs works whether it is inlined or externalized.
 */

/** Versions are pinned here so host and remotes can never drift apart. */
export const SINGLETON_VERSIONS = {
  react: '^18.3.1',
  'react-dom': '^18.3.1',
  'react-router-dom': '^6.30.6',
  '@shop/ui': '^0.1.0',
};

/**
 * WHAT BREAKS WITHOUT THIS BLOCK — the whole point of requirement #2.
 *
 * Each app is built separately, so by default each bundles its own copy of
 * every dependency. `singleton: true` tells Module Federation's runtime to
 * negotiate ONE copy at load time and hand it to everybody. Remove it and:
 *
 * react / react-dom
 *   Two copies means two independent dispatchers. Every hook the remote calls
 *   throws "Invalid hook call. Hooks can only be called inside the body of a
 *   function component" — even though the code is obviously correct. Two
 *   reconcilers also cannot share one tree, so state and effects desynchronise.
 *
 * react/jsx-runtime
 *   Ships with its own reference to React internals. Left unshared it drags in
 *   a second React behind your back and reintroduces the bug above, which is
 *   maddening to debug because `react` itself looks correctly shared.
 *
 * react-router-dom
 *   The remote gets a second RouterContext and a second history. useNavigate /
 *   useParams throw "useNavigate() may be used only in the context of a
 *   <Router> component" despite the shell plainly rendering one, because the
 *   remote is reading a different context object. Back/forward also break:
 *   two histories competing over one address bar.
 *
 * @shop/ui
 *   The subtle one. React Context identity is per MODULE INSTANCE, not per
 *   name — createContext() returns a brand-new object each time the module is
 *   evaluated. Duplicate @shop/ui and the shell's <EventBusProvider> writes
 *   into one context while the remote's useEventBus() reads another. There is
 *   no error: useContext just returns the default, so "Add to cart" silently
 *   does nothing. That is why the event bus lives in a SHARED SINGLETON
 *   package, not merely a shared type.
 *
 * `requiredVersion` is what makes the negotiation safe: a remote built against
 * React 19 will refuse to accept the shell's React 18 rather than load and
 * break in a subtler way later.
 */
export function sharedDeps() {
  // Phase 5's bundle measurement builds everything twice — once normally, once
  // with MF_NO_SHARED=1 — to show what the singleton block is actually worth.
  if (process.env.MF_NO_SHARED === '1') {
    return {};
  }

  return {
    react: {
      singleton: true,
      requiredVersion: SINGLETON_VERSIONS.react,
    },
    'react-dom': {
      singleton: true,
      requiredVersion: SINGLETON_VERSIONS['react-dom'],
    },
    'react/jsx-runtime': {
      singleton: true,
      requiredVersion: SINGLETON_VERSIONS.react,
    },
    'react-router-dom': {
      singleton: true,
      requiredVersion: SINGLETON_VERSIONS['react-router-dom'],
    },
    '@shop/ui': {
      singleton: true,
      requiredVersion: SINGLETON_VERSIONS['@shop/ui'],
    },

    /**
     * ⚠️ SUBPATHS ARE SEPARATE SHARE KEYS. This line is not redundant.
     *
     * Module Federation keys shared modules by the exact import SPECIFIER, not
     * by the npm package. Sharing '@shop/ui' covers `import ... from '@shop/ui'`
     * and nothing else — '@shop/ui/events' is a different specifier and, without
     * its own entry here, gets bundled separately into every app.
     *
     * That is precisely the duplicated-Context bug described above, and it is
     * nastier than it sounds: the singleton block LOOKS correct, React is
     * genuinely shared, the build succeeds, and the app still breaks at runtime
     * with "useEventBus() found no EventBusProvider" — because the shell and the
     * remote each hold their own copy of the context object from this subpath.
     *
     * Rule of thumb: every subpath you import across the boundary needs its own
     * entry. Sharing the package root is not enough.
     */
    '@shop/ui/events': {
      singleton: true,
      requiredVersion: SINGLETON_VERSIONS['@shop/ui'],
    },
  };
}

/** Remote dev/preview ports. One place so nothing drifts. */
export const REMOTE_PORTS = {
  shell: 5000,
  catalog: 5001,
  cart: 5002,
  account: 5003,
};
