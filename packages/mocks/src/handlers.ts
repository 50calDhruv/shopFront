import { HttpResponse, delay, http } from 'msw';
import { orders, products, profile } from './data';
import type { Order, Product } from './types';

/**
 * Artificial latency. Without it every Suspense fallback and loading skeleton
 * flashes past in a single frame, which makes the failure-isolation and
 * lazy-loading behaviour impossible to actually observe in a demo.
 */
const LATENCY_MS = 220;

/** MSW gives path params as string | readonly string[]; collapse to a string. */
function param(value: string | readonly string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return typeof value === 'string' ? value : '';
}

function sortProducts(list: Product[], sort: string | null): Product[] {
  switch (sort) {
    case 'price-asc':
      return [...list].sort((a, b) => a.priceCents - b.priceCents);
    case 'price-desc':
      return [...list].sort((a, b) => b.priceCents - a.priceCents);
    case 'rating':
      return [...list].sort((a, b) => b.rating - a.rating);
    default:
      return list;
  }
}

export const handlers = [
  /**
   * GET /api/products?q=&category=&sort=
   * Filtering happens server-side here on purpose: it mirrors a real API and
   * keeps the catalog remote from shipping the whole product table to the client.
   */
  http.get('/api/products', async ({ request }) => {
    await delay(LATENCY_MS);

    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim().toLowerCase() ?? '';
    const category = url.searchParams.get('category');
    const sort = url.searchParams.get('sort');

    let result = products;

    if (q) {
      result = result.filter((p) =>
        [p.title, p.blurb, ...p.tags].some((field) => field.toLowerCase().includes(q)),
      );
    }

    if (category && category !== 'all') {
      result = result.filter((p) => p.category === category);
    }

    return HttpResponse.json({ products: sortProducts(result, sort) });
  }),

  /** GET /api/products/:idOrSlug — accepts either so URLs can stay readable. */
  http.get('/api/products/:id', async ({ params }) => {
    await delay(LATENCY_MS);

    const key = param(params['id']);
    const product = products.find((p) => p.id === key || p.slug === key);

    if (!product) {
      return HttpResponse.json({ message: `No product "${key}"` }, { status: 404 });
    }

    return HttpResponse.json({ product });
  }),

  http.get('/api/profile', async () => {
    await delay(LATENCY_MS);
    return HttpResponse.json({ profile });
  }),

  http.get('/api/orders', async () => {
    await delay(LATENCY_MS);
    const sorted: Order[] = [...orders].sort(
      (a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt),
    );
    return HttpResponse.json({ orders: sorted });
  }),

  http.get('/api/orders/:id', async ({ params }) => {
    await delay(LATENCY_MS);

    const id = param(params['id']);
    const order = orders.find((o) => o.id === id);

    if (!order) {
      return HttpResponse.json({ message: `No order "${id}"` }, { status: 404 });
    }

    return HttpResponse.json({ order });
  }),

  /**
   * POST /api/checkout — the fake checkout the cart remote calls.
   * Always succeeds after a longer delay so the pending state is visible.
   */
  http.post('/api/checkout', async () => {
    await delay(900);
    const orderId = `ord-${Math.floor(Math.random() * 9000 + 1000)}`;
    return HttpResponse.json({ orderId, status: 'processing' }, { status: 201 });
  }),
];
