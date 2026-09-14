import { useSyncExternalStore } from 'react';
import { cn } from '@shop/ui';
import {
  REMOTE_NAMES,
  getRemoteHealthSnapshot,
  isRemoteDown,
  setRemoteDown,
  subscribeRemoteHealth,
} from '../lib/remoteHealth';

/**
 * The failure-simulation toolbar (requirement #5).
 *
 * Switch a remote off, navigate to it, and watch its error boundary render while
 * the header, the cart badge and every other remote keep working.
 *
 * useSyncExternalStore rather than useState + useEffect because the down-list is
 * a genuine external store: it is also written from the URL at boot, outside
 * React. getRemoteHealthSnapshot returns a STRING, not a Set — a fresh Set each
 * call would never be Object.is-equal and would re-render forever.
 */
export function RemoteToolbar() {
  const snapshot = useSyncExternalStore(
    subscribeRemoteHealth,
    getRemoteHealthSnapshot,
    // Server snapshot. No SSR here, but passing it costs nothing and prevents a
    // confusing crash if this app ever gains it.
    getRemoteHealthSnapshot,
  );

  const downCount = snapshot === '' ? 0 : snapshot.split(',').length;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-ink-300 p-3">
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-ink-700">Simulate a remote outage</span>
        <span className="text-xs text-ink-500">
          {downCount === 0
            ? 'All remotes healthy'
            : `${downCount} remote${downCount === 1 ? '' : 's'} switched off`}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {REMOTE_NAMES.map((name) => {
          const down = isRemoteDown(name);
          return (
            <button
              key={name}
              type="button"
              // The visual state is colour; aria-pressed carries it non-visually.
              aria-pressed={down}
              onClick={() => setRemoteDown(name, !down)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium',
                'transition-colors duration-150',
                down
                  ? 'bg-critical-50 text-critical-600 ring-1 ring-inset ring-critical-500'
                  : 'bg-ink-100 text-ink-600 hover:bg-ink-200',
              )}
            >
              <span aria-hidden="true">{down ? '✕' : '✓'}</span>
              {name}
            </button>
          );
        })}
      </div>

      <p className="w-full text-xs text-ink-500">
        Also works as <code className="font-mono">?down=catalog,cart</code> in the URL.
        For a genuine network failure rather than a simulated one, stop that
        remote&rsquo;s preview server and reload.
      </p>
    </div>
  );
}
