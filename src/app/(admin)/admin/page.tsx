'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import {
  ShoppingCart, Package, Boxes, Users,
  ClipboardList, HeartHandshake, BookOpen, TrendingUp
} from 'lucide-react';

const formatCurrency = (value: number | string) => {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const quickLinks = [
  { href: '/admin/pos', label: 'Point of Sale', icon: ShoppingCart, color: 'text-primary', bg: 'bg-primary/10', reqPerm: 'view_pos' },
  { href: '/admin/catalog', label: 'Catalog', icon: Package, color: 'text-info', bg: 'bg-info/10', reqPerm: 'view_catalog' },
  { href: '/admin/inventory', label: 'Inventory', icon: Boxes, color: 'text-success', bg: 'bg-success/10', reqPerm: 'view_inventory' },
  { href: '/admin/hr', label: 'HR', icon: Users, color: 'text-warning', bg: 'bg-warning/10', reqPerm: 'view_hr' },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList, color: 'text-error', bg: 'bg-error/10', reqPerm: 'view_orders' },
  { href: '/admin/crm', label: 'CRM', icon: HeartHandshake, color: 'text-secondary', bg: 'bg-secondary/10', reqPerm: 'view_crm' },
  { href: '/admin/accounting', label: 'Accounting', icon: BookOpen, color: 'text-accent', bg: 'bg-accent/10', reqPerm: 'view_accounting' },
];

export default function Dashboard() {
  const [stats, setStats] = useState({ 
    todayRev: 0, todayOrders: 0, 
    yesterdayRev: 0, yesterdayOrders: 0,
    weekRev: 0, weekOrders: 0
  });

  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    fetchApi('/auth/me').then(res => {
      setUserPermissions(res?.all_permissions || []);
      const roles = res?.roles?.map((r: any) => r.name) || [];
      if (roles.includes('super_admin')) setIsSuperAdmin(true);
      setAuthLoaded(true);
    }).catch(console.error);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const now = new Date();
    
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 7);
    const dhakaStr7 = d7.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
    const dhakaDate7 = new Date(dhakaStr7);
    dhakaDate7.setHours(0, 0, 0, 0);
    const fromDate = `${dhakaDate7.getFullYear()}-${pad(dhakaDate7.getMonth()+1)}-${pad(dhakaDate7.getDate())} 00:00:00`;

    fetchApi(`/orders?nopaginate=1&from=${fromDate}`).then(res => {
      const ordersData = res.data || res || [];
      
      let todayRev = 0, todayOrders = 0;
      let yesterdayRev = 0, yesterdayOrders = 0;
      let weekRev = 0, weekOrders = 0;

      const dhakaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
      const today = new Date(dhakaNow.getFullYear(), dhakaNow.getMonth(), dhakaNow.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      ordersData.forEach((o: any) => {
        if (o.status !== 'Cancelled' && o.status !== 'Failed') {
          const amount = Number(o.total || 0);
          
          const rawDate = new Date(o.created_at);
          const dhakaOrderDate = new Date(rawDate.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
          
          weekRev += amount;
          weekOrders++;

          if (dhakaOrderDate >= today) {
            todayRev += amount;
            todayOrders++;
          } else if (dhakaOrderDate >= yesterday && dhakaOrderDate < today) {
            yesterdayRev += amount;
            yesterdayOrders++;
          }
        }
      });

      setStats({
        todayRev, todayOrders,
        yesterdayRev, yesterdayOrders,
        weekRev, weekOrders
      });
    }).catch(console.error);
  }, []);

  const hasAccess = (reqPerm: string) => {
    if (isSuperAdmin) return true;
    return userPermissions.includes(reqPerm);
  };

  const filteredLinks = quickLinks.filter(link => hasAccess(link.reqPerm));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Dashboard</h1>
          <p className="text-sm text-base-content/50 mt-1">Welcome back to RestoraERP</p>
        </div>
        <div className="badge badge-primary badge-outline gap-1">
          <TrendingUp size={12} /> Live
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat bg-base-100 border border-base-200 rounded-2xl shadow-sm">
          <div className="stat-figure text-primary"><TrendingUp size={28} /></div>
          <div className="stat-title text-xs">Today's Revenue</div>
          <div className="stat-value text-primary text-3xl">৳{formatCurrency(stats.todayRev)}</div>
          <div className="stat-desc text-primary font-medium">{stats.todayOrders} orders today</div>
        </div>
        <div className="stat bg-base-100 border border-base-200 rounded-2xl shadow-sm">
          <div className="stat-figure text-info"><ShoppingCart size={28} /></div>
          <div className="stat-title text-xs">Yesterday's Revenue</div>
          <div className="stat-value text-info text-3xl">৳{formatCurrency(stats.yesterdayRev)}</div>
          <div className="stat-desc text-info font-medium">{stats.yesterdayOrders} orders yesterday</div>
        </div>
        <div className="stat bg-base-100 border border-base-200 rounded-2xl shadow-sm">
          <div className="stat-figure text-success"><TrendingUp size={28} /></div>
          <div className="stat-title text-xs">This Week's Revenue</div>
          <div className="stat-value text-success text-3xl">৳{formatCurrency(stats.weekRev)}</div>
          <div className="stat-desc text-success font-medium">{stats.weekOrders} orders this week</div>
        </div>
        <div className="stat bg-base-100 border border-base-200 rounded-2xl shadow-sm">
          <div className="stat-figure text-secondary"><ClipboardList size={28} /></div>
          <div className="stat-title text-xs">Avg Order Value (Week)</div>
          <div className="stat-value text-secondary text-3xl">
            ৳{formatCurrency(stats.weekOrders > 0 ? (stats.weekRev / stats.weekOrders) : 0)}
          </div>
          <div className="stat-desc text-secondary font-medium">Based on recent week</div>
        </div>
      </div>

      {/* Quick Links */}
      <Card title="Quick Access">
        {authLoaded ? (
          filteredLinks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredLinks.map(({ href, label, icon: Icon, color, bg }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-base-200 hover:border-primary hover:shadow-md transition-all group"
                >
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                    <Icon className={`${color} group-hover:scale-110 transition-transform`} size={20} />
                  </div>
                  <span className="text-xs font-medium text-base-content/70">{label}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center text-sm opacity-50 py-4">No quick access modules available for your role.</div>
          )
        ) : (
          <div className="flex justify-center py-4"><span className="loading loading-spinner text-primary"></span></div>
        )}
      </Card>
    </div>
  );
}