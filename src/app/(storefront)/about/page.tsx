'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Users2, Award, Clock, Utensils } from 'lucide-react';

export default function AboutPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [reviews, setReviews] = useState<any[]>([]);

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
  }, []);

  const siteName = settings.site_name || 'RestoraERP';
  const tagline = settings.tagline || 'Premium Restaurant Management System';

  return (
    <div className="max-w-5xl mx-auto py-16 px-6 space-y-20">
      {/* Hero */}
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-extrabold text-base-content">{siteName}</h1>
        <p className="text-xl text-base-content/50 max-w-xl mx-auto">{tagline}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {[
          { icon: Utensils, label: 'Dishes Served', val: '10,000+' },
          { icon: Users2, label: 'Happy Customers', val: '5,000+' },
          { icon: Award, label: 'Years Experience', val: '10+' },
          { icon: Clock, label: 'Open Hours', val: '7 Days' },
        ].map(({ icon: Icon, label, val }) => (
          <div key={label} className="card bg-base-200 p-6 rounded-2xl">
            <Icon className="text-primary mx-auto mb-3" size={28} />
            <p className="text-2xl font-bold">{val}</p>
            <p className="text-sm text-base-content/50">{label}</p>
          </div>
        ))}
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <div>
          <h2 className="text-3xl font-bold text-center mb-8">What Our Customers Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reviews.map(r => (
              <div key={r.id} className="card bg-base-100 border border-base-200 shadow-sm p-5 space-y-3">
                <div className="text-warning text-sm">{'⭐'.repeat(r.rating || 5)}</div>
                <p className="text-sm text-base-content/70 italic">"{r.text}"</p>
                <div className="pt-2 border-t border-base-200">
                  <p className="font-semibold text-sm">{r.author_name}</p>
                  <p className="text-xs text-base-content/40">{r.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}