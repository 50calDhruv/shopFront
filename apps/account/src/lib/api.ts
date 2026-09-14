import type { Order, Profile } from '@shop/mocks';

async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new Error(`Request to ${path} failed (${response.status})`);
  return (await response.json()) as unknown;
}

function isOrder(value: unknown): value is Order {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['id'] === 'string' &&
    typeof v['placedAt'] === 'string' &&
    typeof v['totalCents'] === 'number' &&
    Array.isArray(v['lines'])
  );
}

export async function fetchOrders(signal?: AbortSignal): Promise<Order[]> {
  const body = await getJson('/api/orders', signal);
  const list = (body as { orders?: unknown }).orders;
  if (!Array.isArray(list)) throw new Error('Malformed /api/orders response');
  return list.filter(isOrder);
}

export async function fetchOrder(id: string, signal?: AbortSignal): Promise<Order> {
  const body = await getJson(`/api/orders/${encodeURIComponent(id)}`, signal);
  const order = (body as { order?: unknown }).order;
  if (!isOrder(order)) throw new Error('Malformed order response');
  return order;
}

export async function fetchProfile(signal?: AbortSignal): Promise<Profile> {
  const body = await getJson('/api/profile', signal);
  const profile = (body as { profile?: unknown }).profile;
  if (typeof profile !== 'object' || profile === null) {
    throw new Error('Malformed profile response');
  }
  return profile as Profile;
}
