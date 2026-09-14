import { Route, Routes } from 'react-router-dom';
import { OrderDetailPage } from './routes/OrderDetailPage';
import { OrdersPage } from './routes/OrdersPage';
import { ProfilePage } from './routes/ProfilePage';

/**
 * The account remote's root — published as `exposes: { './App' }`.
 *
 * Identical in shape to the other two remotes. Nothing here knows that the shell
 * found this remote at runtime instead of at build time, which is exactly the
 * property that makes dynamic remotes safe to adopt incrementally.
 */
export default function App() {
  return (
    <Routes>
      <Route index element={<ProfilePage />} />
      <Route path="orders" element={<OrdersPage />} />
      <Route path="orders/:orderId" element={<OrderDetailPage />} />
      <Route
        path="*"
        element={<p className="text-sm text-ink-600">No such page in your account.</p>}
      />
    </Routes>
  );
}
