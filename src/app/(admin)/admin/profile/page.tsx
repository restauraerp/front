'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { fetchApi } from '@/lib/api';
import { UserCircle, Mail, LogOut, ShieldCheck } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchApi('/auth/me').then(setUser).catch(console.error);
  }, []);

  const handleLogout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch {}
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
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
    </div>
  );
}
