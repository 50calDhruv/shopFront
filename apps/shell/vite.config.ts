import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { federation } from '@module-federation/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { REMOTE_PORTS, sharedDeps } from '@shop/build-config';

/**
 * SHELL — the Module Federation *host*.
 *
 * Unlike the remotes, the host DOES work under `vite dev`: it only needs to
 * fetch each remote's already-built remoteEntry.js over HTTP. So local dev is
 * "shell in dev mode, remotes in build --watch + preview".
 */

/**
 * STATIC vs DYNAMIC REMOTES (requirement #1)
 *
 * catalog and cart are declared HERE, at build time. Their URLs are baked into
 * the shell's bundle, which means:
 *   + the import looks like a normal `import('catalog/App')`
 *   + TypeScript and the bundler both understand it
 *   - changing where a remote lives requires REBUILDING AND REDEPLOYING THE HOST
 *
 * `account` is deliberately NOT here. It is registered at runtime from
 * /remotes.json — see src/lib/dynamicRemotes.ts for the other half and the
 * trade-off written out in full.
 */
const remoteUrl = (name: keyof typeof REMOTE_PORTS, envValue: string | undefined) =>
  envValue ?? `http://localhost:${REMOTE_PORTS[name]}`;

/**
 * Bundle analysis, opt-in via ANALYZE=1 so ordinary builds stay fast.
 * `pnpm analyze` sets it and writes dist/stats.html per app.
 */
const analyzePlugins = process.env['ANALYZE'] === '1'
  ? [
      visualizer({
        filename: 'dist/stats.html',
        // gzip is the number that matters over the wire.
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
    ]
  : [];

export default defineConfig(({ mode }) => {
  // Vercel sets these per-environment, so the same source deploys to preview and
  // production pointing at different remotes. Falls back to localhost for dev.
  const catalogUrl = remoteUrl('catalog', process.env['VITE_CATALOG_URL']);
  const cartUrl = remoteUrl('cart', process.env['VITE_CART_URL']);

  return {
    plugins: [
      react(),
      tailwindcss(),
      federation({
        name: 'shell',
        remotes: {
          catalog: {
            type: 'module',
            name: 'catalog',
            entry: `${catalogUrl}/remoteEntry.js`,
          },
          cart: {
            type: 'module',
            name: 'cart',
            entry: `${cartUrl}/remoteEntry.js`,
          },
        },
        shared: sharedDeps(),
        dts: false,
      }),
        ...analyzePlugins,
    ],

    server: { port: REMOTE_PORTS.shell, strictPort: true },
    preview: { port: REMOTE_PORTS.shell, strictPort: true },

    build: {
      target: 'chrome89',
      sourcemap: mode !== 'production',
    },
  };
});
