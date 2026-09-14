import { Link, useParams } from 'react-router-dom';
import { Card, CardBody, formatDate, formatPrice } from '@shop/ui';
import { fetchOrder } from '../lib/api';
import { useAsync } from '../lib/useAsync';

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const state = useAsync((signal) => fetchOrder(orderId ?? '', signal), [orderId]);

  if (state.status === 'loading') {
    return <div className="h-64 animate-pulse rounded-lg bg-ink-200" aria-hidden="true" />;
  }

  if (state.status === 'error') {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3 p-6">
          <h1 className="text-xl font-semibold text-ink-900">Order not found</h1>
          <p className="text-sm text-ink-600">{state.error.message}</p>
          <Link
            to=".."
            relative="path"
            className="text-sm font-medium text-brand-700 underline underline-offset-4"
          >
            Back to orders
          </Link>
        </CardBody>
      </Card>
    );
  }

  const order = state.data;

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb">
        <Link
          to=".."
          relative="path"
          className="text-sm font-medium text-brand-700 underline underline-offset-4"
        >
          ← Order history
        </Link>
      </nav>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink-900">{order.id}</h1>
        <p className="text-sm text-ink-600">
          Placed {formatDate(order.placedAt)} · <span className="capitalize">{order.status}</span>
        </p>
      </div>

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <caption className="sr-only">Items in order {order.id}</caption>
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs text-ink-500">
                <th scope="col" className="px-4 py-3 font-medium">Item</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Qty</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.productId} className="border-b border-ink-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink-900">{line.title}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-600">{line.qty}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-900">
                    {formatPrice(line.unitPriceCents * line.qty)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-ink-200">
                <th scope="row" colSpan={2} className="px-4 py-3 text-left font-medium text-ink-600">
                  Total
                </th>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-900">
                  {formatPrice(order.totalCents)}
                </td>
              </tr>
            </tfoot>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
