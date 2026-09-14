import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-start gap-3 py-12">
      <p className="text-sm font-medium text-brand-700">404</p>
      <h1 className="text-2xl font-semibold text-ink-900">That page does not exist</h1>
      <p className="max-w-prose text-sm text-ink-600">
        The shell owns the top-level routing table, so this is the shell&rsquo;s 404 —
        not a remote&rsquo;s. A remote renders its own not-found for unknown paths
        beneath its own prefix.
      </p>
      <Link to="/" className="text-sm font-medium text-brand-700 underline underline-offset-4">
        Back to home
      </Link>
    </div>
  );
}
