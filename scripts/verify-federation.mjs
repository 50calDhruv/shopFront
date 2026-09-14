/**
 * End-to-end verification that the micro-frontend architecture actually works.
 *
 * Not a test suite — a single scripted walkthrough of the six requirements,
 * driven through a real browser because most of what matters here (one React
 * instance, a cross-remote event reaching the shell's badge, a boundary
 * containing a failure) simply cannot be observed from a build artifact.
 *
 *   pnpm build && pnpm verify:federation
 */
import { chromium } from 'playwright';
import {
  PORTS,
  assertPortsFree,
  startProcess,
  stopProcess,
  waitForUrl,
} from './lib/servers.mjs';

const checks = [];
function check(name, passed, detail = '') {
  checks.push({ name, passed, detail });
  console.log(`  ${passed ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const servers = [];

async function main() {
  await assertPortsFree(PORTS);

  console.log('\nStarting all four apps in preview mode...');
  for (const app of ['shell', 'catalog', 'cart', 'account']) {
    servers.push(startProcess(app, ['-F', `@shop/${app}`, 'preview']));
  }

  await Promise.all([
    waitForUrl(`http://localhost:${PORTS.shell}/`),
    waitForUrl(`http://localhost:${PORTS.catalog}/remoteEntry.js`),
    waitForUrl(`http://localhost:${PORTS.cart}/remoteEntry.js`),
    waitForUrl(`http://localhost:${PORTS.account}/remoteEntry.js`),
  ]);
  console.log('All servers up.\n');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  const base = `http://localhost:${PORTS.shell}`;

  // ---- Shell renders on its own -----------------------------------------
  console.log('Shell:');
  await page.goto(base, { waitUntil: 'networkidle' });
  check('shell renders', await page.locator('h1').first().isVisible());
  check(
    'nav has all three remote links',
    (await page.locator('nav[aria-label="Primary"] a').count()) === 3,
  );

  // ---- Requirement 1 + 2: remote loads, one React ------------------------
  console.log('\nCatalog remote (statically configured):');
  await page.goto(`${base}/catalog`, { waitUntil: 'networkidle' });
  const productCount = await page.locator('ul li h3 a').count();
  check('catalog remote mounted and rendered products', productCount > 0, `${productCount} products`);

  /**
   * Proving the singleton worked.
   *
   * The React DevTools global hook is NOT installed in a production build
   * without the extension, so counting renderers there reports 0 and proves
   * nothing. The network is better evidence: every remote SHIPS a fallback copy
   * of React (so it can run standalone), and if sharing failed the browser would
   * have to download one. Zero React bytes served from a remote port means the
   * remotes are genuinely running on the host's React.
   */
  const reactFromRemotes = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((r) => r.name)
      .filter((n) => /:(5001|5002|5003)\//.test(n) && /prebuild__react/.test(n)),
  );
  check(
    'no remote downloaded its own React (shared singleton working)',
    reactFromRemotes.length === 0,
    reactFromRemotes.length ? `${reactFromRemotes.length} React chunks from remotes` : 'host React reused',
  );

  // ---- Requirement 4: remote owns its nested routes ----------------------
  const firstProduct = page.locator('ul li h3 a').first();
  const productName = await firstProduct.textContent();
  await firstProduct.click();
  await page.waitForURL(/\/catalog\/.+/);
  // The detail page fetches before it can render a heading, so wait rather than
  // asserting on the frame that happens to be current.
  const detailHeading = page.getByRole('heading', { level: 1, name: productName.trim() });
  await detailHeading.waitFor({ state: 'visible', timeout: 10_000 });
  check(
    'remote owns its own sub-route (/catalog/:slug)',
    true,
    new URL(page.url()).pathname,
  );

  // ---- Requirement 3: THE canonical cross-remote flow --------------------
  console.log('\nCross-remote event (catalog -> shell badge):');
  const badge = page.locator('nav[aria-label="Primary"] a[href="/cart"] span').first();
  const before = (await badge.textContent()).trim();

  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.waitForFunction(
    (prev) => {
      const el = document.querySelector('nav[aria-label="Primary"] a[href="/cart"] span');
      return el && el.textContent.trim() !== prev;
    },
    before,
    { timeout: 5000 },
  );
  const after = (await badge.textContent()).trim();
  check(
    'Add to cart in catalog updates the shell-rendered badge',
    Number(after) === Number(before) + 1,
    `${before} -> ${after}`,
  );

  /**
   * The badge must be right without the cart remote's UI ever rendering.
   *
   * Note the precise claim. A STATICALLY declared remote does get its
   * remoteEntry.js fetched eagerly, because the host initialises every declared
   * container up front to negotiate the shared scope. What stays lazy is the
   * exposed module itself — the App chunk. So we assert on that, and separately
   * record the eager-container cost, which is a real argument for dynamic
   * remotes and is written up in the README.
   */
  const cartResources = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((r) => r.name)
      .filter((n) => n.includes(':5002/')),
  );
  const cartAppChunkLoaded = cartResources.some((n) => /\/assets\/App-/.test(n));
  check(
    "badge correct without the cart remote's UI ever loading",
    !cartAppChunkLoaded,
    `${cartResources.length} container files fetched, App chunk: ${cartAppChunkLoaded ? 'LOADED' : 'not loaded'}`,
  );

  const accountResources = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((r) => r.name).filter((n) => n.includes(':5003/')),
  );
  check(
    'dynamic remote costs nothing until used (vs eager static containers)',
    accountResources.length === 0,
    `static cart fetched ${cartResources.length} files, dynamic account fetched ${accountResources.length}`,
  );

  // ---- Cart remote reads shell state via replayed event ------------------
  console.log('\nCart remote (replayed state):');
  await page.goto(`${base}/cart`, { waitUntil: 'networkidle' });
  check(
    'cart remote shows the line added from catalog',
    await page.getByText(productName.trim()).first().isVisible(),
  );

  await page.getByRole('button', { name: /Increase quantity/ }).first().click();
  await page.waitForFunction(() => {
    const el = document.querySelector('nav[aria-label="Primary"] a[href="/cart"] span');
    return el && el.textContent.trim() === '2';
  }, null, { timeout: 5000 });
  check('quantity command round-trips through the shell', true, 'badge now 2');

  // ---- Requirement 1: the DYNAMIC remote ---------------------------------
  console.log('\nAccount remote (registered at runtime):');
  const manifestFetched = [];
  page.on('response', (r) => {
    if (r.url().includes('remotes.json')) manifestFetched.push(r.status());
  });
  await page.goto(`${base}/account`, { waitUntil: 'networkidle' });
  check(
    'shell fetched /remotes.json at runtime',
    manifestFetched.length > 0,
    `status ${manifestFetched.join(',')}`,
  );
  check(
    'dynamically-registered remote rendered',
    await page.getByRole('heading', { name: 'Account' }).isVisible(),
  );

  await page.goto(`${base}/account/orders`, { waitUntil: 'networkidle' });
  const orderRows = await page.locator('ul li h2 a').count();
  check('account owns its nested /orders route', orderRows > 0, `${orderRows} orders`);

  // ---- Requirement 5: failure isolation ----------------------------------
  console.log('\nFailure isolation:');
  await page.goto(`${base}/catalog?down=catalog`, { waitUntil: 'networkidle' });
  check(
    'downed remote shows its error boundary',
    await page.getByText('This section could not load').isVisible(),
  );
  check(
    'shell nav still usable while a remote is down',
    await page.locator('nav[aria-label="Primary"]').isVisible(),
  );
  check(
    'cart badge still correct while catalog is down',
    (await badge.textContent()).trim() === '2',
  );

  await page.goto(`${base}/cart?down=catalog`, { waitUntil: 'networkidle' });
  check(
    'OTHER remotes still work while catalog is down',
    await page.getByRole('heading', { name: 'Your cart' }).isVisible(),
  );

  // Recovery via the boundary's retry button.
  await page.goto(`${base}/catalog?down=`, { waitUntil: 'networkidle' });
  check(
    'clearing the outage restores the remote',
    (await page.locator('ul li h3 a').count()) > 0,
  );

  // ---- No console errors anywhere ----------------------------------------
  const realErrors = consoleErrors.filter(
    (e) =>
      !e.includes('Failed to load resource') &&
      !e.includes('[MSW]') &&
      // Thrown deliberately by the outage simulator and caught by the error
      // boundary. React always logs a caught boundary error to the console.
      !e.includes('Simulated outage'),
  );
  check('no uncaught console errors across the walkthrough', realErrors.length === 0,
    realErrors.length ? realErrors[0].slice(0, 120) : '');

  await page.screenshot({ path: 'scripts/.artifacts/catalog.png', fullPage: false });
  await browser.close();

  const failed = checks.filter((c) => !c.passed);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
  if (failed.length) {
    console.log('\nFAILED:');
    for (const f of failed) console.log(`  ✗ ${f.name} ${f.detail}`);
    process.exitCode = 1;
  }
}

try {
  const { mkdirSync } = await import('node:fs');
  mkdirSync('scripts/.artifacts', { recursive: true });
  await main();
} catch (error) {
  console.error('\nVerification crashed:', error.message);
  for (const s of servers) {
    const tail = s.logs.join('').split('\n').slice(-8).join('\n');
    if (tail.trim()) console.error(`\n--- ${s.name} log tail ---\n${tail}`);
  }
  process.exitCode = 1;
} finally {
  for (const s of servers) stopProcess(s);
}
