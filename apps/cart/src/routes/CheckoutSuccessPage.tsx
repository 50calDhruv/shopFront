import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardBody } from '@shop/ui';

export function CheckoutSuccessPage() {
  const [params] = useSearchParams();
  const orderId = params.get('order');

  return (
    <Card>
      <CardBody className="flex flex-col items-start gap-3 p-6">
        <span className="inline-flex h-6 items-center rounded-full bg-positive-50 px-2.5 text-xs font-semibold text-positive-600">
          Order placed
        </span>

        <h1 className="text-2xl font-semibold text-ink-900">Thanks for your order</h1>

        {orderId ? (
          <p className="text-sm text-ink-600">
            Reference <code className="font-mono text-ink-900">{orderId}</code>. The cart
            was emptied by a <code className="font-mono">cart:clear</code> event sent to
            the shell — which is why the badge in the header is already back to zero.
          </p>
        ) : null}

        <div className="flex gap-4 pt-1">
          <Link
            to="/catalog"
            className="text-sm font-medium text-brand-700 underline underline-offset-4"
          >
            Keep shopping
          </Link>
          <Link
            to="/account/orders"
            className="text-sm font-medium text-brand-700 underline underline-offset-4"
          >
            View orders
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
