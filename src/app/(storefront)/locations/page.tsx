'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';
import { MapPin, Phone, Mail, ArrowRight } from 'lucide-react';

export default function LocationsListPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/locations')
      .then(res => setLocations(Array.isArray(res) ? res : (res?.data || [])))
      .catch(err => console.error('Failed to fetch locations', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-base-100 min-h-screen pb-20">
      {/* Hero Header */}
      <div className="bg-base-200 py-16 text-center px-4">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-base-content">Our Locations</h1>
        <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
          Experience our world-class dining across multiple convenient locations. Find a branch near you.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-12 space-y-12">
        {loading ? (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner text-primary loading-lg"></span>
          </div>
        ) : locations.length > 0 ? (
          locations.map((loc: any) => (
            <div key={loc.id} className="card bg-base-100 shadow-xl border border-base-200 overflow-hidden lg:card-side">
              {/* Profile/Featured Image */}
              <figure className="lg:w-1/3 relative shrink-0">
                <img 
                  src={loc.featured_image ? `/storage/${loc.featured_image.url}` : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'} 
                  alt={loc.name} 
                  className="w-full h-64 lg:h-full object-cover"
                />
              </figure>
              
              <div className="card-body lg:w-2/3 p-6 md:p-8 grid lg:grid-cols-2 gap-8 items-stretch">
                {/* Details Section */}
                <div className="flex flex-col justify-center">
                  <div className="badge badge-primary badge-outline mb-4 uppercase tracking-wider font-semibold">
                    {loc.type?.replace('_', ' ') || 'Branch'}
                  </div>
                  <h2 className="card-title text-3xl font-bold mb-6">{loc.name}</h2>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                      <MapPin className="text-primary mt-1 shrink-0" size={20} />
                      <span className="text-base-content/80 text-lg leading-relaxed">{loc.address}</span>
                    </div>
                    {loc.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="text-primary shrink-0" size={20} />
                        <span className="text-base-content/80 text-lg">{loc.phone}</span>
                      </div>
                    )}
                    {loc.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="text-primary shrink-0" size={20} />
                        <span className="text-base-content/80 text-lg">{loc.email}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="card-actions mt-auto gap-4 pt-4">
                    <Link href={`/locations/${loc.slug || loc.id}`} className="btn btn-primary shadow-sm hover:shadow-md transition-shadow">
                      View Details <ArrowRight size={18} />
                    </Link>
                    <Link href={`/booking?location_id=${loc.id}`} className="btn btn-outline btn-primary">
                      Book Table
                    </Link>
                  </div>
                </div>

                {/* Map Section */}
                <div className="h-64 lg:h-auto w-full rounded-xl overflow-hidden border border-base-200 bg-base-200 flex items-center justify-center relative group min-h-[250px]">
                  {loc.map_url ? (
                    <>
                      <iframe 
                        src={loc.map_url} 
                        width="100%" 
                        height="100%" 
                        style={{ border: 0 }} 
                        allowFullScreen 
                        loading="lazy" 
                        referrerPolicy="no-referrer-when-downgrade"
                        className="absolute inset-0"
                      ></iframe>
                      {/* Overlay to prevent accidental scrolling while scrolling page on mobile */}
                      <div className="absolute inset-0 bg-transparent group-hover:pointer-events-none transition-all duration-300"></div>
                    </>
                  ) : (
                    <div className="text-base-content/40 flex flex-col items-center gap-2">
                      <MapPin size={32} />
                      <span>Map not available</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 text-base-content/50">
            <MapPin size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-xl">No locations available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
