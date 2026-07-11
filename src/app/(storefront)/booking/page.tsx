'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSearchParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';
import { MapPin, ExternalLink } from 'lucide-react';

function BookingForm() {
  const searchParams = useSearchParams();
  const initialLocationId = searchParams.get('location_id') || '';

  const [locations, setLocations] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    guests: '2',
    location_id: initialLocationId,
    special_requests: ''
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchApi('/locations')
      .then(res => setLocations(res))
      .catch(err => console.error('Failed to load locations', err))
      .finally(() => setLoadingLocations(false));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    
    // Simulate API call for booking submission
    setTimeout(() => {
      setStatus('success');
      setFormData({
        name: '',
        email: '',
        phone: '',
        date: '',
        time: '',
        guests: '2',
        location_id: initialLocationId,
        special_requests: ''
      });
    }, 1500);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>Book a Table</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Reserve your spot and experience culinary excellence. We look forward to hosting you.
        </p>
      </div>

      {status === 'success' ? (
        <Card style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ color: '#065f46', marginBottom: '1rem' }}>Reservation Confirmed!</h2>
          <p style={{ color: '#047857', marginBottom: '2rem' }}>
            Thank you for choosing RestoraERP. We have received your booking request and will send a confirmation email shortly.
          </p>
          <Button onClick={() => setStatus('idle')} variant="secondary">Make Another Booking</Button>
        </Card>
      ) : (
        <Card>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            <div style={{ gridColumn: '1 / -1' }}>
              <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600 }}>1. Select a Location</h3>
              
              {loadingLocations ? (
                <div className="flex justify-center py-4"><span className="loading loading-spinner text-primary"></span></div>
              ) : locations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-2">
                  {locations.map(loc => {
                    const isSelected = formData.location_id === String(loc.id);
                    return (
                      <div 
                        key={loc.id} 
                        onClick={() => setFormData(prev => ({ ...prev, location_id: String(loc.id) }))}
                        className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/5 shadow-md scale-[1.02]' : 'border-base-200 hover:border-primary/40 hover:bg-base-200/50'}`}
                      >
                        <h4 className="font-bold text-lg leading-tight mb-1">{loc.name}</h4>
                        <div className="flex items-start gap-1 text-sm text-base-content/70 mb-3">
                          <MapPin size={14} className="mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{loc.address}</span>
                        </div>
                        <div className="flex justify-between items-center mt-auto pt-2 border-t border-base-200/50">
                          <span className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-transparent'}`}>Selected ✓</span>
                          <Link 
                            href={`/locations/${loc.slug || loc.id}`} 
                            onClick={(e) => e.stopPropagation()}
                            className="btn btn-xs btn-ghost text-primary gap-1"
                          >
                            View <ExternalLink size={12} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-base-content/60 text-sm italic">No locations available.</p>
              )}
              {/* Hidden input to ensure validation */}
              <input type="hidden" name="location_id" value={formData.location_id} required />
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
              <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600 }}>2. Contact Information</h3>
            </div>
            
            <Input label="Full Name" name="name" value={formData.name} onChange={handleInputChange} required />
            <Input label="Email Address" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
            <Input label="Phone Number" name="phone" value={formData.phone} onChange={handleInputChange} required />
            
            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
              <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600 }}>3. Reservation Details</h3>
            </div>

            <Input label="Date" name="date" type="date" value={formData.date} onChange={handleInputChange} required />
            <Input label="Time" name="time" type="time" value={formData.time} onChange={handleInputChange} required />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)' }}>Number of Guests</label>
              <select 
                style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit' }} 
                name="guests" 
                value={formData.guests} 
                onChange={handleInputChange}
                required
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, '10+'].map(num => (
                  <option key={num} value={num}>{num} {num === 1 ? 'Guest' : 'Guests'}</option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)', display: 'block', marginBottom: '0.5rem' }}>Special Requests (Optional)</label>
              <textarea 
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit', minHeight: '100px', resize: 'vertical' }}
                name="special_requests"
                value={formData.special_requests}
                onChange={handleInputChange}
                placeholder="Any dietary requirements or special occasions?"
              />
            </div>
            
            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
              <Button 
                type="submit" 
                variant="primary" 
                style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? 'Processing...' : 'Confirm Reservation'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><span className="loading loading-spinner text-primary loading-lg"></span></div>}>
      <BookingForm />
    </Suspense>
  );
}