'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { fetchApi } from '@/lib/api';

export default function InventoryDashboard() {
  const [stats, setStats] = useState({ items: 0, suppliers: 0, recipes: 0, purchaseOrders: 0, storage: 0, waste: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [itemsRes, suppliersRes, recipesRes, poRes, locRes, wasteRes] = await Promise.all([
          fetchApi('/inventory-items?per_page=1').catch(() => null),
          fetchApi('/suppliers?per_page=1').catch(() => null),
          fetchApi('/recipes?per_page=1').catch(() => null),
          fetchApi('/purchase-orders?per_page=1').catch(() => null),
          fetchApi('/locations?per_page=1').catch(() => null),
          fetchApi('/waste-logs?per_page=1').catch(() => null)
        ]);

        const getCount = (res: any) => res?.total || res?.meta?.total || (Array.isArray(res?.data) ? res.data.length : 0) || (Array.isArray(res) ? res.length : 0) || 0;

        setStats({
          items: getCount(itemsRes),
          suppliers: getCount(suppliersRes),
          recipes: getCount(recipesRes),
          purchaseOrders: getCount(poRes),
          storage: getCount(locRes),
          waste: getCount(wasteRes)
        });
      } catch (error) {
        console.error("Failed to load inventory stats", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Inventory Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Inventory Items">
          <div className="mb-4">
            <p className="text-base-content/70 mb-2">Manage raw materials, ingredients, and stock levels.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.items} <span className="text-sm font-normal text-base-content/60">Items</span></div>
            )}
          </div>
          <Link href="/admin/inventory/items" className="text-primary font-medium hover:underline inline-flex items-center gap-1">Manage Items &rarr;</Link>
        </Card>

        <Card title="Suppliers">
          <div className="mb-4">
            <p className="text-base-content/70 mb-2">Manage your vendors and contact details.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.suppliers} <span className="text-sm font-normal text-base-content/60">Suppliers</span></div>
            )}
          </div>
          <Link href="/admin/inventory/suppliers" className="text-primary font-medium hover:underline inline-flex items-center gap-1">Manage Suppliers &rarr;</Link>
        </Card>

        <Card title="Recipes">
          <div className="mb-4">
            <p className="text-base-content/70 mb-2">Define ingredients and required quantities for products.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.recipes} <span className="text-sm font-normal text-base-content/60">Recipes</span></div>
            )}
          </div>
          <Link href="/admin/inventory/recipes" className="text-primary font-medium hover:underline inline-flex items-center gap-1">Manage Recipes &rarr;</Link>
        </Card>

        <Card title="Purchase Orders">
          <div className="mb-4">
            <p className="text-base-content/70 mb-2">Create and track purchase orders from suppliers.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.purchaseOrders} <span className="text-sm font-normal text-base-content/60">Orders</span></div>
            )}
          </div>
          <Link href="/admin/inventory/purchase-orders" className="text-primary font-medium hover:underline inline-flex items-center gap-1">Manage Orders &rarr;</Link>
        </Card>

        <Card title="Storage Locations">
          <div className="mb-4">
            <p className="text-base-content/70 mb-2">Configure physical storage locations.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.storage} <span className="text-sm font-normal text-base-content/60">Locations</span></div>
            )}
          </div>
          <Link href="/admin/locations" className="text-primary font-medium hover:underline inline-flex items-center gap-1">Manage Locations &rarr;</Link>
        </Card>

        <Card title="Waste Logs">
          <div className="mb-4">
            <p className="text-base-content/70 mb-2">Track inventory waste and spoilage.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.waste} <span className="text-sm font-normal text-base-content/60">Logs</span></div>
            )}
          </div>
          <Link href="/admin/inventory/waste" className="text-primary font-medium hover:underline inline-flex items-center gap-1">Manage Waste &rarr;</Link>
        </Card>
      </div>
    </div>
  );
}