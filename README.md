# Shop-Front

A storefront assembled at runtime from **four independently deployed React apps**, wired
together with Module Federation.

It exists to demonstrate the micro-frontend patterns properly rather than to be a
feature-rich shop: shared singletons, cross-remote messaging, routing delegation, failure
isolation, and independent deployability. Where something is a demo shortcut, it says so —
both here and in the code.

```
React 18 · TypeScript · Vite 7 · @module-federation/vite · React Router 6
Tailwind v4 · MSW · pnpm workspaces
```

---

## Why micro-frontends at all

The honest answer is: **usually you shouldn't.** A single React app is simpler, faster, and
easier to debug. Micro-frontends solve an *organisational* problem, not a technical one.

They start paying off when several teams ship to the same URL and are blocking each other —
when one team's release train holds another's bugfix, when a monolith's build takes 20
minutes, or when one team wants to upgrade a major dependency and cannot because the whole
app moves together.

What you buy:

- **Independent deploys.** The cart team ships without asking anyone's permission.
- **Fault isolation.** A broken remote degrades one section instead of whitescreening the site.
- **Incremental migration.** A legacy section can be replaced one remote at a time.

What you pay, visible in this repo:

- **Runtime version negotiation.** Dependencies are resolved by the browser, not the bundler,
  so a mismatch is a production incident rather than a build failure.
- **Real bundle overhead.** Measured below: sharing costs the host ~19 kB gzip before it saves
  anything.
- **A harder local setup.** A remote cannot run under `vite dev` — see below.
- **Contract discipline.** The event bus and exposed components are a public API. Breaking one
  breaks apps you did not build.

---

## Architecture

```
                         ┌───────────────────────────────────┐
  browser ──────────────▶│  SHELL (host)              :5000  │
                         │                                   │
                         │  · layout, nav, footer            │
                         │  · top-level routing table        │
                         │  · auth/session  (localStorage)   │
                         │  · CART STATE  ◀── single writer  │
                         │  · the event bus instance         │
                         │  · cart-count badge               │
                         └───┬──────────┬──────────┬─────────┘
                             │          │          │
         build-time remotes ─┤          │          └─ runtime remote
                             │          │             (/remotes.json)
                   ┌─────────▼───┐ ┌────▼────────┐ ┌──────────────┐
                   │ CATALOG     │ │ CART        │ │ ACCOUNT      │
                   │      :5001  │ │      :5002  │ │      :5003   │
                   │ grid/search │ │ lines, qty  │ │ profile      │
                   │ /:productId │ │ /checkout   │ │ /orders/:id  │
                   └─────────────┘ └─────────────┘ └──────────────┘
                             ▲          ▲          ▲
                             └──────────┴──────────┘
                                  @shop/ui  (shared singleton)
                                  components · tokens · EVENT BUS

  Remotes never import each other. All cross-app traffic is typed events
  through the bus, and the shell is the only thing that acts on them.
```

### Packages

| path | what it is |
|---|---|
| `apps/shell` | The host. Owns layout, routing, session, cart state, the bus. |
| `apps/catalog` | Remote. Product grid, search/filter, product detail. |
| `apps/cart` | Remote. Line items, quantities, fake checkout. |
| `apps/account` | Remote. Profile and order history. **Loaded dynamically.** |
| `packages/ui` | Shared components, Tailwind tokens, and the event-bus contract. |
| `packages/mocks` | MSW handlers — the fake API. |
| `packages/build-config` | The one shared-singleton block, imported by all four vite configs. |

### Where each requirement lives

