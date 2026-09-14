/**
 * FAILURE SIMULATION (requirement #5).
 *
 * Two ways to take a remote down, and they test different things:
 *
 *  1. THIS MODULE — `?down=catalog,cart` in the URL, or the dev toolbar in the
 *     footer. Convenient, instant, survives navigation. It makes the loader
 *     throw BEFORE the network request, so it proves the error boundary and the
 *     rest of the UI behave — but it does not prove the real network path.
 *
 *  2. THE HONEST TEST — stop that remote's preview server and reload. Now the
 *     browser genuinely fails to fetch remoteEntry.js. Use this one before
 *     claiming failure isolation actually works; #1 can hide a mistake such as
 *     the shell eagerly importing something from the remote at module scope.
 *
 * SHORTCUT: this ships in the production bundle so the deployed demo is
 * explorable. Real code would strip it behind `import.meta.env.DEV`.
 */

export const REMOTE_NAMES = ['catalog', 'cart', 'account'] as const;
export type RemoteName = (typeof REMOTE_NAMES)[number];

const STORAGE_KEY = 'shop-front:down-remotes';

function isRemoteName(value: string): value is RemoteName {
  return (REMOTE_NAMES as readonly string[]).includes(value);
}

function readInitial(): Set<RemoteName> {
  const result = new Set<RemoteName>();

  // sessionStorage first, so the setting survives client-side navigation.
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      for (const name of stored.split(',')) {
        if (isRemoteName(name)) result.add(name);
      }
    }
  } catch {
    // Private mode / storage disabled. Fall through to the URL.
  }

  // An explicit ?down= in the URL always wins, including `?down=` to clear.
  const param = new URLSearchParams(window.location.search).get('down');
  if (param !== null) {
    result.clear();
    for (const name of param.split(',').map((s) => s.trim())) {
      if (isRemoteName(name)) result.add(name);
    }
    persist(result);
  }

  return result;
}

function persist(set: ReadonlySet<RemoteName>): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, [...set].join(','));
  } catch {
    // Non-fatal: the in-memory set still works for this page view.
  }
}

let downRemotes = readInitial();
const listeners = new Set<() => void>();

function emitChange(): void {
  for (const listener of [...listeners]) listener();
}

export function isRemoteDown(name: RemoteName): boolean {
  return downRemotes.has(name);
}

export function setRemoteDown(name: RemoteName, down: boolean): void {
  const next = new Set(downRemotes);
  if (down) {
    next.add(name);
  } else {
    next.delete(name);
  }
  downRemotes = next;
  persist(next);
  emitChange();
}

export function subscribeRemoteHealth(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * A STRING snapshot, not a Set.
 *
 * useSyncExternalStore compares snapshots with Object.is and re-renders on every
 * change. Returning a fresh Set each call would never compare equal and would
 * spin forever. A sorted string is stable for equal contents.
 */
export function getRemoteHealthSnapshot(): string {
  return [...downRemotes].sort().join(',');
}
