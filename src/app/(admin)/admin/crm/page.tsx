'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { fetchApi } from '@/lib/api';
import { Users, CalendarDays, Gift } from 'lucide-react';

export default function CRMDashboard() {
  const [stats, setStats] = useState({ customers: 0, reservations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [custRes, resRes] = await Promise.all([
          fetchApi('/customers?per_page=1').catch(() => null),
          fetchApi('/reservations?per_page=1').catch(() => null)
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
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">CRM & Bookings</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title={<div className="flex items-center gap-2"><Users className="text-primary" size={20} /> Customers</div>}>
          <div className="mb-4">
            <p className="text-base-content/70 mb-2">Manage your customer database and loyalty points.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.customers} <span className="text-sm font-normal text-base-content/60">Customers</span></div>
            )}
          </div>
          <Link href="/admin/crm/customers" className="text-primary font-medium hover:underline inline-flex items-center gap-1">Manage Customers &rarr;</Link>
        </Card>

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

        <Card title={<div className="flex items-center gap-2"><Gift className="text-primary" size={20} /> Loyalty Settings</div>}>
          <div className="mb-4">
            <p className="text-base-content/70 mb-2">Configure loyalty tiers and point conversion rates.</p>
            {/* Invisible placeholder block to keep card height symmetrical */}
            <div className="text-3xl font-bold text-primary opacity-0 pointer-events-none">0</div>
          </div>
          <Link href="/admin/crm/loyalty" className="text-primary font-medium hover:underline inline-flex items-center gap-1">Loyalty Settings &rarr;</Link>
        </Card>
      </div>
    </div>
  );
}