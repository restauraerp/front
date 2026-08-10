'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api';
import { getSavedTenant } from '@/lib/tenant';
import { UtensilsCrossed, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * "I have forgotten my password."
 *
 * The API answers the same way whether or not the address has an account, so
 * this screen does too: it shows the same confirmation either way. Saying "no
 * account with that address" would turn an unauthenticated form into a way to
 * test, one address at a time, which restaurants are customers of ours.
 */
export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The restaurant this browser last signed in with. Only needed when one
  // address owns more than one restaurant, but pre-filling it costs the
  // customer nothing and saves the ambiguous case.
  //
  // Read in a lazy initialiser guarded for the server, where localStorage does
  // not exist. The field carries suppressHydrationWarning, as the login form's
  // do, because the server necessarily renders it empty.
  const [tenant, setTenant] = useState(() =>
    typeof window === 'undefined' ? '' : (getSavedTenant() ?? ''),
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/password/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, restaurant_code: tenant || undefined }),
      });

      if (res.status === 429) {
        setError('Too many attempts. Please wait a minute and try again.');
        return;
      }

      if (!res.ok) {
        setError('Something went wrong. Please try again, or contact us if it keeps happening.');
        return;
      }

      setSent(true);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
              <UtensilsCrossed className="text-primary-content" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-base-content">RestoraERP</h1>
            <p className="text-sm text-base-content/50">Reset your password</p>
          </div>

          {sent ? (
            <>
              <div className="alert alert-success mb-4">
                <CheckCircle2 size={18} className="shrink-0" />
                <span className="text-sm">
                  If <span className="font-semibold break-all">{email}</span> has an
                  account, a reset link is on its way to it.
                </span>
              </div>

              <p className="text-sm text-base-content/60 mb-4">
                The link works once and expires within a day. Check your spam
                folder if it has not arrived in a few minutes.
              </p>

              <Link href="/login" className="btn btn-primary w-full gap-2">
                <ArrowLeft size={16} />
                Back to login
              </Link>
            </>
          ) : (
            <>
              {error && (
                <div className="alert alert-error mb-4">
                  <AlertCircle size={16} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <p className="text-sm text-base-content/60 mb-2">
                Enter the email address on your account and we will send you a
                link for setting a new password.
              </p>

              <form onSubmit={submit} className="flex flex-col gap-4">
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
                    autoFocus
                    suppressHydrationWarning
                  />
                </div>

                <div className="form-control" suppressHydrationWarning>
                  <label className="label">
                    <span className="label-text font-medium">
                      Restaurant Code
                      <span className="font-normal text-base-content/50"> (if you know it)</span>
                    </span>
                  </label>
                  <input
                    className="input input-bordered w-full"
                    type="text"
                    placeholder="your-restaurant"
                    value={tenant}
                    onChange={(e) => setTenant(e.target.value.trim())}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    suppressHydrationWarning
                  />
                  <span className="label-text-alt text-base-content/50 mt-1.5">
                    Only needed if the same address is used at more than one
                    restaurant.
                  </span>
                </div>

                <button type="submit" className="btn btn-primary w-full mt-2" disabled={loading}>
                  {loading ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <>
                      <Mail size={16} />
                      Send reset link
                    </>
                  )}
                </button>

                <Link href="/login" className="btn btn-ghost btn-sm gap-2">
                  <ArrowLeft size={14} />
                  Back to login
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
