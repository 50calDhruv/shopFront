import { NavLink } from 'react-router-dom';
import { Button, cn } from '@shop/ui';
import { CartBadge } from './CartBadge';
import { useAuth } from '../providers/AuthProvider';

const NAV_ITEMS = [
  { to: '/catalog', label: 'Catalog' },
  { to: '/cart', label: 'Cart' },
  { to: '/account', label: 'Account' },
] as const;

export function SiteHeader() {
  const { user, signIn, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-ink-0/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <NavLink
          to="/"
          className="mr-2 text-base font-semibold tracking-tight text-ink-900"
        >
          Shop<span className="text-brand-600">Front</span>
        </NavLink>

        {/* Landmark + accessible name: a page may have several navs. */}
        <nav aria-label="Primary" className="flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative inline-flex h-9 items-center rounded-md px-3 text-sm font-medium',
                  'transition-colors duration-150',
                  isActive
                    ? 'text-brand-700'
                    : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {item.to === '/cart' ? <CartBadge /> : null}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600',
                      'origin-center transition-transform duration-300 [transition-timing-function:var(--ease-spring)]',
                      isActive ? 'scale-x-100' : 'scale-x-0',
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-ink-600 sm:inline">
                Hi, {user.name}
              </span>
              <Button variant="secondary" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => signIn('Dhruv')}>
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
