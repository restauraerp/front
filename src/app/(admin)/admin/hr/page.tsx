'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { fetchApi } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import { Users, CalendarCheck, CalendarOff, Banknote, Shield } from 'lucide-react';

export default function HROverview() {
  const [stats, setStats] = useState({ employees: 0, attendances: 0, leaves: 0, payrolls: 0, roles: 0 });
  const [loading, setLoading] = useState(true);
  // Starter holds view_hr so it can hire and give a new waiter a login.
  // Attendance, leave and payroll are what the HR module is sold for and stay
  // behind the gate; their endpoints answer 403. Gated on `loaded` as well so
  // the paid cards are never painted and then pulled away.
  const { loaded, can } = usePermissions();
  const hasFullHr = loaded && can('manage_payroll');

  useEffect(() => {
    async function loadStats() {
      try {
        // The three gated endpoints are not called without the entitlement:
        // they would only ever 403, and a console full of them hides real errors.
        const [empRes, attRes, leaveRes, payRes, rolesRes] = await Promise.all([
          fetchApi('/users?per_page=1').catch(() => null),
          hasFullHr ? fetchApi('/attendances?per_page=1').catch(() => null) : null,
          hasFullHr ? fetchApi('/leaves?per_page=1').catch(() => null) : null,
          hasFullHr ? fetchApi('/payrolls?per_page=1').catch(() => null) : null,
          fetchApi('/roles?per_page=1').catch(() => null)
        ]);

        const getCount = (res: any) => res?.total || res?.meta?.total || (Array.isArray(res?.data) ? res.data.length : 0) || (Array.isArray(res) ? res.length : 0) || 0;

        setStats({
          employees: getCount(empRes),
          attendances: getCount(attRes),
          leaves: getCount(leaveRes),
          payrolls: getCount(payRes),
          roles: getCount(rolesRes),
        });
      } catch (error) {
        console.error("Failed to load HR stats", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [hasFullHr]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">{hasFullHr ? 'Human Resource Management' : 'Staff'}</h1>
      <div className={`grid grid-cols-1 gap-6 ${hasFullHr ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 max-w-3xl'}`}>
        
        <Card title={<div className="flex items-center gap-2"><Users className="text-primary" size={20} /> Employees</div>}>
          <div className="mb-4">
            <p className="text-base-content/70 mb-2 text-sm">Manage staff accounts, roles, and profiles.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.employees} <span className="text-sm font-normal text-base-content/60">Total</span></div>
            )}
          </div>
          <Link href="/admin/hr/employees" className="text-primary font-medium hover:underline inline-flex items-center gap-1 text-sm">Manage Employees &rarr;</Link>
        </Card>

        {hasFullHr && (
        <Card title={<div className="flex items-center gap-2"><CalendarCheck className="text-primary" size={20} /> Attendance</div>}>
          <div className="mb-4">
            <p className="text-base-content/70 mb-2 text-sm">Track daily check-ins and check-outs.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.attendances} <span className="text-sm font-normal text-base-content/60">Logs</span></div>
            )}
          </div>
          <Link href="/admin/hr/attendance" className="text-primary font-medium hover:underline inline-flex items-center gap-1 text-sm">View Attendance &rarr;</Link>
        </Card>
        )}

        {hasFullHr && (
        <Card title={<div className="flex items-center gap-2"><CalendarOff className="text-primary" size={20} /> Leaves</div>}>
          <div className="mb-4">
            <p className="text-base-content/70 mb-2 text-sm">Manage employee time-off requests.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.leaves} <span className="text-sm font-normal text-base-content/60">Requests</span></div>
            )}
          </div>
          <Link href="/admin/hr/leaves" className="text-primary font-medium hover:underline inline-flex items-center gap-1 text-sm">Manage Leaves &rarr;</Link>
        </Card>
        )}

        {hasFullHr && (
        <Card title={<div className="flex items-center gap-2"><Banknote className="text-primary" size={20} /> Payroll</div>}>
          <div className="mb-4">
            <p className="text-base-content/70 mb-2 text-sm">Generate and track compensation.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.payrolls} <span className="text-sm font-normal text-base-content/60">Records</span></div>
            )}
          </div>
          <Link href="/admin/hr/payroll" className="text-primary font-medium hover:underline inline-flex items-center gap-1 text-sm">Manage Payroll &rarr;</Link>
        </Card>
        )}

        <Card title={<div className="flex items-center gap-2"><Shield className="text-primary" size={20} /> Roles & Permissions</div>}>
          <div className="mb-4">
            <p className="text-base-content/70 mb-2 text-sm">Manage roles and access permissions.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.roles} <span className="text-sm font-normal text-base-content/60">Total</span></div>
            )}
          </div>
          <Link href="/admin/hr/roles" className="text-primary font-medium hover:underline inline-flex items-center gap-1 text-sm">Manage Roles &rarr;</Link>
        </Card>

      </div>
    </div>
  );
}