/**
 * Copy MSW's service worker into every app's public/ directory.
 *
 * A service worker must be served from the origin it controls, so it cannot be
 * imported from node_modules — it has to be a real static file in each app. The
 * shell needs it for federated mode; each remote needs its own copy for
 * standalone mode (`pnpm dev:catalog`), where the remote IS the origin.
 *
 * Runs on postinstall so a fresh clone works with nothing but `pnpm install`.
 * Replaces per-app `msw init`, which cannot resolve the CLI when msw is a
 * transitive dependency via @shop/mocks.
 */
import { createRequire } from 'node:module';
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const appsDir = join(repoRoot, 'apps');

// Resolve msw from the package that actually declares it.
const require = createRequire(join(repoRoot, 'packages/mocks/package.json'));

/**
 * msw's export map resolves to lib/core/index.js, but the worker ships at the
 * package root (lib/mockServiceWorker.js). Walk up from the resolved entry until
 * we find it, rather than hard-coding a path that moves between msw versions.
 */
async function findWorkerSource() {
  let dir = dirname(require.resolve('msw'));

  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = join(dir, 'mockServiceWorker.js');
    const found = await stat(candidate).then(() => true).catch(() => false);
    if (found) return candidate;

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error('Could not locate mockServiceWorker.js inside the msw package');
}

const workerSource = await findWorkerSource();

let apps = [];
try {
  apps = await readdir(appsDir);
} catch {
  // No apps/ yet (very early scaffold). Nothing to do.
  process.exit(0);
}

for (const app of apps) {
  const publicDir = join(appsDir, app, 'public');
  const target = join(publicDir, 'mockServiceWorker.js');

  await mkdir(publicDir, { recursive: true });
  await copyFile(workerSource, target);
  console.log(`  msw worker -> apps/${app}/public/mockServiceWorker.js`);
}
