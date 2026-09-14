import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { EventBusProvider, createEventBus } from '@shop/ui/events';
import { startMocks } from '@shop/mocks';
import App from './App';
import './index.css';

/**
 * STANDALONE MODE — `pnpm --filter @shop/account dev`
 *
 * The lightest stub of the three: account only reads `auth:changed`, so it needs
 * a router and a bus and nothing else. We seed one auth event so the profile
 * panel has something to show.
 */
const standaloneBus = createEventBus({
  debug: true,
  replay: ['cart:updated', 'auth:changed'],
});

standaloneBus.emit('auth:changed', { userId: 'u-1' });

async function bootstrap(): Promise<void> {
  await startMocks();

  const container = document.getElementById('root');
  if (!container) throw new Error('#root missing from index.html');

  createRoot(container).render(
    <StrictMode>
      <EventBusProvider bus={standaloneBus}>
        <BrowserRouter>
          <div className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 px-4 py-6">
            <header className="flex items-center gap-3 rounded-lg bg-caution-50 px-4 py-3">
              <span className="text-sm font-semibold text-caution-600">Standalone mode</span>
              <p className="text-xs text-ink-600">
                The account remote on its own, with a stub session.
              </p>
            </header>
            <main>
              <App />
            </main>
          </div>
        </BrowserRouter>
      </EventBusProvider>
    </StrictMode>,
  );
}

void bootstrap();