| # | requirement | implementation |
|---|---|---|
| 1 | Static + dynamic remotes | `apps/shell/vite.config.ts` (static) vs `apps/shell/src/lib/dynamicRemotes.ts` (runtime) |
| 2 | Shared singletons | `packages/build-config/federation.mjs` — with the full "what breaks without this" note |
| 3 | Cross-remote events | `packages/ui/src/events/` · emitted in `apps/catalog/src/components/ProductCard.tsx` · reduced in `apps/shell/src/providers/CartProvider.tsx` |
| 4 | Routing delegation | `apps/shell/src/App.tsx` (splat routes) · each remote's `src/App.tsx` (relative routes) |
| 5 | Failure isolation | `apps/shell/src/components/RemoteBoundary.tsx` · `apps/shell/src/lib/remoteHealth.ts` |
| 6 | Independent deploys | per-app `package.json` scripts · [Deploying](#deploying) below |

---

## Running it locally

```bash
pnpm install
pnpm dev          # http://localhost:5000
```

`pnpm dev` builds the three remotes, then runs the shell's dev server alongside a
`build --watch` + `preview` pair for each remote.

### Why the remotes don't get a dev server

**A Module Federation remote cannot run under `vite dev`.** Vite's dev server is bundleless —
it serves raw ES modules and never runs the bundling step the federation plugin hooks into, so
no `remoteEntry.js` is produced. Only the *host* gets a real dev server.

That is why each remote has two modes:

```bash
pnpm dev                 # everything, federated. Shell has HMR; remotes rebuild on change.
pnpm dev:catalog         # ONE remote, standalone, full HMR, no federation at all
```

Standalone mode is not a workaround — it is the point. A team owning the catalog develops it
with its own mock API and no shell checked out. It also keeps the coupling honest: everything
the shell normally provides has to be stubbed in `src/standalone.tsx`, so if that file starts
growing, the remote has quietly become entangled with the host.

### Seeing failure isolation work

Two ways, and they prove different things:

```bash
# 1. Simulated — instant, but only proves the boundary renders
open http://localhost:5000/catalog?down=catalog
#    …or use the toggles in the footer toolbar

# 2. Honest — a real network failure
#    kill the catalog preview server, then reload
```

Use #2 before believing it. The simulated version throws before the network call, so it cannot
catch a mistake like the shell eagerly importing something from the remote at module scope.

Either way: navigation, the cart badge, and the other two remotes stay fully usable.

### Verifying the whole thing

```bash
pnpm verify              # typecheck (6 packages) + lint + build all four
pnpm verify:federation   # drives a real browser through all six requirements
pnpm analyze             # the measured bundle comparison below
```

`pnpm verify:federation` is a scripted walkthrough, not a test suite. It asserts things that
cannot be seen in a build artifact — that no remote downloaded its own React, that clicking
"Add to cart" in the catalog moves a badge the shell rendered, that a downed remote leaves the
rest of the page working.

---

## Measured: what shared singletons are worth

Numbers from `pnpm analyze` on this machine. It drives a real browser across six routes,
records every `.js`/`.css` file actually fetched from all four origins, and gzips them from
disk (level 9) to get true over-the-wire bytes.

**Disk size is not used, and that matters:** every remote *always* ships a fallback copy of
React so it can run standalone, in both modes. Comparing `dist` directories would badly
understate the difference.

| app | shared (gzip) | `shared` removed | saved |
|---|---|---|---|
| shell | 224.3 kB | 204.9 kB | **+19.4 kB (−9.5%)** |
| catalog | 46.2 kB | 87.0 kB | 40.8 kB (46.9%) |
| cart | 45.0 kB | 85.8 kB | 40.8 kB (47.6%) |
| account | 45.2 kB | 85.2 kB | 40.0 kB (47.0%) |
| **TOTAL** | **360.7 kB** | **462.9 kB** | **102.2 kB (22.1%)** |

Requests: **59 files** with sharing vs **36** without.

### Reading this honestly

**Sharing is not free.** The host got ~19 kB *bigger* and the whole app makes ~23 more
requests, because the shared modules are split into separately-negotiable chunks and the host
carries the share-scope runtime.

**It pays for itself at roughly one remote.** Each remote drops ~41 kB gzip — its own React,
React DOM and React Router — so the ~19 kB host overhead is repaid by the first remote and
everything after is profit. With three remotes: 102 kB saved, 22%.

**And the byte count is the less important half.** Two React copies on one page is not a
slow app, it is a *broken* app — see the next section. The bundle saving is the consolation
prize; correctness is the actual reason.

Per-app treemaps: `ANALYZE=1 pnpm build`, then open `apps/*/dist/stats.html`.

---

## The parts worth reading

### Shared singletons, and what breaks without them

Full detail in `packages/build-config/federation.mjs`. The short version:

- **react / react-dom** — two copies means two dispatchers. Every hook in the remote throws
  *"Invalid hook call"* despite obviously-correct code.
- **react/jsx-runtime** — holds its own reference to React internals; unshared it drags in a
  second React behind your back, while `react` itself still looks correctly shared.
- **react-router-dom** — the remote gets a second `RouterContext` and a second history.
  `useNavigate` throws *"may be used only in the context of a `<Router>`"* even though the
  shell plainly renders one.
- **`@shop/ui`** — React Context identity is per *module instance*. Duplicate it and the
  shell's provider writes into one context object while the remote reads another. **No error
  is thrown**; `useContext` just returns the default and "Add to cart" silently does nothing.

#### The subpath trap — this one actually bit during development

Module Federation keys shared modules by the **exact import specifier**, not by npm package.

```js
shared: {
  '@shop/ui':        { singleton: true, ... },  // covers  from '@shop/ui'
  '@shop/ui/events': { singleton: true, ... },  // REQUIRED — a different key!
}
```

Without the second line the build succeeds, React is genuinely shared, the singleton config
*looks* right — and the app dies at runtime with "no EventBusProvider", because the bus lives
at a subpath that was never shared. Every subpath crossing the boundary needs its own entry.

### Cross-remote communication

The bus contract (`packages/ui/src/events/types.ts`) splits into two kinds of channel:

- **Commands** — `cart:add`, `cart:setQty`, `cart:remove`, `cart:clear`. "Please do this."
- **Facts** — `cart:updated`, `auth:changed`, `remote:error`. "This has happened."

Remotes send commands and react to facts. **Only the shell turns a command into a fact**, which
keeps exactly one writer for shared state. The canonical flow:

```
catalog                     shell                          cart remote
───────                     ─────                          ───────────
emit('cart:add') ─────────▶ CartProvider reduces
                            badge re-renders (instant)
                            emit('cart:updated') ─────────▶ drawer syncs
```

`cart:updated` and `auth:changed` are **replay** channels: a late-mounting remote receives the
current value the moment it subscribes. Without that, the lazy-loaded cart would render empty
until the user next changed something. Commands are deliberately *not* replayed — replaying
`cart:add` would re-add the product every time a remote mounted.

### Why the shell owns cart state

The instinct is "the cart domain owns cart data". This repo deliberately does the opposite,
for one reason: **the badge must be correct before the cart remote has ever loaded, and must
stay correct if that remote is down.** Remote-owned state would force eager-loading the cart on
every page (killing lazy loading), or show a wrong count until someone visited `/cart` — and a
failed remote would silently zero the badge, which is the opposite of failure isolation.

So: shell owns cart **state**, cart remote owns cart **UI**. That is the split that survives an
outage. The cart remote holds no authoritative state at all — it mirrors what the shell
broadcasts and sends commands back.

### Static vs dynamic remotes

`catalog` and `cart` are declared in `apps/shell/vite.config.ts`. `account` is not — the shell
fetches `/remotes.json` at runtime and calls `registerRemotes()`.

|  | static | dynamic |
|---|---|---|
| URL known at | build time, baked into the host bundle | runtime, from a JSON file |
| Moving the remote | rebuild + redeploy the host | edit one JSON file |
| Type safety | yes, via `src/types/remotes.d.ts` | none — a typo is a runtime error |
| Canary / A-B / per-tenant | not possible | straightforward |
| **Eagerly fetched** | **yes — see below** | **no** |

That last row was measured, not assumed. On `/catalog`, with nothing cart-related rendered:

```
fetched from :5002 (static cart)    5 files  — remoteEntry.js + share map
fetched from :5003 (dynamic account) 0 files
```

The host initialises every *statically declared* container up front to negotiate the shared
scope. The exposed component chunk stays lazy in both cases — but the container cost is real
and scales with the number of declared remotes. A genuine argument for dynamic registration
that is easy to miss.

### Routing delegation

The shell owns the table and nothing deeper:

```
/                → home            (shell)
/catalog/*       → catalog remote  → "" · ":productId"
/cart/*          → cart remote     → "" · "checkout" · "checkout/success"
/account/*       → account remote  → "" · "orders" · "orders/:orderId"
*                → 404             (shell)
```

Remotes render **relative** `<Routes>` and never their own `<BrowserRouter>` — there is one
history for the page, owned by the shell. A remote never hardcodes its mount point, so the
shell could remount catalog at `/shop` without the remote changing.

**Trade-off:** because remotes render *descendant* routes, they cannot use React Router's
data APIs (`loader`/`action`), which only exist for routes registered with the data router the
shell owns. Remotes fetch in effects instead (`src/lib/useAsync.ts`). Fixing this properly
means the shell exposing a route-registration API so remotes can contribute route objects.

---

## Deploying

Each app is a separate Vercel project pointing at the same repository.

### Per-project settings

| setting | shell | catalog / cart / account |
|---|---|---|
| Root Directory | `apps/shell` | `apps/<name>` |
| Build Command | `pnpm build:shell` | `pnpm --filter @shop/<name> build` |
| Output Directory | `dist` | `dist` |
| Install Command | `pnpm install` | `pnpm install` |

Enable **Include source files outside of the Root Directory** — the apps depend on
`packages/*` through the workspace.

### Wiring the remotes

The three remotes need no configuration; they just publish `remoteEntry.js`.

The **shell** needs to know where they are:

```bash
# Build-time, for the two static remotes:
VITE_CATALOG_URL = https://shop-front-catalog.vercel.app
VITE_CART_URL    = https://shop-front-cart.vercel.app
```

The **account** remote is not configured at build time at all. Edit
`apps/shell/public/remotes.json`:

```json
{ "account": "https://shop-front-account.vercel.app" }
```

Changing that file and redeploying *only the shell's static assets* repoints the remote — no
rebuild. That is the dynamic-remote payoff, and the reason to accept losing type safety on
that one boundary.

### CORS

Remotes are fetched cross-origin, so `remoteEntry.js` must be served with
`Access-Control-Allow-Origin`. Locally this is `preview.cors` in each remote's vite config. On
Vercel, add to each **remote** project:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [{ "key": "Access-Control-Allow-Origin", "value": "*" }]
    }
  ]
}
```

Tighten `*` to the shell's origin for anything real.

### SPA rewrites

All four apps are client-routed, so every project needs unknown paths served `index.html`:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

### Deploy order

Remotes first, then the shell — the shell's build embeds their URLs. After the first deploy
the three remotes redeploy freely and independently; the shell only needs rebuilding if a
*static* remote's URL changes.

---

## Shortcuts — what would not survive production

Flagged in the code as well as here.

- **MSW ships in the production build.** There is no backend. A real app never ships its mock
  layer; it would be `import.meta.env.DEV`-gated. It is also awaited before first render, so
  its ~147 kB gzip sits on the critical path.
- **Auth is a localStorage flag.** No token, no expiry, no server validation — anyone can grant
  themselves a session from devtools. Real: an httpOnly-cookie session, with only derived
  non-secret claims exposed.
- **Checkout is fake.** No payment provider, no idempotency key, and it trusts a client-supplied
  total. A real one re-verifies prices server-side and makes the POST idempotent so a
  double-submit cannot charge twice.
- **The outage simulator ships to production** so the deployed demo is explorable. Normally
  dev-only.
- **Remote type declarations are hand-written** (`apps/shell/src/types/remotes.d.ts`) and nothing
  verifies they match what the remote exposes — the federation equivalent of an untyped API
  boundary. Production: generate them after the remotes build, or publish the contract as a
  versioned package.
- **No version pinning or integrity checking on `remotes.json`.** A compromised or fat-fingered
  entry would execute arbitrary code in the shell's origin.
- **Product images are generated gradients**, not photographs — keeps the repo offline and
  dependency-free.
- **No CI, no test suite.** `pnpm verify:federation` is a walkthrough, not a regression net.
  Real: Playwright E2E per remote, contract tests on the bus, and axe in CI.
- **`@shop/mocks` doubles as the API contract package.** Remotes import types from it. Real:
  a generated client (OpenAPI/tRPC/codegen) shared by frontend and backend.
