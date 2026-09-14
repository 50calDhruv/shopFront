/** Shared API shapes. Money is always integer minor units — never a float. */
export interface Product {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  description: string;
  /** Price in cents (USD). Formatting is a UI concern, not an API one. */
  priceCents: number;
  category: ProductCategory;
  /** Drives the generated gradient placeholder. See "no image hosting" in README. */
  hue: number;
  rating: number;
  reviewCount: number;
  stock: number;
  tags: string[];
}

export type ProductCategory = 'audio' | 'desk' | 'lighting' | 'storage';

export interface OrderLine {
  productId: string;
  title: string;
  qty: number;
  unitPriceCents: number;
}

export type OrderStatus = 'delivered' | 'shipped' | 'processing' | 'cancelled';

export interface Order {
  id: string;
  placedAt: string;
  status: OrderStatus;
  lines: OrderLine[];
  totalCents: number;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  memberSince: string;
  tier: 'standard' | 'plus';
}
