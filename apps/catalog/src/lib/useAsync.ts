import { useEffect, useState } from 'react';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; data: T };

/**
 * Minimal fetch-on-mount hook with abort-on-change.
 *
 * WHY NOT REACT ROUTER LOADERS: this remote renders *descendant* <Routes> inside
 * the slot the shell gave it, and loaders/actions only exist for routes
 * registered with a data router. The shell owns the data router, so a remote
 * cannot contribute loaders to it without the shell exposing a route-registration
 * API. That is a genuine trade-off of routing delegation — noted in the README.
 *
 * In a production app this would be TanStack Query: caching, dedupe, retries and
 * stale-while-revalidate are exactly what this hook does not do.
 */
export function useAsync<T>(
  run: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): AsyncState<T> {
  // A primitive identity for the current request, so both the reset below and
  // the effect can compare cheaply.
  const key = JSON.stringify(deps);

  const [tracked, setTracked] = useState<{ key: string; state: AsyncState<T> }>({
    key,
    state: { status: 'loading' },
  });

  /**
   * Reset to `loading` during RENDER rather than in an effect.
   *
   * This is React's documented "adjusting state when props change" pattern. The
   * naive version — setState({status:'loading'}) as the first line of the effect
   * — renders one frame of STALE data for the new query before the loading state
   * lands, and trips react-hooks/set-state-in-effect for exactly that reason.
   * Re-rendering during render is cheaper: React discards this render and
   * restarts immediately, without committing or painting the stale frame.
   */
  let current = tracked;
  if (tracked.key !== key) {
    current = { key, state: { status: 'loading' } };
    setTracked(current);
  }

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    run(controller.signal)
      .then((data) => {
        if (cancelled) return;
        setTracked({ key, state: { status: 'ready', data } });
      })
      .catch((error: unknown) => {
        // An abort is the normal consequence of the user typing again, not a failure.
        if (cancelled || controller.signal.aborted) return;
        setTracked({
          key,
          state: {
            status: 'error',
            error: error instanceof Error ? error : new Error(String(error)),
          },
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // `run` is intentionally excluded: callers pass an inline arrow, so including
    // it would refetch on every render. `key` captures everything that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return current.state;
}
