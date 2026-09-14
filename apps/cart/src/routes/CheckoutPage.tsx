import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, Input, formatPrice } from '@shop/ui';
import { useEventBus } from '@shop/ui/events';
import { useCartSnapshot } from '../lib/useCartSnapshot';

/**
 * SHORTCUT: a fake checkout. No payment provider, no address validation, no
 * idempotency key, no server-side price re-verification. A real checkout never
 * trusts a client-supplied total, and would make this POST idempotent so a
 * double-submit cannot charge twice.
 */
export function CheckoutPage() {
  const bus = useEventBus();
  const navigate = useNavigate();
  const { lines, subtotal } = useCartSnapshot();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailInvalid = email.length > 0 && !email.includes('@');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (emailInvalid || email.length === 0 || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lines }),
      });

      if (!response.ok) throw new Error(`Checkout failed (${response.status})`);

      const body: unknown = await response.json();
      const orderId = (body as { orderId?: unknown }).orderId;
      if (typeof orderId !== 'string') throw new Error('Malformed checkout response');

      // Tell the shell to empty the cart. Note the reason: the shell can treat a
      // post-checkout clear differently from a user pressing "Clear cart".
      bus.emit('cart:clear', { reason: 'checkout' });

      navigate(`success?order=${encodeURIComponent(orderId)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Checkout failed');
      setSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3 p-6">
          <h1 className="text-xl font-semibold text-ink-900">Nothing to check out</h1>
          <Link
            to="/catalog"
            className="text-sm font-medium text-brand-700 underline underline-offset-4"
          >
            Browse the catalog
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink-900">Checkout</h1>
        <p className="text-sm text-ink-600">
          Nothing is charged. This posts to a mocked endpoint and clears the cart.
        </p>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4 p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              label="Email for the receipt"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={emailInvalid ? 'That does not look like an email address.' : undefined}
              hint="Not sent anywhere — the API is mocked."
            />

            <div className="flex items-center justify-between border-t border-ink-200 pt-4">
              <span className="text-sm text-ink-500">Total</span>
              <span className="text-lg font-semibold tabular-nums text-ink-900">
                {formatPrice(subtotal)}
              </span>
            </div>

            {error ? (
              <p role="alert" className="text-sm font-medium text-critical-600">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={submitting}
              disabled={email.length === 0 || emailInvalid}
            >
              {submitting ? 'Placing order…' : 'Place order'}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
