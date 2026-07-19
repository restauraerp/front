'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import {
  ShoppingCart, Package, Boxes, Users,
  ClipboardList, HeartHandshake, BookOpen, TrendingUp
} from 'lucide-react';

const quickLinks = [
  { href: '/admin/pos', label: 'Point of Sale', icon: ShoppingCart, color: 'text-primary', bg: 'bg-primary/10' },
  { href: '/admin/catalog', label: 'Catalog', icon: Package, color: 'text-info', bg: 'bg-info/10' },
  { href: '/admin/inventory', label: 'Inventory', icon: Boxes, color: 'text-success', bg: 'bg-success/10' },
  { href: '/admin/hr', label: 'HR', icon: Users, color: 'text-warning', bg: 'bg-warning/10' },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList, color: 'text-error', bg: 'bg-error/10' },
  { href: '/admin/crm', label: 'CRM', icon: HeartHandshake, color: 'text-secondary', bg: 'bg-secondary/10' },
  { href: '/admin/accounting', label: 'Accounting', icon: BookOpen, color: 'text-accent', bg: 'bg-accent/10' },
];

export default function Dashboard() {
  const [stats, setStats] = useState({ 
    todayRev: 0, todayOrders: 0, 
    yesterdayRev: 0, yesterdayOrders: 0,
    weekRev: 0, weekOrders: 0
  });

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    const fromDate = d.toISOString();

    fetchApi(`/orders?nopaginate=1&from=${fromDate}`).then(res => {
      const ordersData = res.data || res || [];
      
      let todayRev = 0, todayOrders = 0;
      let yesterdayRev = 0, yesterdayOrders = 0;
      let weekRev = 0, weekOrders = 0;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      ordersData.forEach((o: any) => {
        if (o.status !== 'Cancelled' && o.status !== 'Failed') {
          const amount = Number(o.total || 0);
          const orderDate = new Date(o.created_at);
          
          weekRev += amount;
          weekOrders++;

          if (orderDate >= today) {
            todayRev += amount;
            todayOrders++;
          } else if (orderDate >= yesterday && orderDate < today) {
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
          <div className="stat-value text-primary text-3xl">৳{stats.todayRev.toFixed(2)}</div>
          <div className="stat-desc text-primary font-medium">{stats.todayOrders} orders today</div>
        </div>
        <div className="stat bg-base-100 border border-base-200 rounded-2xl shadow-sm">
          <div className="stat-figure text-info"><ShoppingCart size={28} /></div>
          <div className="stat-title text-xs">Yesterday's Revenue</div>
          <div className="stat-value text-info text-3xl">৳{stats.yesterdayRev.toFixed(2)}</div>
          <div className="stat-desc text-info font-medium">{stats.yesterdayOrders} orders yesterday</div>
        </div>
        <div className="stat bg-base-100 border border-base-200 rounded-2xl shadow-sm">
          <div className="stat-figure text-success"><TrendingUp size={28} /></div>
          <div className="stat-title text-xs">This Week's Revenue</div>
          <div className="stat-value text-success text-3xl">৳{stats.weekRev.toFixed(2)}</div>
          <div className="stat-desc text-success font-medium">{stats.weekOrders} orders this week</div>
        </div>
        <div className="stat bg-base-100 border border-base-200 rounded-2xl shadow-sm">
          <div className="stat-figure text-secondary"><ClipboardList size={28} /></div>
          <div className="stat-title text-xs">Avg Order Value (Week)</div>
          <div className="stat-value text-secondary text-3xl">
            ৳{stats.weekOrders > 0 ? (stats.weekRev / stats.weekOrders).toFixed(2) : '0.00'}
          </div>
          <div className="stat-desc text-secondary font-medium">Based on recent week</div>
        </div>
      </div>

      {/* Quick Links */}
      <Card title="Quick Access">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {quickLinks.map(({ href, label, icon: Icon, color, bg }) => (
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
      </Card>
    </div>
  );
}