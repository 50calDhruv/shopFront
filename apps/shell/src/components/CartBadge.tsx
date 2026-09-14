import { cn } from '@shop/ui';
import { useCart } from '../providers/CartProvider';

/**
 * Rendered by the SHELL, updated by an event fired inside the CATALOG remote.
 * This is requirement #3's canonical case, and the reason cart state lives in
 * the shell: this badge stays correct with the cart remote unloaded or broken.
 */
export function CartBadge() {
  const { count } = useCart();

  return (
    <>
      <span
        aria-hidden={count === 0 ? 'true' : undefined}
        className={cn(
          'ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5',
          'text-xs font-semibold tabular-nums',
          'transition-[transform,background-color] duration-300 [transition-timing-function:var(--ease-spring)]',
          count > 0
            ? 'scale-100 bg-brand-600 text-white'
            : 'scale-75 bg-ink-200 text-ink-500',
        )}
        // `key` restarts the spring on every change, so the badge visibly
        // reacts to a cross-remote event instead of silently swapping digits.
        key={count}
      >
        {count}
      </span>

      {/* Announced to screen readers on change; the visual badge alone is not
          perceivable non-visually. Kept out of the tab order deliberately. */}
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {count === 1 ? '1 item in cart' : `${count} items in cart`}
      </span>
    </>
  );
}
