import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { EventBusProvider } from '@shop/ui/events';
import { AppLayout } from './components/AppLayout';
import { HomePage } from './routes/HomePage';
import { NotFoundPage } from './routes/NotFoundPage';
import { RemotePlaceholder } from './routes/RemotePlaceholder';
import { AuthProvider } from './providers/AuthProvider';
import { CartProvider } from './providers/CartProvider';
import { bus } from './lib/bus';

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
        element: (
          <RemotePlaceholder
            name="catalog"
            phase="Phase 2"
            willOwn={[
              'Product grid with search and category filtering',
              'Product detail at /catalog/:productId',
              'The "Add to cart" button that fires the cross-remote event',
            ]}
          />
        ),
      },
      {
        path: 'cart/*',
        element: (
          <RemotePlaceholder
            name="cart"
            phase="Phase 3"
            willOwn={[
              'Line items and quantity controls',
              'Fake checkout at /cart/checkout',
              'Confirmation at /cart/checkout/success',
            ]}
          />
        ),
      },
      {
        path: 'account/*',
        element: (
          <RemotePlaceholder
            name="account"
            phase="Phase 4"
            willOwn={[
              'Profile summary',
              'Order history at /account/orders',
              'Order detail at /account/orders/:orderId',
            ]}
          />
        ),
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
