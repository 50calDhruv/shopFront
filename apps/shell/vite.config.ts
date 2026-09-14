import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Phase 1: no Module Federation yet — the shell renders placeholders where the
// remotes will mount. Federation lands in Phase 2 so that the routing, layout and
// provider wiring can be reviewed independently of the federation plumbing.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5000, strictPort: true },
  preview: { port: 5000, strictPort: true },
  build: {
    // Module Federation's runtime uses top-level await, which needs a modern
    // target. Setting it now keeps the build output identical across phases.
    target: 'chrome89',
    sourcemap: true,
  },
});
