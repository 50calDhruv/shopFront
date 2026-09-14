import { Route, Routes } from 'react-router-dom';
import { CatalogListPage } from './routes/CatalogListPage';
import { ProductDetailPage } from './routes/ProductDetailPage';

/**
 * The catalog remote's ROOT — this is what `exposes: { './App' }` publishes.
 *
 * ROUTING DELEGATION (requirement #4), the remote's half of the contract:
 *
 *  1. No <BrowserRouter> here. The shell owns the single history for the page.
 *     A second router means two objects fighting over one address bar, and
 *     back/forward breaks. This is also why react-router-dom must be a singleton.
 *
 *  2. Paths are RELATIVE. The shell matched `/catalog/*` and handed us the rest,
 *     so "" is /catalog and ":productId" is /catalog/:productId. The remote
 *     never hardcodes its own mount point, which means the shell can remount it
 *     at /shop or /products without the remote changing at all.
 *
 *  3. The remote owns everything below that prefix, including its own 404.
 */
export default function App() {
  return (
    <Routes>
      <Route index element={<CatalogListPage />} />
      <Route path=":productId" element={<ProductDetailPage />} />
      <Route
        path="*"
        element={
          <p className="text-sm text-ink-600">
            No such page in the catalog.
          </p>
        }
      />
    </Routes>
  );
}
