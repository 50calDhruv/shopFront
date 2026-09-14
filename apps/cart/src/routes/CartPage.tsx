import { Link } from 'react-router-dom';
import { Button, Card, CardBody, formatPrice } from '@shop/ui';
import { useEventBus } from '@shop/ui/events';
import { useCartSnapshot } from '../lib/useCartSnapshot';

export function CartPage() {
  const bus = useEventBus();
  const { lines, subtotal, count } = useCartSnapshot();

  if (lines.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-ink-900">Your cart</h1>
        <Card>
          <CardBody className="flex flex-col items-start gap-3 p-6">
            <p className="text-sm text-ink-600">Your cart is empty.</p>
            <Link
              to="/catalog"
              className="text-sm font-medium text-brand-700 underline underline-offset-4"
            >
              Browse the catalog
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Your cart</h1>
        <p className="text-sm text-ink-500">
          {count} {count === 1 ? 'item' : 'items'}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {lines.map((line) => (
          <li key={line.productId}>
            <Card>
              <CardBody className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-48 flex-1">
                  <p className="text-sm font-semibold text-ink-900">
                    {/* null title means the shell is still resolving details. */}
                    {line.title ?? 'Loading…'}
                  </p>
                  <p className="font-mono text-xs text-ink-500">{line.productId}</p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={`Decrease quantity of ${line.title ?? line.productId}`}
                    onClick={() =>
                      bus.emit('cart:setQty', {
                        productId: line.productId,
                        qty: line.qty - 1,
                      })
                    }
                  >
                    −
                  </Button>

                  {/* aria-live so a quantity change is announced, not silent. */}
                  <span
                    aria-live="polite"
                    className="min-w-10 text-center text-sm font-medium tabular-nums text-ink-900"
                  >
                    {line.qty}
                  </span>

                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={`Increase quantity of ${line.title ?? line.productId}`}
                    onClick={() =>
                      bus.emit('cart:setQty', {
                        productId: line.productId,
                        qty: line.qty + 1,
                      })
                    }
                  >
                    +
                  </Button>
                </div>

                <p className="w-24 text-right text-sm font-semibold tabular-nums text-ink-900">
                  {line.unitPriceCents === null
                    ? '—'
                    : formatPrice(line.unitPriceCents * line.qty)}
                </p>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => bus.emit('cart:remove', { productId: line.productId })}
                >
                  Remove
                </Button>
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-ink-500">Subtotal</p>
            <p className="text-xl font-semibold tabular-nums text-ink-900">
              {formatPrice(subtotal)}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => bus.emit('cart:clear', { reason: 'user' })}
            >
              Clear cart
            </Button>
            {/* Relative: resolves under whatever prefix the shell mounted us at. */}
            <Link
              to="checkout"
              className={
                'inline-flex h-10 items-center rounded-md bg-brand-600 px-4 text-sm ' +
                'font-medium text-white shadow-subtle transition-[transform,background-color] ' +
                'duration-200 [transition-timing-function:var(--ease-spring)] ' +
                'hover:bg-brand-700 active:scale-[0.97] motion-reduce:active:scale-100'
              }
            >
              Checkout
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
