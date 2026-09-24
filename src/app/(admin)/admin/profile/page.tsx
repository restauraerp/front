'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import SubscriptionCard from '@/components/billing/SubscriptionCard';
import WalkthroughCard from '@/components/walkthrough/WalkthroughCard';
import type { SubscriptionStatus } from '@/components/layout/SubscriptionBanner';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { clearTenant } from '@/lib/tenant';
import { UserCircle, Mail, LogOut, ShieldCheck, KeyRound, Eye, EyeOff } from 'lucide-react';

/** The parts of GET /auth/me this screen reads. */
type Me = {
  name?: string;
  email?: string;
  email_verified_at?: string | null;
  subscription?: SubscriptionStatus | null;
  /** The shared demo account cannot change its own password; see AuthController::me. */
  is_demo?: boolean;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<Me | null>(null);

  // Change-password form state.
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    fetchApi('/auth/me').then(setUser).catch(console.error);
  }, []);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);

    if (password.length < 8) {
      setPwError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setPwError('The two passwords do not match.');
      return;
    }

    setPwSaving(true);
    try {
      await fetchApi('/auth/password/set', {
        method: 'POST',
        body: JSON.stringify({ password, password_confirmation: confirmation }),
      });
      setPassword('');
      setConfirmation('');
      setPwDone(true);
    } catch (err) {
      setPwError(apiErrorMessage(err, 'Could not change your password.'));
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch {}
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    // Drop the tenant too, so the next login on this browser does not silently
    // inherit the previous restaurant's code.
    clearTenant();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">My Profile</h1>

      <Card title="Account Information">
        <div className="space-y-4">
          {user ? (
            <>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-base-200">
                <UserCircle className="text-primary" size={20} />
                <div>
                  <p className="text-xs text-base-content/50">Full Name</p>
                  <p className="font-semibold">{user.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-base-200">
                <Mail className="text-info" size={20} />
                <div>
                  <p className="text-xs text-base-content/50">Email Address</p>
                  <p className="font-semibold">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-base-200">
                <ShieldCheck className="text-success" size={20} />
                <div>
                  <p className="text-xs text-base-content/50">Account Status</p>
                  <p className="font-semibold">
                    {user.email_verified_at
                      ? <span className="badge badge-success badge-sm rounded-full text-white">Verified</span>
                      : <span className="badge badge-warning badge-sm rounded-full text-white">Unverified</span>}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="alert alert-warning">
              <span className="text-sm">Could not load profile data. Your session may have expired.</span>
            </div>
          )}

          <div className="pt-2">
            <button className="btn btn-error btn-outline w-full gap-2" onClick={handleLogout}>
              <LogOut size={16} />
              Log Out / Clear Session
            </button>
          </div>
        </div>
      </Card>

      {/* Password change, for real accounts only. The shared demo restaurant is
          reset on a schedule and used by everyone at once, so letting one
          visitor change its password would lock the rest out until the next
          refresh - AuthController::me sets is_demo for exactly this. */}
      {user && !user.is_demo && (
        <Card title="Change Password">
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="text-xs text-base-content/50 mb-1 block">New Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input input-bordered w-full pr-10"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPwDone(false); }}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-base-content/50 mb-1 block">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input input-bordered w-full pr-10"
                  value={confirmation}
                  onChange={(e) => { setConfirmation(e.target.value); setPwDone(false); }}
                  autoComplete="new-password"
                  placeholder="Re-enter the new password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {pwError && (
              <div className="alert alert-error py-2">
                <span className="text-sm">{pwError}</span>
              </div>
            )}
            {pwDone && (
              <div className="alert alert-success py-2">
                <span className="text-sm">Password changed. A confirmation email has been sent.</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full gap-2" disabled={pwSaving || !password || !confirmation}>
              <KeyRound size={16} />
              {pwSaving ? 'Saving…' : 'Update Password'}
            </button>
          </form>
        </Card>
      )}

      {/* Restarting the guided tour, for a demo visitor or a trial. Renders
          nothing for a paying restaurant - the same billing block that decides
          which tour to run decides whether to offer one at all. */}
      <WalkthroughCard status={user?.subscription ?? null} />

      {/* /auth/me carries the billing block alongside the user, so this needs
          no second request. */}
      <SubscriptionCard status={user?.subscription ?? null} />
    </div>
  );
}
