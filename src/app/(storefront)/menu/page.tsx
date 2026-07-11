'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useCart } from '../CartProvider';

export default function MenuPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const { addToCart } = useCart();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, setRes] = await Promise.all([
        fetchApi('/products'),
        fetchApi('/product-categories'),
        fetchApi('/website-settings')
      ]);
      setProducts(prodRes.data || prodRes || []);
      setCategories(catRes.data || catRes || []);
      
      const map: Record<string, string> = {};
      (setRes.data || setRes || []).forEach((s: any) => { map[s.key] = s.value; });
      setSettings(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = activeCategory === 'all' 
    ? products 
    : products.filter(p => p.category_id === activeCategory);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>Our Menu</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Explore our premium selection of handcrafted dishes, prepared fresh daily by our expert culinary team.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Loading menu...</p>
        </div>
      ) : (
        <>
          {/* Category Filter */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '3rem' }}>
            <Button 
              variant={activeCategory === 'all' ? 'primary' : 'secondary'}
              onClick={() => setActiveCategory('all')}
              style={{ borderRadius: '9999px', padding: '0.5rem 1.5rem' }}
            >
              All Items
            </Button>
            {categories.map(cat => (
              <Button 
                key={cat.id}
                variant={activeCategory === cat.id ? 'primary' : 'secondary'}
                onClick={() => setActiveCategory(cat.id)}
                style={{ borderRadius: '9999px', padding: '0.5rem 1.5rem' }}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>No items found in this category.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
              {filteredProducts.map(product => (
                <div key={product.id} style={{ 
                  borderRadius: '16px', 
                  overflow: 'hidden', 
                  backgroundColor: 'white',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
                  transition: 'transform 0.2s ease-in-out',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ 
                    height: '200px', 
                    backgroundColor: '#f3f4f6', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#9ca3af',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    overflow: 'hidden'
                  }}>
                    {product.images && product.images.length > 0 ? (
                      <img 
                        src={`/storage/${product.images[0].url}`} 
                        alt={product.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      product.name?.substring(0, 2).toUpperCase() || '🍽️'
                    )}
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>{product.name}</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        {product.sale_price ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                                    SALE
                                </span>
                                <span style={{ fontSize: '1rem', textDecoration: 'line-through', color: '#9ca3af' }}>
                                  {settings.currency_symbol || '৳'}{product.price}
                                </span>
                            </div>
                            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ef4444' }}>
                              {settings.currency_symbol || '৳'}{product.sale_price}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                            {settings.currency_symbol || '৳'}{product.price}
                          </span>
                        )}
                      </div>
                    </div>
                    {product.description && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, margin: '0.5rem 0 1rem 0' }}>
                        {product.description}
                      </p>
                    )}
                    <div style={{ marginTop: '1rem' }}>
                      <Button style={{ width: '100%' }} onClick={() => addToCart(product, 1)}>Order Now</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}