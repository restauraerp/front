'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import { UtensilsCrossed, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const isDemo = process.env.NEXT_PUBLIC_IS_DEMO === 'true' || process.env.NEXT_PUBLIC_IS_DEMO === '"true"';
  const demoEmail = (process.env.NEXT_PUBLIC_DEMO_EMAIL || 'demo@restauraerp.com').replace(/^"|"$/g, '');
  const demoPassword = (process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'demo').replace(/^"|"$/g, '');
  
  const [email, setEmail] = useState(isDemo ? demoEmail : '');
  const [password, setPassword] = useState(isDemo ? demoPassword : '');
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
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        throw new Error('Invalid email or password. Please try again.');
      }

      const data = await res.json();
      document.cookie = `token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
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
          </form>
        </div>
      </div>
    </div>
  );
}