import { registerRemotes, loadRemote } from '@module-federation/runtime';
import type { ComponentType } from 'react';

/**
 * DYNAMIC REMOTE LOADING (requirement #1) — the contrast with catalog and cart.
 *
 * ── STATIC (catalog, cart) ──────────────────────────────────────────────────
 *   Declared in vite.config.ts `remotes`. The URL is compiled into the shell's
 *   bundle, and consumption looks like a normal `import('catalog/App')`.
 *
 *   + The bundler sees the dependency: it can chunk it, and TypeScript resolves
 *     the module through src/types/remotes.d.ts.
 *   + Fails loudly and early if the contract is wrong.
 *   − The host is COUPLED TO THE REMOTE'S LOCATION. Moving catalog to a new
 *     domain means rebuilding and redeploying the shell, which quietly undoes a
 *     chunk of the "independently deployable" promise.
 *
 * ── DYNAMIC (account) ───────────────────────────────────────────────────────
 *   Not in vite.config.ts at all. The URL is fetched from /remotes.json at
 *   runtime and handed to registerRemotes(), then loadRemote() pulls the module.
 *
 *   + The host never needs rebuilding to point somewhere new. Same artifact runs
 *     against staging and production by serving a different remotes.json.
 *   + Enables things static wiring cannot: canarying a remote to 10% of users,
 *     per-tenant remotes, or adding a whole new remote to a running host.
 *   + A remote can be taken out of rotation by editing one JSON file.
 *   − The bundler cannot see it, so there is no build-time verification at all:
 *     a typo in remotes.json is a runtime error, not a build failure.
 *   − The extra round trip for remotes.json is on the critical path.
 *   − TypeScript cannot infer the module's shape; the cast below is unavoidable
 *     and is exactly the risk you accept in exchange for the flexibility.
 *
 * WHICH TO USE: static for remotes that ship in lockstep with the host, dynamic
 * for anything you need to move, canary or disable without a host deploy.
 */

interface RemoteManifest {
  account?: string;
}

const FALLBACK_ACCOUNT_URL = 'http://localhost:5003';

/**
 * Read /remotes.json. Deliberately tolerant: a missing or malformed manifest
 * falls back to the local default rather than taking the page down, because a
 * config-file mistake should degrade one section, not the whole storefront.
 */
async function readManifest(): Promise<RemoteManifest> {
  try {
    const response = await fetch('/remotes.json', { cache: 'no-store' });
    if (!response.ok) return {};

    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null) return {};

    const account = (body as Record<string, unknown>)['account'];
    return typeof account === 'string' ? { account } : {};
  } catch {
    return {};
  }
}

let registration: Promise<void> | null = null;

/**
 * Registers the account remote exactly once per page load.
 *
 * The promise is cached rather than the boolean result: without this, two
 * components mounting in the same tick would both see "not registered yet" and
 * race, and registerRemotes would be called twice with the same name.
 */
function ensureRegistered(): Promise<void> {
  registration ??= (async () => {
    const manifest = await readManifest();
    const entry = `${manifest.account ?? FALLBACK_ACCOUNT_URL}/remoteEntry.js`;

    registerRemotes([
      {
        name: 'account',
        entry,
        // 'module' = a real ESM remoteEntry, which is what the Vite plugin emits.
        type: 'module',
      },
    ]);
  })();

  return registration;
}

/**
 * Load the account remote's exposed App.
 *
 * Shaped to match what React.lazy expects ({ default: Component }) so the same
 * <RemoteBoundary> handles static and dynamic remotes identically — the failure
 * isolation story does not change just because discovery did.
 */
export async function loadAccountApp(): Promise<{ default: ComponentType }> {
  await ensureRegistered();

  const module = await loadRemote<{ default: ComponentType }>('account/App');

  if (!module || typeof module.default !== 'function') {
    // Guard the cast: loadRemote is typed by us, not verified by the compiler.
    throw new Error(
      'The account remote loaded but did not export a default React component.',
    );
  }

  return module;
}
