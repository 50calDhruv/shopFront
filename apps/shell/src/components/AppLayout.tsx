import { Outlet } from 'react-router-dom';
import { SiteHeader } from './SiteHeader';

/**
 * The shell's chrome. Everything here stays on screen and fully usable no matter
 * what happens inside <Outlet /> — that is the whole point of failure isolation.
 */
export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* First focusable element on the page. Keyboard users should not have to
          tab through the entire nav on every route change. */}
      <a
        href="#main"
        className={
          'sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 ' +
          'focus:rounded-md focus:bg-ink-0 focus:px-4 focus:py-2 focus:text-sm ' +
          'focus:font-medium focus:shadow-overlay'
        }
      >
        Skip to content
      </a>

      <SiteHeader />

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-ink-200 bg-ink-0">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-xs text-ink-500">
          <p>
            Shop-Front — a micro-frontend reference build. Module Federation,
            shared singletons, cross-remote events, failure isolation.
          </p>
          <p>Mocked API via MSW. No real backend, no real payments.</p>
        </div>
      </footer>
    </div>
  );
}
