import type { Product } from '@shop/mocks';

/**
 * NOTE ON THE TYPE IMPORT
 * `@shop/mocks` doubles as the API contract package here: catalog imports only
 * the TYPE, which is erased at build time, so no mock code reaches this bundle.
 * In a real system these types would come from a generated client (OpenAPI,
 * tRPC, GraphQL codegen) shared by frontend and backend — not from the mock.
 */

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Narrow an unknown value to Product without trusting the server's word for it. */
function isProduct(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['id'] === 'string' &&
    typeof v['slug'] === 'string' &&
    typeof v['title'] === 'string' &&
    typeof v['priceCents'] === 'number' &&
    typeof v['hue'] === 'number' &&
    Array.isArray(v['tags'])
  );
}

async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, { signal });

  if (!response.ok) {
    throw new ApiError(`Request to ${path} failed`, response.status);
  }

  return (await response.json()) as unknown;
}

export interface ProductQuery {
  q?: string;
  category?: string;
  sort?: string;
}

export async function fetchProducts(
  query: ProductQuery,
  signal?: AbortSignal,
): Promise<Product[]> {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.category && query.category !== 'all') params.set('category', query.category);
  if (query.sort) params.set('sort', query.sort);

  const suffix = params.toString();
  const body = await getJson(`/api/products${suffix ? `?${suffix}` : ''}`, signal);

  const list = (body as { products?: unknown }).products;
  if (!Array.isArray(list)) {
    throw new ApiError('Malformed /api/products response', 500);
  }

  // Drop anything that does not match the contract rather than letting a bad
  // record crash a render deep in the grid.
  return list.filter(isProduct);
}

export async function fetchProduct(id: string, signal?: AbortSignal): Promise<Product> {
  const body = await getJson(`/api/products/${encodeURIComponent(id)}`, signal);

  const product = (body as { product?: unknown }).product;
  if (!isProduct(product)) {
    throw new ApiError('Malformed product response', 500);
  }

  return product;
}
