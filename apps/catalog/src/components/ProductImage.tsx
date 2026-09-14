import { cn } from '@shop/ui';

interface ProductImageProps {
  title: string;
  hue: number;
  className?: string;
}

/**
 * SHORTCUT: a generated gradient, not a real photograph.
 *
 * Keeps the repo offline-capable and dependency-free, and sidesteps hosting
 * images for a demo. It is genuinely better than a remote placeholder service
 * for Core Web Vitals — no extra RTT, no layout shift — but a real storefront
 * obviously ships real photos through an image CDN with srcset and AVIF.
 *
 * Decorative by definition, so aria-hidden: the product title is always
 * rendered as real text next to it, and announcing "gradient" helps nobody.
 */
export function ProductImage({ title, hue, className }: ProductImageProps) {
  const initials = title
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('');

  return (
    <div
      aria-hidden="true"
      // aspect-ratio reserves the box before paint, so the grid never shifts.
      className={cn(
        'flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-md',
        className,
      )}
      style={{
        background: `linear-gradient(135deg,
          oklch(0.88 0.09 ${hue}) 0%,
          oklch(0.72 0.14 ${hue + 18}) 100%)`,
      }}
    >
      <span className="text-2xl font-semibold text-white/85">{initials}</span>
    </div>
  );
}
