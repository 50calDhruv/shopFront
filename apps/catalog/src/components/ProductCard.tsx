import { Link } from 'react-router-dom';
import { Button, Card, formatPrice } from '@shop/ui';
import { useEventBus } from '@shop/ui/events';
import type { Product } from '@shop/mocks';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const bus = useEventBus();
  const soldOut = product.stock === 0;

  return (
    <Card interactive className="flex h-full w-full flex-col overflow-hidden">
      {/*
        shrink-0 is load-bearing. The grid stretches every card in a row to the
        tallest one, and this wrapper is a flex child — without it the image box
        absorbs the leftover space and each card's image ends up a different
        height, so titles and prices stop aligning across the row. aspect-ratio
        alone does not win that fight; flex sizing runs first.
      */}
      <div className="shrink-0 p-3 pb-0">
        <ProductImage title={product.title} hue={product.hue} />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="text-base font-semibold text-ink-900">
          {/*
            The link — not the Card — is the interactive element. `after:absolute
            after:inset-0` stretches its hit area over the whole card, so the
            mouse gets a big target while keyboard and screen readers still get
            a single, properly-labelled link.
          */}
          <Link
            to={product.slug}
            className="after:absolute after:inset-0 hover:text-brand-700"
          >
            {product.title}
          </Link>
        </h3>

        <p className="flex-1 text-sm text-ink-600">{product.blurb}</p>

        <div className="flex items-center justify-between pt-2">
          <span className="text-base font-semibold tabular-nums text-ink-900">
            {formatPrice(product.priceCents)}
          </span>
          <span className="text-xs text-ink-500">
            {product.rating.toFixed(1)} ★ ({product.reviewCount})
          </span>
        </div>
      </div>

      <div className="relative z-10 border-t border-ink-200 p-3">
        <Button
          fullWidth
          size="sm"
          disabled={soldOut}
          /**
           * THE CROSS-REMOTE CALL (requirement #3).
           *
           * This remote does not import the cart remote, the shell's
           * CartProvider, or anything that knows how a cart works. It publishes
           * a typed message and stops caring. The shell reduces it and updates
           * the badge; if the cart remote has never loaded, this still works.
           */
          onClick={() => {
            bus.emit('cart:add', { productId: product.id, qty: 1 });
          }}
        >
          {soldOut ? 'Sold out' : 'Add to cart'}
        </Button>
      </div>
    </Card>
  );
}
