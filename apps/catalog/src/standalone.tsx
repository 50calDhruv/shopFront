import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { EventBusProvider, createEventBus, useEventBusSubscription } from '@shop/ui/events';
import { startMocks } from '@shop/mocks';
import App from './App';
import './index.css';

/**
 * STANDALONE MODE — `pnpm --filter @shop/catalog dev`
 *
 * This entry exists because a federated remote cannot run under `vite dev`
 * (the plugin only runs during `vite build`), but it is much more than a
 * workaround: it is the micro-frontend payoff. The team owning this remote
 * develops it with full HMR, its own mock API, and no shell checked out at all.
 *
 * It also documents the remote's dependencies honestly. Everything the shell
 * normally provides has to be stubbed here — a router, an event bus — which
 * makes the coupling surface impossible to grow by accident. If this file
 * starts needing a lot of new stubs, the remote has become too entangled.
 */

const standaloneBus = createEventBus({ debug: true });

/** Dev-only panel: shows that the remote really does emit the contract events. */
function EmittedEvents() {
  const [events, setEvents] = useState<string[]>([]);

  useEventBusSubscription('cart:add', (payload) => {
    setEvents((prev) =>
      [`cart:add → ${payload.productId} ×${payload.qty}`, ...prev].slice(0, 6),
    );
  });

  return (
    <aside className="rounded-lg border border-dashed border-ink-300 bg-ink-0 p-4">
      <h2 className="text-sm font-semibold text-ink-900">
        Events this remote emitted
      </h2>
      <p className="mt-1 text-xs text-ink-500">
        In the shell, these are what update the cart badge. Here, nothing is
        listening but this panel — which is the point: the remote does not know
        or care who consumes them.
      </p>
      {events.length === 0 ? (
        <p className="mt-3 text-xs text-ink-400">
          Nothing yet. Press &ldquo;Add to cart&rdquo; on any product.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1">
          {events.map((entry, index) => (
            <li key={`${entry}-${index}`} className="font-mono text-xs text-ink-700">
              {entry}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function StandaloneChrome() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3 rounded-lg bg-caution-50 px-4 py-3">
        <span className="text-sm font-semibold text-caution-600">Standalone mode</span>
        <p className="text-xs text-ink-600">
          The catalog remote running on its own. No shell, no Module Federation —
          just this app and its mock API.
        </p>
      </header>

      <main>
        <App />
      </main>

      <EmittedEvents />
    </div>
  );
}

async function bootstrap(): Promise<void> {
  // Standalone means this app IS the origin, so it starts its own worker.
  await startMocks();

  const container = document.getElementById('root');
  if (!container) throw new Error('#root missing from index.html');

  createRoot(container).render(
    <StrictMode>
      <EventBusProvider bus={standaloneBus}>
        <BrowserRouter>
          <StandaloneChrome />
        </BrowserRouter>
      </EventBusProvider>
    </StrictMode>,
  );
}

void bootstrap();
