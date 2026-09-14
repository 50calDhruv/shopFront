import { Component, Suspense, lazy, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { Button, Card, CardBody } from '@shop/ui';
import { useEventBus } from '@shop/ui/events';
import type { EventBus } from '@shop/ui/events';
import { isRemoteDown } from '../lib/remoteHealth';
import type { RemoteName } from '../lib/remoteHealth';

type RemoteModule = { default: ComponentType };
type RemoteLoader = () => Promise<RemoteModule>;

/**
 * FAILURE ISOLATION (requirement #5).
 *
 * Every remote mounts through here: lazy import + Suspense + its own error
 * boundary. The blast radius of a broken remote is exactly this box. The
 * header, nav, cart badge, footer and every OTHER remote keep working, because
 * an error boundary only unmounts the subtree beneath it.
 *
 * What this catches:
 *   - remoteEntry.js 404s / the remote's host is down / DNS fails
 *   - the remote loads but throws while rendering
 *   - a shared-singleton version mismatch rejected at load time
 *
 * What it does NOT catch (worth knowing, and true of all React boundaries):
 *   - errors thrown in event handlers inside the remote
 *   - errors in async callbacks that are not awaited during render
 *   - anything the remote does at module scope that mutates global state before
 *     it fails — which is why the "kill the server" test matters more than the
 *     simulated one.
 */

interface ErrorBoundaryProps {
  name: RemoteName;
  bus: EventBus;
  onRetry: () => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class RemoteErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    // Tell the shell centrally rather than each boundary rendering its own
    // toast. The shell decides how to surface it — and could report it to an
    // error tracker here, tagged with which remote failed.
    this.props.bus.emit('remote:error', {
      remote: this.props.name,
      message: error.message,
    });
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3 p-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-full bg-critical-50 px-2.5 text-xs font-semibold text-critical-600">
              Remote unavailable
            </span>
            <code className="font-mono text-xs text-ink-500">{this.props.name}</code>
          </div>

          <h2 className="text-lg font-semibold text-ink-900">
            This section could not load
          </h2>

          <p className="max-w-prose text-sm text-ink-600">
            The rest of the site is unaffected — navigation, your cart and the
            other sections all still work. That is the whole point: a failed
            remote degrades one box, not the page.
          </p>

          <p className="max-w-prose font-mono text-xs text-ink-500">{error.message}</p>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              this.setState({ error: null });
              this.props.onRetry();
            }}
          >
            Try again
          </Button>
        </CardBody>
      </Card>
    );
  }
}

function RemoteSkeleton({ name }: { name: RemoteName }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <p className="sr-only">Loading the {name} section</p>
      <div className="h-8 w-48 animate-pulse rounded bg-ink-200" aria-hidden="true" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-56 animate-pulse rounded-lg bg-ink-200" />
        ))}
      </div>
    </div>
  );
}

interface RemoteBoundaryProps {
  name: RemoteName;
  /** Must be defined at module scope — a new function each render refetches. */
  loader: RemoteLoader;
}

export function RemoteBoundary({ name, loader }: RemoteBoundaryProps) {
  const bus = useEventBus();

  /**
   * React.lazy memoises the promise it was given, INCLUDING a rejected one. So
   * retrying cannot reuse the same lazy component — it would replay the cached
   * rejection forever. Each attempt builds a brand-new lazy component, and the
   * boundary is remounted by key so its error state resets with it.
   */
  const [attempt, setAttempt] = useState(() => ({
    n: 0,
    Component: createLazyRemote(name, loader),
  }));

  function retry(): void {
    setAttempt((previous) => ({
      n: previous.n + 1,
      Component: createLazyRemote(name, loader),
    }));
  }

  const { Component } = attempt;

  return (
    <RemoteErrorBoundary key={attempt.n} name={name} bus={bus} onRetry={retry}>
      <Suspense fallback={<RemoteSkeleton name={name} />}>
        <Component />
      </Suspense>
    </RemoteErrorBoundary>
  );
}

function createLazyRemote(name: RemoteName, loader: RemoteLoader) {
  return lazy(async () => {
    if (isRemoteDown(name)) {
      throw new Error(
        `Simulated outage: the "${name}" remote is switched off in the dev toolbar.`,
      );
    }
    return loader();
  });
}
