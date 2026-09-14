import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  /** Required. Every control needs a label — pass `labelHidden` to hide it visually. */
  label: string;
  labelHidden?: boolean;
  hint?: ReactNode;
  error?: string;
  id?: string;
}

/**
 * Label, hint and error are wired with useId so the association survives being
 * rendered many times on a page. `aria-describedby` points at whichever of
 * hint/error actually exists, and `aria-invalid` drives both styling and the
 * screen-reader announcement, so the two can never disagree.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, labelHidden = false, hint, error, className, id, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const describedBy =
    cn(hint ? hintId : null, error ? errorId : null).trim() || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className={cn(
          'text-sm font-medium text-ink-800',
          // Visually hidden, still announced. Never use display:none for a label.
          labelHidden && 'sr-only',
        )}
      >
        {label}
      </label>

      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-10 w-full rounded-md bg-ink-0 px-3 text-sm text-ink-900',
          'ring-1 ring-inset ring-ink-300 placeholder:text-ink-400',
          'transition-[box-shadow,background-color] duration-150 [transition-timing-function:var(--ease-standard)]',
          'hover:ring-ink-400',
          'disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-500',
          error && 'ring-critical-500 hover:ring-critical-500',
          className,
        )}
        {...rest}
      />

      {hint && !error ? (
        <p id={hintId} className="text-xs text-ink-500">
          {hint}
        </p>
      ) : null}

      {error ? (
        // role="alert" so a validation failure is announced when it appears.
        <p id={errorId} role="alert" className="text-xs font-medium text-critical-600">
          {error}
        </p>
      ) : null}
    </div>
  );
});
