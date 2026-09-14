import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { EventBusProvider } from '@shop/ui/events';
import { AppLayout } from './components/AppLayout';
import { RemoteBoundary } from './components/RemoteBoundary';
import { HomePage } from './routes/HomePage';
import { NotFoundPage } from './routes/NotFoundPage';
import { AuthProvider } from './providers/AuthProvider';
import { CartProvider } from './providers/CartProvider';
import { bus } from './lib/bus';
import { loadAccountApp } from './lib/dynamicRemotes';

/**
 * Remote loaders are defined at MODULE SCOPE, never inline in JSX.
 *
 * A loader created during render is a new function identity every time, which
 * would make React.lazy treat each render as a fresh module and refetch the
 * remote. Hoisting them also means the bundler can see the dynamic import and
 * emit the right chunk boundary.
 *
 * These two are STATIC remotes: `catalog` and `cart` are declared in
 * vite.config.ts, so this looks like an ordinary dynamic import and TypeScript
 * resolves it through src/types/remotes.d.ts. Compare with the runtime-registered
 * account remote in src/lib/dynamicRemotes.ts.
 */
const loadCatalog = () => import('catalog/App');
const loadCart = () => import('cart/App');

/**
 * The dynamic one. Same <RemoteBoundary>, same Suspense, same error boundary —
 * only the discovery mechanism differs. See src/lib/dynamicRemotes.ts.
 */
const loadAccount = () => loadAccountApp();

/**
 * ROUTING DELEGATION (requirement #4)
 * -----------------------------------
 * The shell owns exactly this table and nothing deeper. Each remote prefix is a
 * splat route (`catalog/*`) — the shell matches the prefix, hands the element the
 * remaining path, and has no opinion about what the remote does with it.
 *
 * The remote then renders its own <Routes> with RELATIVE paths. Critically it
 * must NOT render its own <BrowserRouter>: there is one history for the page,
 * owned here. Two routers means two competing histories, and back/forward breaks.
 * That single shared history is also why react-router-dom must be a federation
 * singleton — see the `shared` block in each vite.config.ts.
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'catalog/*',
        element: <RemoteBoundary name="catalog" loader={loadCatalog} />,
      },
      {
        path: 'cart/*',
        element: <RemoteBoundary name="cart" loader={loadCart} />,
      },
      {
        path: 'account/*',
        element: <RemoteBoundary name="account" loader={loadAccount} />,
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

/**
 * Provider order matters:
 *   EventBusProvider  — must be outermost; both providers below publish to it.
 *   AuthProvider      — broadcasts auth:changed.
 *   CartProvider      — subscribes to cart:add, broadcasts cart:updated.
 *   RouterProvider    — innermost, so every route can read all of the above.
 */
export function App() {
  return (
    <EventBusProvider bus={bus}>
      <AuthProvider>
        <CartProvider>
          <RouterProvider router={router} />
        </CartProvider>
      </AuthProvider>
    </EventBusProvider>
  );
}
