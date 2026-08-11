'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { KeyRound, AlertCircle, Eye, EyeOff } from 'lucide-react';

/**
 * Where an owner who arrived through a one-time link chooses a password.
 *
 * Their account was provisioned with a random one nobody was ever told, so
 * until this is done the only way back in is another emailed link.
 */
export default function SetPassword() {
  const router = useRouter();

  const [password, setPassword] = React.useState('');
  const [confirmation, setConfirmation] = React.useState('');
  // One toggle per field, so revealing the confirmation does not also
  // uncover the password above it.
  const [reveal, setReveal] = React.useState(false);
  const [revealConfirmation, setRevealConfirmation] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirmation.length > 0 && password !== confirmation;
  const canSubmit = password.length >= 8 && password === confirmation && !saving;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setError(null);

    try {
      await fetchApi('/auth/password/set', {
        method: 'POST',
        body: JSON.stringify({ password, password_confirmation: confirmation }),
      });

      router.replace('/admin');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : null;
      setError(message || 'We could not set your password. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <KeyRound className="text-primary" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold">Choose a password</h1>
          <p className="text-base-content/60 text-sm">
            Set one now so you can sign in normally from next time.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-4" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={submit} className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-4">
          <div>
            <label htmlFor="password" className="label font-semibold">
              New password
            </label>
            <div className="relative">
              <input
                id="password"
                type={reveal ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`input input-bordered w-full pr-11 ${tooShort ? 'input-error' : ''}`}
                required
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                aria-label={reveal ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50"
              >
                {reveal ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className={`text-sm mt-1.5 ${tooShort ? 'text-error' : 'text-base-content/60'}`}>
              At least 8 characters.
            </p>
          </div>

          <div>
            <label htmlFor="confirmation" className="label font-semibold">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmation"
                type={revealConfirmation ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className={`input input-bordered w-full pr-11 ${mismatch ? 'input-error' : ''}`}
                required
              />
              {/* Its own toggle, independent of the field above: checking what
                  you retyped should not also expose the first box to whoever is
                  standing behind you. */}
              <button
                type="button"
                onClick={() => setRevealConfirmation((v) => !v)}
                aria-label={revealConfirmation ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50"
              >
                {revealConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {mismatch && <p className="text-sm mt-1.5 text-error">The two passwords do not match.</p>}
          </div>

          <button type="submit" disabled={!canSubmit} className="btn btn-primary w-full">
            {saving ? 'Saving…' : 'Save password'}
          </button>
        </div>
      </form>
    </div>
  );
}
