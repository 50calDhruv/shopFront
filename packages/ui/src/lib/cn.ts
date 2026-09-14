/**
 * Minimal class-name joiner.
 *
 * Deliberately not `clsx` + `tailwind-merge`: this package controls its own
 * variant strings, so there are no conflicting utilities to de-duplicate, and a
 * shared package that every remote bundles is exactly where you do NOT want two
 * extra dependencies. Consumer-supplied `className` is appended last so it wins
 * on equal specificity.
 */
export type ClassValue = string | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
