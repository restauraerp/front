'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api';
import { getSavedTenant, setTenant } from '@/lib/tenant';
import { DEMO_PARAM } from '@/lib/demo';
import { UtensilsCrossed, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();

  // Demo is requested per visit, via ?demo=true - it is not a property of this
  // build. The credentials come from the API (GET demo-config, which 404s
  // unless the API has DEMO_MODE on), so nothing demo-related ships in this
  // bundle and rotating the demo password never needs a rebuild here.
  const params = useSearchParams();
  const demoRequested = params.get(DEMO_PARAM) === 'true';

  // Set when the app threw away a session the API had stopped recognising -
  // most often because the demo restaurant was rebuilt underneath it. Saying so
  // matters: without it somebody who was signed in a moment ago is dumped at a
  // login screen for no visible reason and assumes the app is broken.
  const sessionExpired = params.get('expired') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Email addresses are unique per restaurant, not across the platform, so the
  // credentials alone do not identify a user - the restaurant code has to go
  // with them. Starts empty: it is filled below either from the demo config or
  // from the code this browser last signed in with. It is explicitly NOT seeded
  // from NEXT_PUBLIC_TENANT_ID, which is the public storefront's restaurant and
  // has nothing to do with whose staff is signing in.
  const [tenant, setTenantCode] = useState('');

  React.useEffect(() => {
    if (!demoRequested) {
      // Returning staff get their own restaurant back, so an ordinary login
      // stays as few keystrokes as it was.
      const saved = getSavedTenant();
      if (saved) setTenantCode(saved);

      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/demo-config`, {
          headers: { Accept: 'application/json' },
        });

        // 404 means this deployment is not a demo. Nothing to say about it -
        // leave the form empty and let the visitor type their own credentials.
        if (!res.ok || cancelled) return;

        const demo = await res.json();
        if (cancelled) return;

        if (demo.tenant) setTenantCode(demo.tenant);
        if (demo.email) setEmail(demo.email);
        if (demo.password) setPassword(demo.password);
      } catch {
        // Same as a 404: the form simply stays as the visitor found it.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [demoRequested]);

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // This request is unauthenticated by definition, so the header is the
          // only thing telling the API which restaurant to look the email up in.
          ...(tenant ? { 'X-Tenant-ID': tenant } : {}),
        },
        body: JSON.stringify({ email, password })
      });

      if (res.status === 400) {
        throw new Error('Please enter your restaurant code.');
      }

      if (!res.ok) {
        throw new Error('Invalid email or password. Please try again.');
      }

      const data = await res.json();
      document.cookie = `token=${data.token}; path=/; max-age=86400; SameSite=Lax`;

      // Persist the tenant the API actually resolved (it may differ in case or
      // have been given as a numeric id) so every later request agrees with it.
      setTenant(data.tenant?.slug || tenant);

      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          {/* Brand */}
          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
              <UtensilsCrossed className="text-primary-content" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-base-content">RestoraERP</h1>
            <p className="text-sm text-base-content/50">Staff Portal Login</p>
          </div>

          {sessionExpired && !error && (
            <div className="alert alert-warning mb-4">
              <AlertCircle size={16} />
              <span className="text-sm">
                {demoRequested
                  ? 'The demo was rebuilt, so the old sign-in no longer works. The details below are the current ones.'
                  : 'Your session has expired. Please sign in again.'}
              </span>
            </div>
          )}

          {/* Error alert */}
          {error && (
            <div className="alert alert-error mb-4">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="form-control" suppressHydrationWarning>
              <label className="label">
                <span className="label-text font-medium">Restaurant Code</span>
              </label>
              <input
                className="input input-bordered w-full"
                type="text"
                placeholder="your-restaurant"
                value={tenant}
                onChange={(e) => setTenantCode(e.target.value.trim())}
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                suppressHydrationWarning
              />
            </div>

            <div className="form-control" suppressHydrationWarning>
              <label className="label">
                <span className="label-text font-medium">Email Address</span>
              </label>
              <input
                className="input input-bordered w-full"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                suppressHydrationWarning
              />
            </div>

            <div className="form-control" suppressHydrationWarning>
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <div className="relative">
                <input
                  className="input input-bordered w-full pr-10"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  suppressHydrationWarning
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-base-content/50 hover:text-base-content focus:outline-none cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full mt-2"
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <>
                  <LogIn size={16} />
                  Login to Dashboard
                </>
              )}
            </button>

            {/* Hidden for a demo visit: the demo credentials are filled in
                above and published on the marketing site, so a reset link is
                both pointless and refused by the API. */}
            {!demoRequested && (
              <Link href="/forgot-password" className="link link-hover text-sm text-center text-base-content/60">
                Forgot your password?
              </Link>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
