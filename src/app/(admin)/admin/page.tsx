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
  const [stats, setStats] = useState({ orders: 0, products: 0, customers: 0, revenue: 0 });

  useEffect(() => {
    Promise.allSettled([
      fetchApi('/orders?nopaginate=1'),
      fetchApi('/products'),
      fetchApi('/customers'),
    ]).then(([ordersRes, productsRes, customersRes]) => {
      const ordersData = ordersRes.status === 'fulfilled' ? (ordersRes.value?.data || ordersRes.value || []) : [];
      let totalRev = 0;
      ordersData.forEach((o: any) => {
        if (o.status !== 'Cancelled' && o.status !== 'Failed') {
          totalRev += Number(o.total || 0);
        }
      });
      setStats({
        orders: ordersData.length,
        products: productsRes.status === 'fulfilled' ? (productsRes.value?.data || productsRes.value || []).length : 0,
        customers: customersRes.status === 'fulfilled' ? (customersRes.value?.data || customersRes.value || []).length : 0,
        revenue: totalRev,
      });
    });
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
          <div className="stat-figure text-success"><TrendingUp size={28} /></div>
          <div className="stat-title text-xs">Total Revenue</div>
          <div className="stat-value text-success text-3xl">৳{stats.revenue.toFixed(2)}</div>
        </div>
        <div className="stat bg-base-100 border border-base-200 rounded-2xl shadow-sm">
          <div className="stat-figure text-primary"><ShoppingCart size={28} /></div>
          <div className="stat-title text-xs">Total Orders</div>
          <div className="stat-value text-primary text-3xl">{stats.orders}</div>
        </div>
        <div className="stat bg-base-100 border border-base-200 rounded-2xl shadow-sm">
          <div className="stat-figure text-info"><Package size={28} /></div>
          <div className="stat-title text-xs">Products</div>
          <div className="stat-value text-info text-3xl">{stats.products}</div>
        </div>
        <div className="stat bg-base-100 border border-base-200 rounded-2xl shadow-sm">
          <div className="stat-figure text-secondary"><Users size={28} /></div>
          <div className="stat-title text-xs">Customers</div>
          <div className="stat-value text-secondary text-3xl">{stats.customers}</div>
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