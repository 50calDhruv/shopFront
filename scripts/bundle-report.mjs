/**
 * Measures what the shared-singleton block is actually worth.
 *
 * WHY NOT JUST `du -sh dist`
 * --------------------------
 * Disk size is misleading here. Every remote ALWAYS ships a fallback copy of
 * React so it can run standalone, whether or not sharing is configured. Those
 * bytes sit in dist in both modes, so comparing directory sizes understates the
 * win badly.
 *
 * What actually matters is what a browser DOWNLOADS for a real session. So this
 * script drives a real browser through every route, records the exact set of
 * files each mode fetched, and gzips those files from disk to get true
 * over-the-wire bytes (vite preview does not compress, so transferSize would
 * report uncompressed numbers).
 *
 *   pnpm analyze
 */
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { PORTS, assertPortsFree, startProcess, stopProcess, waitForUrl } from './lib/servers.mjs';

const ROOT = process.cwd();
const APPS = ['shell', 'catalog', 'cart', 'account'];
const PORT_TO_APP = Object.fromEntries(APPS.map((a) => [PORTS[a], a]));

const ROUTES = ['/', '/catalog', '/catalog/aria-over-ear-headphones', '/cart', '/account', '/account/orders'];

function buildAll({ shared }) {
  console.log(`\n▸ Building all four apps ${shared ? 'WITH' : 'WITHOUT'} the shared block...`);
  execFileSync('pnpm', ['build'], {
    cwd: ROOT,
    stdio: 'pipe',
    env: { ...process.env, ...(shared ? {} : { MF_NO_SHARED: '1' }) },
  });
}

/** Map a fetched URL back to the file on disk that served it. */
function urlToFile(url) {
  const { port, pathname } = new URL(url);
  const app = PORT_TO_APP[Number(port)];
  if (!app) return null;
  const file = join(ROOT, 'apps', app, 'dist', decodeURIComponent(pathname));
  return existsSync(file) ? { app, file, pathname } : null;
}

async function measure(label) {
  await assertPortsFree(PORTS);

  const servers = APPS.map((app) => startProcess(app, ['-F', `@shop/${app}`, 'preview'], { cwd: ROOT }));

  try {
    await Promise.all(APPS.map((a) => waitForUrl(`http://localhost:${PORTS[a]}/`)));

    const browser = await chromium.launch();
    // A fresh context per mode: a warm HTTP cache would hide re-downloads.
    const page = await browser.newPage();

    const seen = new Set();
    page.on('response', (r) => {
      const url = r.url();
      if (/\.(js|css)(\?|$)/.test(url)) seen.add(url.split('?')[0]);
    });

    for (const route of ROUTES) {
      await page.goto(`http://localhost:${PORTS.shell}${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
    }

    await browser.close();

    const perApp = Object.fromEntries(APPS.map((a) => [a, { files: 0, raw: 0, gzip: 0 }]));
    let unresolved = 0;

    for (const url of seen) {
      const hit = urlToFile(url);
      if (!hit) { unresolved += 1; continue; }
      const bytes = readFileSync(hit.file);
      perApp[hit.app].files += 1;
      perApp[hit.app].raw += bytes.byteLength;
      perApp[hit.app].gzip += gzipSync(bytes, { level: 9 }).byteLength;
    }

    const total = APPS.reduce(
      (acc, a) => ({
        files: acc.files + perApp[a].files,
        raw: acc.raw + perApp[a].raw,
        gzip: acc.gzip + perApp[a].gzip,
      }),
      { files: 0, raw: 0, gzip: 0 },
    );

    console.log(`  ${label}: ${total.files} files, ${kb(total.gzip)} gzip`);
    if (unresolved) console.log(`  (${unresolved} responses not mapped to dist files)`);

    return { perApp, total };
  } finally {
    for (const s of servers) stopProcess(s);
  }
}

const kb = (b) => `${(b / 1024).toFixed(1)} kB`;

function table(withShared, withoutShared) {
  const rows = [];
  for (const app of APPS) {
    const w = withShared.perApp[app];
    const o = withoutShared.perApp[app];
    rows.push([app, kb(w.gzip), kb(o.gzip), delta(w.gzip, o.gzip)]);
  }
  rows.push([
    'TOTAL',
    kb(withShared.total.gzip),
    kb(withoutShared.total.gzip),
    delta(withShared.total.gzip, withoutShared.total.gzip),
  ]);

  const head = ['app', 'shared (gzip)', 'no shared (gzip)', 'saved'];
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells) => '| ' + cells.map((c, i) => c.padEnd(widths[i])).join(' | ') + ' |';

  console.log('\n' + line(head));
  console.log('|' + widths.map((w) => '-'.repeat(w + 2)).join('|') + '|');
  for (const r of rows) console.log(line(r));
}

function delta(shared, noShared) {
  const saved = noShared - shared;
  const pct = noShared === 0 ? 0 : (saved / noShared) * 100;
  return `${saved >= 0 ? '' : '+'}${kb(Math.abs(saved))} (${pct.toFixed(1)}%)`;
}

console.log('Measuring real downloaded bytes across:', ROUTES.join(', '));

buildAll({ shared: true });
const withShared = await measure('with shared singletons   ');

buildAll({ shared: false });
const withoutShared = await measure('with `shared` removed    ');

// Leave the tree in the normal, correct state.
buildAll({ shared: true });

table(withShared, withoutShared);

console.log(
  '\nMeasured: unique .js/.css responses across all four origins for the routes above,\n' +
    'gzipped at level 9 from the files on disk. Fresh browser context per mode.',
);
