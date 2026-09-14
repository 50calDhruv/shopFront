import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { federation } from '@module-federation/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { REMOTE_PORTS, sharedDeps } from '@shop/build-config';

/**
 * CATALOG — a Module Federation *remote*.
 *
 * ⚠️ A REMOTE CANNOT RUN UNDER `vite dev` IN FEDERATED MODE.
 * Vite's dev server is bundleless (it serves raw ESM), and the federation plugin
 * only runs during `vite build`. So there is no remoteEntry.js to fetch while
 * `vite dev` is running. Only the HOST gets a dev server.
 *
 * That is why this app has two modes:
 *   pnpm --filter @shop/catalog watch    -> vite build --watch, real remoteEntry.js
 *                                           for the shell to consume (no HMR)
 *   pnpm --filter @shop/catalog dev      -> plain vite dev of src/standalone.tsx,
 *                                           full HMR, federation not involved
 *
 * The standalone mode is not a workaround — it is the micro-frontend point:
 * a team owning this remote develops it without running the shell at all.
 */
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

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: 'catalog',
      filename: 'remoteEntry.js',

      // The remote's public contract. Everything else in this app is private
      // and can be refactored freely without coordinating with the shell.
      exposes: {
        './App': './src/App.tsx',
      },

      shared: sharedDeps(),

      // Attach this build's CSS to every exposed module.
      //
      // Without it, styles work in dev and silently vanish in production: the
      // host fetches remoteEntry.js but has no idea a sibling .css file exists,
      // so nothing loads it. This is the single most common "works locally,
      // broken on deploy" bug in federated Vite apps.
      bundleAllCSS: true,

      // The DTS plugin tries to fetch type bundles from live remotes at build
      // time. That turns a build into a network dependency and hangs CI when a
      // remote is down. We hand-write the remote module declarations instead —
      // see apps/shell/src/types/remotes.d.ts.
      dts: false,
    }),
      ...analyzePlugins,
  ],

  server: {
    port: REMOTE_PORTS.catalog,
    strictPort: true,
  },

  preview: {
    port: REMOTE_PORTS.catalog,
    strictPort: true,
    // The shell runs on :5000 and fetches remoteEntry.js from here. Different
    // port = different origin, so without CORS the host cannot load the remote.
    cors: true,
  },

  build: {
    // Module Federation's runtime uses top-level await. Anything older than
    // chrome89 cannot parse it and the build fails outright.
    target: 'chrome89',
    // One CSS file, which bundleAllCSS can then attach to the exposed module.
    cssCodeSplit: false,
  },
});
