'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { fetchApi } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import { Users, CalendarDays, Gift } from 'lucide-react';

export default function CRMDashboard() {
  const [stats, setStats] = useState({ customers: 0, reservations: 0 });
  const [loading, setLoading] = useState(true);
  // Starter holds view_crm for its customer list alone; reservations and
  // loyalty stay behind the module gate and answer 403. Ask about the specific
  // permission rather than about the section.
  const { loaded, can } = usePermissions();
  // Gated on `loaded` too, so the paid cards are never painted for a moment
  // and then pulled away once /auth/me answers.
  const hasBookings = loaded && can('manage_loyalty_settings');

  useEffect(() => {
    async function loadStats() {
      try {
        const [custRes, resRes] = await Promise.all([
          fetchApi('/customers?per_page=1').catch(() => null),
          // Not asked for at all without the entitlement - the call would only
          // ever 403, and a console full of them hides real errors.
          hasBookings ? fetchApi('/reservations?per_page=1').catch(() => null) : null,
        ]);

        const getCount = (res: any) => res?.total || res?.meta?.total || (Array.isArray(res?.data) ? res.data.length : 0) || (Array.isArray(res) ? res.length : 0) || 0;

        setStats({
          customers: getCount(custRes),
          reservations: getCount(resRes),
        });
      } catch (error) {
        console.error("Failed to load crm stats", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [hasBookings]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">{hasBookings ? 'CRM & Bookings' : 'Customers'}</h1>
      <div className={`grid grid-cols-1 gap-6 ${hasBookings ? 'md:grid-cols-3' : 'md:grid-cols-1 max-w-md'}`}>
        <Card title={<div className="flex items-center gap-2"><Users className="text-primary" size={20} /> Customers</div>}>
          <div className="mb-4">
            <p className="text-base-content/70 mb-2">{hasBookings ? 'Manage your customer database and loyalty points.' : 'Search, browse and export your customer database.'}</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.customers} <span className="text-sm font-normal text-base-content/60">Customers</span></div>
            )}
          </div>
          <Link href="/admin/crm/customers" className="text-primary font-medium hover:underline inline-flex items-center gap-1">Manage Customers &rarr;</Link>
        </Card>

        {hasBookings && (
        <Card title={<div className="flex items-center gap-2"><CalendarDays className="text-primary" size={20} /> Reservations</div>}>
          <div className="mb-4">
            <p className="text-base-content/70 mb-2">View and manage table and hall reservations.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.reservations} <span className="text-sm font-normal text-base-content/60">Bookings</span></div>
            )}
          </div>
          <Link href="/admin/crm/reservations" className="text-primary font-medium hover:underline inline-flex items-center gap-1">Manage Reservations &rarr;</Link>
        </Card>
        )}

        {hasBookings && (
        <Card title={<div className="flex items-center gap-2"><Gift className="text-primary" size={20} /> Loyalty Settings</div>}>
          <div className="mb-4">
            <p className="text-base-content/70 mb-2">Configure loyalty tiers and point conversion rates.</p>
            {/* Invisible placeholder block to keep card height symmetrical */}
            <div className="text-3xl font-bold text-primary opacity-0 pointer-events-none">0</div>
          </div>
          <Link href="/admin/crm/loyalty" className="text-primary font-medium hover:underline inline-flex items-center gap-1">Loyalty Settings &rarr;</Link>
        </Card>
        )}
      </div>
    </div>
  );
}