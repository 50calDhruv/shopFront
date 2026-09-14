import { Link, useParams } from 'react-router-dom';
import { Button, Card, CardBody, formatPrice } from '@shop/ui';
import { useEventBus } from '@shop/ui/events';
import { ProductImage } from '../components/ProductImage';
import { fetchProduct } from '../lib/api';
import { useAsync } from '../lib/useAsync';

export function ProductDetailPage() {
  // useParams works here only because react-router-dom is a federation
  // singleton — the remote reads the SAME RouterContext the shell provides.
  const { productId } = useParams<{ productId: string }>();
  const bus = useEventBus();

  const state = useAsync(
    (signal) => fetchProduct(productId ?? '', signal),
    [productId],
  );

  if (state.status === 'loading') {
    return (
      <div className="grid gap-8 md:grid-cols-2" aria-hidden="true">
        <div className="aspect-4/3 w-full animate-pulse rounded-lg bg-ink-200" />
        <div className="flex flex-col gap-3 pt-2">
          <div className="h-8 w-2/3 animate-pulse rounded bg-ink-200" />
          <div className="h-4 w-full animate-pulse rounded bg-ink-100" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-ink-100" />
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3 p-6">
          <h1 className="text-xl font-semibold text-ink-900">Product not found</h1>
          <p className="text-sm text-ink-600">{state.error.message}</p>
          {/* Relative link: back to this remote's own index, not the site root. */}
          <Link
            to=".."
            relative="path"
            className="text-sm font-medium text-brand-700 underline underline-offset-4"
          >
            Back to catalog
          </Link>
        </CardBody>
      </Card>
    );
  }

  const product = state.data;
  const soldOut = product.stock === 0;

  return (
    <article className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb">
        <Link
          to=".."
          relative="path"
          className="text-sm font-medium text-brand-700 underline underline-offset-4"
        >
          ← Catalog
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductImage title={product.title} hue={product.hue} />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold text-ink-900">{product.title}</h1>
            <p className="text-base text-ink-600">{product.blurb}</p>
          </div>

          <p className="text-2xl font-semibold tabular-nums text-ink-900">
            {formatPrice(product.priceCents)}
          </p>

          <p className="text-sm text-ink-600">{product.description}</p>

          <dl className="grid grid-cols-2 gap-3 border-t border-ink-200 pt-4 text-sm">
            <div>
              <dt className="text-ink-500">Rating</dt>
              <dd className="font-medium text-ink-900">
                {product.rating.toFixed(1)} / 5 ({product.reviewCount} reviews)
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">Availability</dt>
              <dd className="font-medium text-ink-900">
                {soldOut ? 'Sold out' : `${product.stock} in stock`}
              </dd>
            </div>
          </dl>

          <div className="flex gap-3 pt-1">
            <Button
              size="lg"
              disabled={soldOut}
              onClick={() => {
                bus.emit('cart:add', { productId: product.id, qty: 1 });
              }}
            >
              {soldOut ? 'Sold out' : 'Add to cart'}
            </Button>
          </div>

          <ul className="flex flex-wrap gap-2 pt-1">
            {product.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600"
              >
                {tag}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
