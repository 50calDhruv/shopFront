import type { Order, Product, Profile } from './types';

/**
 * Fixture data. Deliberately small and hand-written rather than faker-generated:
 * stable ids and copy make the UI diffable between runs and keep screenshots
 * meaningful.
 */
export const products: Product[] = [
  {
    id: 'p-001',
    slug: 'aria-over-ear-headphones',
    title: 'Aria Over-Ear Headphones',
    blurb: 'Adaptive noise cancelling, 40-hour battery.',
    description:
      'Three microphones per cup steer the noise-cancelling profile as you move between rooms. Memory-foam earcups and a magnesium yoke keep the weight at 249g.',
    priceCents: 32900,
    category: 'audio',
    hue: 262,
    rating: 4.7,
    reviewCount: 1284,
    stock: 18,
    tags: ['wireless', 'anc', 'flagship'],
  },
  {
    id: 'p-002',
    slug: 'meridian-desk-lamp',
    title: 'Meridian Desk Lamp',
    blurb: 'Tunable 2700–6500K with a weighted brass base.',
    description:
      'A continuous dimming curve from candlelight to daylight, held by a solid brass base that does not drift when you nudge it. CRI 97.',
    priceCents: 18500,
    category: 'lighting',
    hue: 44,
    rating: 4.5,
    reviewCount: 402,
    stock: 7,
    tags: ['tunable', 'brass'],
  },
  {
    id: 'p-003',
    slug: 'kerf-standing-desk',
    title: 'Kerf Standing Desk',
    blurb: 'Solid ash top, 62dB-quiet dual motor.',
    description:
      'Four-stage legs travel from 58cm to 123cm in eleven seconds. The ash top is finished with hardwax oil, so a scratch sands out instead of delaminating.',
    priceCents: 89900,
    category: 'desk',
    hue: 28,
    rating: 4.8,
    reviewCount: 219,
    stock: 3,
    tags: ['sit-stand', 'hardwood'],
  },
  {
    id: 'p-004',
    slug: 'cassette-bookshelf-speaker',
    title: 'Cassette Bookshelf Speaker',
    blurb: 'Two-way near-field monitor, sold as a pair.',
    description:
      'A 19mm silk dome over a 130mm paper cone, tuned for a desk rather than a concert hall. Rear port is flared to stay quiet close to a wall.',
    priceCents: 44900,
    category: 'audio',
    hue: 198,
    rating: 4.4,
    reviewCount: 156,
    stock: 12,
    tags: ['stereo', 'near-field'],
  },
  {
    id: 'p-005',
    slug: 'form-drawer-unit',
    title: 'Form Drawer Unit',
    blurb: 'Three soft-close drawers on castors.',
    description:
      'Powder-coated steel with a felt-lined top drawer. Fits under a 62cm desk and rolls without marking a wooden floor.',
    priceCents: 27500,
    category: 'storage',
    hue: 152,
    rating: 4.2,
    reviewCount: 88,
    stock: 24,
    tags: ['steel', 'soft-close'],
  },
  {
    id: 'p-006',
    slug: 'pivot-monitor-arm',
    title: 'Pivot Monitor Arm',
    blurb: 'Gas-spring arm for displays up to 34 inches.',
    description:
      'Internal cable routing and a VESA quick-release plate. Holds 3–9kg without sag and returns to position after a nudge.',
    priceCents: 15900,
    category: 'desk',
    hue: 216,
    rating: 4.6,
    reviewCount: 640,
    stock: 0,
    tags: ['vesa', 'gas-spring'],
  },
  {
    id: 'p-007',
    slug: 'halo-floor-light',
    title: 'Halo Floor Light',
    blurb: 'Indirect uplight with a linen diffuser.',
    description:
      'Throws light at the ceiling rather than your screen, which is the entire point. Stepless dimming down to 1%.',
    priceCents: 34900,
    category: 'lighting',
    hue: 18,
    rating: 4.3,
    reviewCount: 74,
    stock: 9,
    tags: ['uplight', 'dimmable'],
  },
  {
    id: 'p-008',
    slug: 'stack-archive-boxes',
    title: 'Stack Archive Boxes',
    blurb: 'Set of four, acid-free and stackable.',
    description:
      'Rigid greyboard with cotton handles. Rated to hold 12kg stacked four high without bowing.',
    priceCents: 6900,
    category: 'storage',
    hue: 88,
    rating: 4.0,
    reviewCount: 311,
    stock: 56,
    tags: ['archival', 'set-of-4'],
  },
];

export const profile: Profile = {
  id: 'u-1',
  name: 'Dhruv Sharma',
  email: 'dhruv@example.com',
  memberSince: '2023-03-14',
  tier: 'plus',
};

export const orders: Order[] = [
  {
    id: 'ord-2291',
    placedAt: '2026-08-21T10:24:00.000Z',
    status: 'delivered',
    lines: [
      { productId: 'p-001', title: 'Aria Over-Ear Headphones', qty: 1, unitPriceCents: 32900 },
      { productId: 'p-008', title: 'Stack Archive Boxes', qty: 2, unitPriceCents: 6900 },
    ],
    totalCents: 46700,
  },
  {
    id: 'ord-2314',
    placedAt: '2026-09-02T16:41:00.000Z',
    status: 'shipped',
    lines: [
      { productId: 'p-003', title: 'Kerf Standing Desk', qty: 1, unitPriceCents: 89900 },
    ],
    totalCents: 89900,
  },
  {
    id: 'ord-2330',
    placedAt: '2026-09-11T09:05:00.000Z',
    status: 'processing',
    lines: [
      { productId: 'p-002', title: 'Meridian Desk Lamp', qty: 1, unitPriceCents: 18500 },
      { productId: 'p-006', title: 'Pivot Monitor Arm', qty: 1, unitPriceCents: 15900 },
    ],
    totalCents: 34400,
  },
  {
    id: 'ord-2101',
    placedAt: '2026-05-30T12:00:00.000Z',
    status: 'cancelled',
    lines: [
      { productId: 'p-005', title: 'Form Drawer Unit', qty: 1, unitPriceCents: 27500 },
    ],
    totalCents: 27500,
  },
];
