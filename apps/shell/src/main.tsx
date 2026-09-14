import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startMocks } from '@shop/mocks';
import { App } from './App';
import './index.css';

/**
 * The shell starts the mock API for the whole page.
 *
 * A service worker is origin-scoped, and every remote's code executes on this
 * origin once federated — so one worker started here intercepts fetches made by
 * catalog, cart and account too. Remotes running standalone start their own.
 *
 * SHORTCUT: MSW runs in production builds as well, because there is no backend.
 * A real app would never ship its mock layer; it would be dev-only.
 */
async function bootstrap(): Promise<void> {
  if (import.meta.env['VITE_ENABLE_MSW'] !== 'false') {
    await startMocks();
  }

  const container = document.getElementById('root');
  if (!container) {
    throw new Error('#root missing from index.html');
  }

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
