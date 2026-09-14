import { Link } from 'react-router-dom';
import { Card, CardBody, formatDate, formatPrice, cn } from '@shop/ui';
import type { OrderStatus } from '@shop/mocks';
import { fetchOrders } from '../lib/api';
import { useAsync } from '../lib/useAsync';

const STATUS_STYLES: Record<OrderStatus, string> = {
  delivered: 'bg-positive-50 text-positive-600',
  shipped: 'bg-brand-50 text-brand-700',
  processing: 'bg-caution-50 text-caution-600',
  cancelled: 'bg-ink-100 text-ink-500',
};

export function OrdersPage() {
  const state = useAsync((signal) => fetchOrders(signal), []);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb">
        <Link
          to=".."
          relative="path"
          className="text-sm font-medium text-brand-700 underline underline-offset-4"
        >
          ← Account
        </Link>
      </nav>

      <h1 className="text-2xl font-semibold text-ink-900">Order history</h1>

      {state.status === 'loading' ? (
        <div className="flex flex-col gap-3" aria-hidden="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-ink-200" />
          ))}
        </div>
      ) : null}

      {state.status === 'error' ? (
        <Card>
          <CardBody className="p-5">
            <p className="text-sm text-critical-600">{state.error.message}</p>
          </CardBody>
        </Card>
      ) : null}

      {state.status === 'ready' ? (
        <ul className="flex flex-col gap-3">
          {state.data.map((order) => (
            <li key={order.id}>
              <Card interactive>
                <CardBody className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-40 flex-1">
                    <h2 className="text-sm font-semibold text-ink-900">
                      <Link
                        to={order.id}
                        className="after:absolute after:inset-0 hover:text-brand-700"
                      >
                        {order.id}
                      </Link>
                    </h2>
                    <p className="text-xs text-ink-500">{formatDate(order.placedAt)}</p>
                  </div>

                  <span
                    className={cn(
                      'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold capitalize',
                      STATUS_STYLES[order.status],
                    )}
                  >
                    {order.status}
                  </span>

                  <p className="text-sm text-ink-500">
                    {order.lines.length} {order.lines.length === 1 ? 'item' : 'items'}
                  </p>

                  <p className="w-24 text-right text-sm font-semibold tabular-nums text-ink-900">
                    {formatPrice(order.totalCents)}
                  </p>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
