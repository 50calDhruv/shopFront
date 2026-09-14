import { useSearchParams } from 'react-router-dom';
import { Card, CardBody, Input } from '@shop/ui';
import type { ProductCategory } from '@shop/mocks';
import { ProductCard } from '../components/ProductCard';
import { fetchProducts } from '../lib/api';
import { useAsync } from '../lib/useAsync';

const CATEGORIES: Array<{ value: ProductCategory | 'all'; label: string }> = [
  { value: 'all', label: 'Everything' },
  { value: 'audio', label: 'Audio' },
  { value: 'desk', label: 'Desks' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'storage', label: 'Storage' },
];

const SORTS = [
  { value: '', label: 'Featured' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
  { value: 'rating', label: 'Best rated' },
];

export function CatalogListPage() {
  /**
   * Filter state lives in the URL, not useState.
   *
   * It survives reload, it is shareable, and back/forward step through filter
   * changes. It also proves the routing delegation works: these params sit on a
   * URL the SHELL owns the prefix of, and the remote reads and writes them
   * through the shared react-router singleton without either side coordinating.
   */
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? 'all';
  const sort = searchParams.get('sort') ?? '';

  const state = useAsync(
    (signal) => fetchProducts({ q, category, sort }, signal),
    [q, category, sort],
  );

  function updateParam(key: string, value: string): void {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    // replace: filter tweaks should not each become a back-button stop.
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink-900">Catalog</h1>
        <p className="text-sm text-ink-600">
          Served by the <code className="font-mono text-brand-700">catalog</code> remote,
          rendered inside the shell&rsquo;s layout.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-72">
          <Input
            label="Search products"
            type="search"
            placeholder="Try &ldquo;lamp&rdquo; or &ldquo;wireless&rdquo;"
            value={q}
            onChange={(event) => updateParam('q', event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="text-sm font-medium text-ink-800">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(event) => updateParam('category', event.target.value)}
            className="h-10 rounded-md bg-ink-0 px-3 text-sm text-ink-900 ring-1 ring-inset ring-ink-300"
          >
            {CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sort" className="text-sm font-medium text-ink-800">
            Sort
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(event) => updateParam('sort', event.target.value)}
            className="h-10 rounded-md bg-ink-0 px-3 text-sm text-ink-900 ring-1 ring-inset ring-ink-300"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Announce result counts to screen readers as filters change. */}
      <p aria-live="polite" className="sr-only">
        {state.status === 'ready' ? `${state.data.length} products found` : 'Loading products'}
      </p>

      {state.status === 'loading' ? <ProductGridSkeleton /> : null}

      {state.status === 'error' ? (
        <Card>
          <CardBody className="p-6">
            <p className="text-sm text-critical-600">
              Could not load products: {state.error.message}
            </p>
          </CardBody>
        </Card>
      ) : null}

      {state.status === 'ready' ? (
        state.data.length === 0 ? (
          <Card>
            <CardBody className="p-6">
              <p className="text-sm text-ink-600">
                Nothing matches those filters.
              </p>
            </CardBody>
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {state.data.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index}>
          {/* Same aspect ratio as a real card, so nothing jumps when data lands. */}
          <div className="h-full rounded-lg bg-ink-0 p-3 ring-1 ring-ink-200">
            <div className="aspect-4/3 w-full animate-pulse rounded-md bg-ink-200" />
            <div className="flex flex-col gap-2 p-1 pt-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-ink-200" />
              <div className="h-3 w-full animate-pulse rounded bg-ink-100" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
