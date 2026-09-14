import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useEventBus } from '@shop/ui/events';

export interface SessionUser {
  id: string;
  name: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  signIn: (name: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'shop-front:session';

function readStoredSession(): SessionUser | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    // External input — never trust the shape just because we wrote it. A user
    // can edit localStorage, and a stale schema from an older deploy is real.
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'id' in parsed &&
      'name' in parsed &&
      typeof (parsed as { id: unknown }).id === 'string' &&
      typeof (parsed as { name: unknown }).name === 'string'
    ) {
      return parsed as SessionUser;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * SHORTCUT — NOT PRODUCTION.
 * This is a localStorage flag, not authentication. There is no token, no expiry,
 * no server validation, and anyone can grant themselves a session from devtools.
 * It exists so the account remote has a session to react to. A real shell would
 * hold an httpOnly-cookie session and expose only derived, non-secret claims.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const bus = useEventBus();
  const [user, setUser] = useState<SessionUser | null>(() => readStoredSession());

  // Broadcast session changes so remotes can refetch or clear user-scoped data
  // without the shell needing to know which remotes exist.
  useEffect(() => {
    bus.emit('auth:changed', { userId: user?.id ?? null });
  }, [bus, user]);

  const signIn = useCallback((name: string) => {
    const next: SessionUser = { id: 'u-1', name };
    setUser(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, signIn, signOut }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) {
    throw new Error('useAuth() must be used inside <AuthProvider>');
  }
  return value;
}
