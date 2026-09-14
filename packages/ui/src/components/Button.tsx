import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks interaction without collapsing layout. */
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-subtle',
  secondary:
    'bg-ink-0 text-ink-900 ring-1 ring-inset ring-ink-300 hover:bg-ink-50 active:bg-ink-100',
  ghost: 'bg-transparent text-ink-700 hover:bg-ink-100 active:bg-ink-200',
  danger:
    'bg-critical-600 text-white hover:bg-critical-500 active:bg-critical-600 shadow-subtle',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};

/**
 * Always a real <button>. If you need navigation, use an <a>/<Link> — swapping
 * the element for styling reasons breaks keyboard semantics and screen readers.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = disabled === true || loading;

  return (
    <button
      ref={ref}
      // Buttons inside a <form> default to submit; that surprise has caused more
      // accidental navigations than it has saved keystrokes. Opt in explicitly.
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium',
        'select-none whitespace-nowrap',
        // Spring easing + a small press displacement: the button should feel
        // like it physically takes the press, not like it swapped colour.
        'transition-[transform,background-color,box-shadow] duration-200 [transition-timing-function:var(--ease-spring)]',
        'active:scale-[0.97] motion-reduce:active:scale-100',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          // Decorative: the aria-busy state above is what gets announced.
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );
});
