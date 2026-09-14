/**
 * Money arrives from the API as integer cents and is formatted at the edge.
 * A single shared Intl instance — constructing one per render is a measurable
 * cost in a product grid.
 */
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function formatPrice(cents: number): string {
  return usd.format(cents / 100);
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}
