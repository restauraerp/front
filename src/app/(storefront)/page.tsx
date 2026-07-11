'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { 
  ArrowRight, 
  Star, 
  UtensilsCrossed, 
  Wine, 
  Pizza, 
  Clock, 
  MapPin, 
  CalendarCheck 
} from 'lucide-react';

export default function Home() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [reviews, setReviews] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    // Load website settings
    fetchApi('/website-settings')
      .then(res => {
        const data = res?.data || res || [];
        const map: Record<string, string> = {};
        data.forEach((s: any) => { map[s.key] = s.value; });
        setSettings(map);
      }).catch(console.error);

    // Load displayed reviews
    fetchApi('/google-reviews')
      .then(res => {
        const data = res?.data || res || [];
        setReviews(data.filter((r: any) => r.is_displayed));
      }).catch(console.error);

    // Load featured products
    fetchApi('/products')
      .then(res => {
        const data = res?.data || res || [];
        setProducts(data.filter((p: any) => p.images && p.images.length > 0).slice(0, 3));
      }).catch(console.error);

    // Load locations
    fetchApi('/locations')
      .then(res => {
        setLocations(res?.data || res || []);
      }).catch(console.error);
  }, []);

  const siteName = settings.site_name || 'La Bella Cucina';
  const tagline = settings.tagline || 'Authentic Italian Flavors, Crafted with Passion';
  const coverImage = settings.cover_image_url || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600';
  const address = settings.address || 'Road 27, Block J, Banani, Dhaka';

  return (
    <div className="bg-base-100 font-sans min-h-screen">
      {/* ── Hero Section ── */}
      <section 
        className="relative w-full h-[80vh] flex items-center justify-center overflow-hidden"
      >
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${coverImage}')` }}
        />
        <div className="absolute inset-0 bg-black/60" /> {/* Dark overlay */}
        
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30">
            <UtensilsCrossed className="text-primary" size={32} />
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6 drop-shadow-lg">
            {siteName}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 font-light mb-10 max-w-2xl mx-auto drop-shadow-md">
            {tagline}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/booking" className="btn btn-primary btn-lg gap-2 border-none">
              <CalendarCheck size={18} /> Book a Table
            </Link>
            <Link href="/menu" className="btn btn-outline btn-lg text-white hover:bg-white hover:text-black border-white/50">
              View Our Menu
            </Link>
          </div>
        </div>
      </section>

      {/* ── Quick Info ── */}
      <section className="bg-base-200 border-b border-base-300">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-base-300">
          <div className="flex flex-col items-center gap-3 pt-6 md:pt-0">
            <MapPin className="text-primary" size={28} />
            <div className="flex flex-col items-center">
              <h3 className="font-bold text-lg mb-1">{locations.length > 1 ? 'Multiple Locations' : 'Our Location'}</h3>
              
              {locations.length > 1 ? (
                <>
                  <p className="text-sm text-base-content/70 mb-2">Visit any of our {locations.length} branches</p>
                  <div className="dropdown dropdown-hover dropdown-bottom md:dropdown-right">
                    <div tabIndex={0} role="button" className="btn btn-sm btn-outline btn-primary rounded-full px-4">View Branches</div>
                    <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 shadow-xl bg-base-100 rounded-box w-64 md:w-72 text-left mt-2">
                      {locations.map((loc: any) => (
                        <li key={loc.id}>
                          <div className="flex flex-col items-start px-3 py-2 hover:bg-base-200">
                            <span className="font-bold text-base-content leading-none">{loc.name}</span>
                            <span className="text-xs text-base-content/60 mt-1">{loc.address}</span>
                            {loc.contact_number && (
                              <span className="text-xs text-primary mt-1 font-medium">{loc.contact_number}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <p className="text-sm text-base-content/70 max-w-xs">{locations[0]?.address || address}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 pt-6 md:pt-0">
            <Clock className="text-primary" size={28} />
            <div>
              <h3 className="font-bold text-lg mb-1">Opening Hours</h3>
              <p className="text-sm text-base-content/70">Everyday: 12:00 PM - 11:00 PM</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 pt-6 md:pt-0">
            <CalendarCheck className="text-primary" size={28} />
            <div>
              <h3 className="font-bold text-lg mb-1">Reservations</h3>
              <p className="text-sm text-base-content/70">Walk-ins welcome, bookings recommended.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Menu ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">A Taste of Italy</p>
            <h2 className="text-4xl font-bold text-base-content">Signature Dishes</h2>
            <p className="text-base-content/50 mt-4 max-w-xl mx-auto">
              Prepared with fresh, locally sourced ingredients and generations-old family recipes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {products.length > 0 ? products.map(product => {
              const imageUrl = product.images[0]?.url 
                ? `/storage/${product.images[0].url}` 
                : 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=600';
              
              return (
                <div key={product.id} className="card bg-base-100 border border-base-200 overflow-hidden hover:shadow-xl transition-shadow group">
                  <figure className="h-64 overflow-hidden">
                    <img src={imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </figure>
                  <div className="card-body p-6">
                    <div className="flex justify-between items-start mb-2 gap-4">
                      <h3 className="font-bold text-xl">{product.name}</h3>
                      <div className="flex flex-col items-end shrink-0">
                        {product.sale_price ? (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[0.65rem] font-bold tracking-wider">
                                SALE
                              </span>
                              <span className="text-xs line-through text-base-content/40 font-medium">
                                {settings.currency_symbol || '৳'}{Number(product.price).toFixed(2)}
                              </span>
                            </div>
                            <span className="font-black text-red-500 text-xl leading-none">
                              {settings.currency_symbol || '৳'}{Number(product.sale_price).toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-primary text-lg">
                            {settings.currency_symbol || '৳'}{Number(product.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-base-content/70 mb-4">{product.description}</p>
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary mt-auto">
                      <UtensilsCrossed size={14} /> Signature Dish
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-3 text-center py-10 text-base-content/50">Loading featured dishes...</div>
            )}
          </div>

          <div className="text-center mt-12">
            <Link href="/menu" className="btn btn-outline btn-wide gap-2">
              View Full Menu <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      {reviews.length > 0 && (
        <section className="py-24 px-6 bg-base-200/50 border-t border-base-200">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Guest Experiences</p>
              <h2 className="text-4xl font-bold">What Our Patrons Say</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.slice(0, 3).map(r => (
                <div key={r.id} className="card bg-base-100 border border-base-200 shadow-sm">
                  <div className="card-body p-8 gap-4">
                    <div className="flex gap-1">
                      {Array.from({ length: r.rating || 5 }).map((_, i) => (
                        <Star key={i} size={16} className="text-warning fill-warning" />
                      ))}
                    </div>
                    <p className="text-base text-base-content/70 leading-relaxed italic">"{r.text}"</p>
                    <div className="pt-4 mt-auto border-t border-base-200 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm">{r.author_name}</p>
                        <p className="text-xs text-base-content/40 mt-0.5">{r.time}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-base-200 flex items-center justify-center font-bold text-base-content/50 text-xs">
                        {r.author_name.charAt(0)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA / Booking ── */}
      <section className="relative py-24 px-6 bg-neutral text-neutral-content overflow-hidden">
        <div className="absolute inset-0 bg-primary/10" />
        <div className="relative max-w-4xl mx-auto text-center z-10">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6">Join Us for an Unforgettable Evening</h2>
          <p className="text-neutral-content/80 mb-10 text-lg max-w-2xl mx-auto">
            Whether it's a romantic dinner, a family gathering, or a business lunch, we are ready to provide you with the perfect dining experience.
          </p>
          <Link href="/booking" className="btn btn-primary btn-lg gap-2 shadow-xl border-none text-primary-content px-10">
            <CalendarCheck size={20} /> Reserve Your Table Now
          </Link>
        </div>
      </section>

    </div>
  );
}
