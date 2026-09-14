import { useState } from 'react';
import { useEventBusSubscription } from '@shop/ui/events';
import type { CartLineSnapshot } from '@shop/ui/events';

export interface CartSnapshot {
  count: number;
  subtotal: number;
  lines: CartLineSnapshot[];
}

const EMPTY: CartSnapshot = { count: 0, subtotal: 0, lines: [] };

/**
 * The cart remote's view of cart state.
 *
 * It holds NO authoritative state of its own — it mirrors what the shell
 * broadcasts. Every mutation goes back out as a command and returns as a new
 * `cart:updated`, so there is exactly one writer and this remote can never
 * disagree with the badge in the header.
 *
 * `cart:updated` is a replay channel, so this is populated on the very first
 * subscribe rather than staying empty until the user does something.
 */
export function useCartSnapshot(): CartSnapshot {
  const [snapshot, setSnapshot] = useState<CartSnapshot>(EMPTY);

  useEventBusSubscription('cart:updated', (payload) => {
    setSnapshot({
      count: payload.count,
      subtotal: payload.subtotal,
      lines: payload.lines,
    });
  });

  return snapshot;
}
