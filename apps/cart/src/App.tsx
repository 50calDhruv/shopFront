import { Route, Routes } from 'react-router-dom';
import { CartPage } from './routes/CartPage';
import { CheckoutPage } from './routes/CheckoutPage';
import { CheckoutSuccessPage } from './routes/CheckoutSuccessPage';

/**
 * The cart remote's root — published as `exposes: { './App' }`.
 *
 * Owns its own sub-routes beneath whatever prefix the shell mounted it at:
 *   /cart                     the line items
 *   /cart/checkout            the fake checkout form
 *   /cart/checkout/success    confirmation
 *
 * It holds no authoritative cart state. It mirrors what the shell broadcasts and
 * sends commands back. See src/lib/useCartSnapshot.ts.
 */
export default function App() {
  return (
    <Routes>
      <Route index element={<CartPage />} />
      <Route path="checkout" element={<CheckoutPage />} />
      <Route path="checkout/success" element={<CheckoutSuccessPage />} />
      <Route
        path="*"
        element={<p className="text-sm text-ink-600">No such page in the cart.</p>}
      />
    </Routes>
  );
}
