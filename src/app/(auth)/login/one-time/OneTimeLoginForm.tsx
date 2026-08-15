'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import { setTenant, clearTenant } from '@/lib/tenant';
import { clearDemoSession } from '@/lib/demo';
import { UtensilsCrossed, AlertCircle } from 'lucide-react';

/**
 * Redeems the single-use link a new trial or subscription owner was emailed.
 *
 * They have never chosen a password, so the link is the credential. It is spent
 * on the API side the moment it is presented, which is why this runs once and
 * never retries: a second attempt would always fail, and retrying would only
 * make the failure look like a bug.
 */
export default function OneTimeLoginForm() {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const [failure, setFailure] = React.useState<string | null>(null);

  // A missing token is knowable during render, so it is derived rather than
  // pushed into state from an effect - which would cost an extra render and
  // trips the cascading-render lint rule.
  const error = token
    ? failure
    : 'This link is missing its code. Please use the link from your email.';

  React.useEffect(() => {
    if (!token) return;

    // React runs effects twice in development. Without this guard the second
    // run presents an already-spent token and turns a working login into an
    // error message.
    let cancelled = false;

    (async () => {
      // A demo visitor coming from the trial ready page still has the demo's
      // token and tenant cookies. Clear them before the API call so they cannot
      // bleed into subsequent authenticated requests (a stale X-Tenant-ID from
      // the demo tenant would cause a 403 on /auth/me after the new token lands).
      clearTenant();
      clearDemoSession();

      try {
        const res = await fetch(`${API_BASE_URL}/auth/one-time-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json().catch(() => null);

        if (cancelled) return;

        if (!res.ok || !data?.token) {
          setFailure(data?.message || 'This login link is no longer valid. Ask for a new one.');
          return;
        }

        // Same cookie shape the ordinary login writes, so everything
        // downstream - the proxy guard, fetchApi's Authorization header -
        // behaves identically from here on.
        document.cookie = `token=${data.token}; path=/; max-age=86400; SameSite=Lax`;

        if (data?.tenant?.slug) setTenant(data.tenant.slug);

        // They still have no password of their own; send them to choose one
        // before anything else.
        router.replace(data.must_set_password ? '/admin/set-password' : '/admin');
      } catch {
        if (!cancelled) setFailure('We could not reach the server. Please try again.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <UtensilsCrossed className="text-primary" size={26} />
          <span className="font-bold text-xl">RestoraERP</span>
        </div>

        {error ? (
          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body items-center">
              <AlertCircle className="text-error" size={28} />
              <p className="text-base-content/80">{error}</p>
              <a href="/login" className="btn btn-primary btn-sm rounded-full mt-2">
                Go to login
              </a>
            </div>
          </div>
        ) : (
          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body items-center">
              <span className="loading loading-spinner loading-lg text-primary" />
              <p className="text-base-content/70">Signing you in…</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
