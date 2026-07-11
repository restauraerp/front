'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';
import { CalendarCheck, MapPin, Phone, Images, Video } from 'lucide-react';
import { notFound } from 'next/navigation';

export default function LocationDetails({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = React.use(params);
  const slug = unwrappedParams.slug;
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos');

  useEffect(() => {
    fetchApi(`/locations/${slug}`)
      .then(res => {
        if (!res || (!res.id && !res.slug)) throw new Error('Not found');
        setLocation(res);
      })
      .catch(err => {
        console.error(err);
        setLocation(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>;
  }

  if (!location) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">Location Not Found</h2>
        <Link href="/" className="btn btn-primary">Return Home</Link>
      </div>
    );
  }

  const images = location.images || [];
  const videos = location.videos || [];
  
  let featuredImageUrl = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600';
  if (location.featuredImage) {
    featuredImageUrl = `/storage/${location.featuredImage.url}`;
  } else if (images.length > 0) {
    featuredImageUrl = `/storage/${images[0].url}`;
  }

  return (
    <div className="bg-base-100 min-h-screen pb-24">
      {/* Hero Section */}
      <section className="relative w-full h-[50vh] flex items-end pb-12 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${featuredImageUrl}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        <div className="relative z-10 px-6 max-w-6xl mx-auto w-full text-white">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-2">
            {location.name}
          </h1>
          <div className="flex flex-col md:flex-row md:items-center gap-4 text-white/80">
            <div className="flex items-center gap-2">
              <MapPin size={18} />
              <span>{location.address}</span>
            </div>
            {location.phone && (
              <div className="flex items-center gap-2">
                <Phone size={18} />
                <span>{location.phone}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content: Gallery & Info */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* Gallery Section */}
          <section>
            <div className="flex items-center gap-4 border-b border-base-200 pb-4 mb-6">
              <button 
                className={`flex items-center gap-2 font-bold text-lg pb-4 -mb-[17px] border-b-2 transition-colors ${activeTab === 'photos' ? 'border-primary text-primary' : 'border-transparent text-base-content/60 hover:text-base-content'}`}
                onClick={() => setActiveTab('photos')}
              >
                <Images size={20} /> Photos ({images.length})
              </button>
              <button 
                className={`flex items-center gap-2 font-bold text-lg pb-4 -mb-[17px] border-b-2 transition-colors ${activeTab === 'videos' ? 'border-primary text-primary' : 'border-transparent text-base-content/60 hover:text-base-content'}`}
                onClick={() => setActiveTab('videos')}
              >
                <Video size={20} /> Videos ({videos.length})
              </button>
            </div>

            {activeTab === 'photos' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.length > 0 ? images.map((img: any) => (
                  <img 
                    key={img.id} 
                    src={`/storage/${img.url}`} 
                    alt={location.name} 
                    className="w-full h-48 object-cover rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  />
                )) : (
                  <div className="col-span-full py-12 text-center text-base-content/50 bg-base-200 rounded-xl">
                    No photos available for this location.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'videos' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {location.featuredVideo && (
                  <div className="col-span-full mb-4">
                    <h4 className="text-lg font-bold mb-2">Featured Video</h4>
                    <video 
                      src={`/storage/${location.featuredVideo.url}`} 
                      controls 
                      className="w-full h-80 object-cover rounded-xl shadow-sm bg-black"
                    />
                  </div>
                )}
                {videos.length > 0 ? videos.map((vid: any) => (
                  <video 
                    key={vid.id} 
                    src={`/storage/${vid.url}`} 
                    controls 
                    className="w-full h-64 object-cover rounded-xl shadow-sm bg-black"
                  />
                )) : (!location.featuredVideo && (
                  <div className="col-span-full py-12 text-center text-base-content/50 bg-base-200 rounded-xl">
                    No videos available for this location.
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar: Booking & Details */}
        <div className="space-y-6">
          <div className="card bg-base-100 border border-base-200 shadow-xl sticky top-24">
            <div className="card-body">
              <h3 className="card-title text-2xl mb-2">Book a Table</h3>
              <p className="text-base-content/70 text-sm mb-6">
                Reserve your spot at {location.name} and experience premium dining.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center pb-4 border-b border-base-200">
                  <span className="text-base-content/70">Total Capacity</span>
                  <span className="font-bold text-lg">
                    {location.tables?.reduce((sum: number, t: any) => sum + (t.capacity || 0), 0) || 'N/A'} Guests
                  </span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-base-200">
                  <span className="text-base-content/70">Total Tables</span>
                  <span className="font-bold text-lg">
                    {location.tables?.length || 0} Tables
                  </span>
                </div>
              </div>

              <Link href={`/booking?location_id=${location.id}`} className="btn btn-primary w-full gap-2 text-lg h-auto py-3">
                <CalendarCheck size={20} /> Reserve Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
