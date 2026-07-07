'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { fetchApi } from '@/lib/api';

export default function Catalog() {
  const [stats, setStats] = useState({ products: 0, categories: 0, tags: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [prodRes, catRes, tagRes] = await Promise.all([
          fetchApi('/products?per_page=1'),
          fetchApi('/product-categories?nopaginate=1'),
          fetchApi('/tags')
        ]);

        // Safely extract the total count from paginated responses or arrays
        const prodCount = prodRes?.total || prodRes?.meta?.total || (Array.isArray(prodRes?.data) ? prodRes.data.length : 0) || 0;
        
        const catArray = Array.isArray(catRes) ? catRes : (Array.isArray(catRes?.data) ? catRes.data : []);
        const tagArray = Array.isArray(tagRes) ? tagRes : (Array.isArray(tagRes?.data) ? tagRes.data : []);

        setStats({
          products: prodCount,
          categories: catArray.length,
          tags: tagArray.length
        });
      } catch (error) {
        console.error("Failed to load catalog stats", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Catalog Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Products">
          <div className="mb-4">
            <p className="text-base-content/70 mb-2">Manage all sellable items on your menu.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.products} <span className="text-sm font-normal text-base-content/60">Items</span></div>
            )}
          </div>
          <Link href="/admin/catalog/products" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
            Manage Products &rarr;
          </Link>
        </Card>
        <Card title="Categories">
          <div className="mb-4">
            <p className="text-base-content/70 mb-2">Group products into Appetizers, Mains, etc.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.categories} <span className="text-sm font-normal text-base-content/60">Categories</span></div>
            )}
          </div>
          <Link href="/admin/catalog/categories" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
            Manage Categories &rarr;
          </Link>
        </Card>
        <Card title="Tags">
          <div className="mb-4">
            <p className="text-base-content/70 mb-2">Tag items (e.g. Vegan, Spicy, Gluten-Free).</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.tags} <span className="text-sm font-normal text-base-content/60">Tags</span></div>
            )}
          </div>
          <Link href="/admin/catalog/tags" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
            Manage Tags &rarr;
          </Link>
        </Card>
      </div>
    </div>
  );
}