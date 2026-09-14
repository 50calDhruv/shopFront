import { Link } from 'react-router-dom';
import { Card, CardBody, formatDate } from '@shop/ui';
import { useEventBusSubscription } from '@shop/ui/events';
import { useState } from 'react';
import { fetchProfile } from '../lib/api';
import { useAsync } from '../lib/useAsync';

export function ProfilePage() {
  const state = useAsync((signal) => fetchProfile(signal), []);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  /**
   * The shell broadcasts auth changes; this remote reacts without importing the
   * shell's AuthProvider or knowing how sessions are stored. `auth:changed` is a
   * replay channel, so this is correct on first mount rather than only after the
   * user next signs in or out.
   */
  useEventBusSubscription('auth:changed', ({ userId }) => {
    setSessionUserId(userId);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink-900">Account</h1>
        <p className="text-sm text-ink-600">
          Served by the <code className="font-mono text-brand-700">account</code> remote,
          which the shell discovered at runtime rather than at build time.
        </p>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-3 p-5">
          <h2 className="text-base font-semibold text-ink-900">Session</h2>
          <p className="text-sm text-ink-600">
            {sessionUserId
              ? `Signed in as ${sessionUserId} (heard over the event bus).`
              : 'Signed out. Use the button in the header — this panel updates from the auth:changed event.'}
          </p>
        </CardBody>
      </Card>

      {state.status === 'loading' ? (
        <div className="h-32 animate-pulse rounded-lg bg-ink-200" aria-hidden="true" />
      ) : null}

      {state.status === 'error' ? (
        <Card>
          <CardBody className="p-5">
            <p className="text-sm text-critical-600">{state.error.message}</p>
          </CardBody>
        </Card>
      ) : null}

      {state.status === 'ready' ? (
        <Card>
          <CardBody className="flex flex-col gap-4 p-5">
            <h2 className="text-base font-semibold text-ink-900">Profile</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-ink-500">Name</dt>
                <dd className="text-sm font-medium text-ink-900">{state.data.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-500">Email</dt>
                <dd className="text-sm font-medium text-ink-900">{state.data.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-500">Member since</dt>
                <dd className="text-sm font-medium text-ink-900">
                  {formatDate(state.data.memberSince)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-500">Tier</dt>
                <dd className="text-sm font-medium capitalize text-ink-900">
                  {state.data.tier}
                </dd>
              </div>
            </dl>

            <Link
              to="orders"
              className="text-sm font-medium text-brand-700 underline underline-offset-4"
            >
              View order history
            </Link>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
