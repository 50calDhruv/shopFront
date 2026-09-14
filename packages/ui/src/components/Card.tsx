import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover elevation. Purely visual — it does NOT make the card clickable. */
  interactive?: boolean;
  children: ReactNode;
}

/**
 * A surface, not a control.
 *
 * Card never attaches onClick. A clickable card is an accessibility trap: it is
 * unreachable by keyboard and announces nothing. Put a real <a> or <button>
 * inside instead and let it stretch over the card with `after:absolute
 * after:inset-0` — the whole card becomes the hit target while the focusable,
 * announceable element stays a real link or button.
 */
export function Card({ interactive = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'relative rounded-lg bg-ink-0 ring-1 ring-ink-200',
        'transition-[box-shadow,transform] duration-200 [transition-timing-function:var(--ease-spring)]',
        interactive &&
          'hover:-translate-y-0.5 hover:shadow-raised motion-reduce:hover:translate-y-0',
        // When a nested link is focused, elevate the whole card so the focus
        // target reads as the card, matching what the mouse hover does.
        interactive && 'focus-within:-translate-y-0.5 focus-within:shadow-raised',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col gap-1 p-4 pb-0', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    // h3 by default: cards nearly always sit under a section heading. Override
    // with `as` at the call site if the outline demands a different level.
    <h3 className={cn('text-lg font-semibold text-ink-900', className)} {...rest}>
      {children}
    </h3>
  );
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-4 text-sm text-ink-600', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-2 border-t border-ink-200 p-4', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
