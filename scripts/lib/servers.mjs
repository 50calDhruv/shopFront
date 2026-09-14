import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

/** Spawn a pnpm script in its own process group so we can kill the whole tree. */
export function startProcess(name, args, { cwd = process.cwd(), env = {} } = {}) {
  const child = spawn('pnpm', args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });

  const logs = [];
  child.stdout.on('data', (d) => logs.push(String(d)));
  child.stderr.on('data', (d) => logs.push(String(d)));

  return { name, child, logs };
}

export function stopProcess(proc) {
  if (!proc?.child?.pid) return;
  try {
    // Negative pid kills the process GROUP. vite spawns children that would
    // otherwise survive and keep holding the port, breaking the next run.
    process.kill(-proc.child.pid, 'SIGKILL');
  } catch {
    /* already gone */
  }
}

export async function waitForUrl(url, { timeoutMs = 90_000 } = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) return true;
    } catch {
      /* not up yet */
    }
    await sleep(300);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

export const PORTS = { shell: 5000, catalog: 5001, cart: 5002, account: 5003 };

/**
 * Fail fast if a port is already taken.
 *
 * Without this, a stale server from a previous run answers the readiness probe
 * and the whole verification silently runs against the WRONG build — which is
 * exactly how you get a green run that proves nothing.
 */
export async function assertPortsFree(ports) {
  const busy = [];

  for (const [name, port] of Object.entries(ports)) {
    try {
      await fetch(`http://localhost:${port}/`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(700),
      });
      busy.push(`${name} (:${port})`);
    } catch {
      /* nothing listening — good */
    }
  }

  if (busy.length) {
    throw new Error(
      `Ports already in use: ${busy.join(', ')}.\n` +
        'A previous dev/preview server is still running and would be tested ' +
        'instead of the current build. Stop it and re-run.',
    );
  }
}
