'use client';
import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function BookingPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    guests: '2',
    special_requests: ''
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

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
              <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Contact Information</h3>
            </div>
            
            <Input label="Full Name" name="name" value={formData.name} onChange={handleInputChange} required />
            <Input label="Email Address" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
            <Input label="Phone Number" name="phone" value={formData.phone} onChange={handleInputChange} required />
            
            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
              <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Reservation Details</h3>
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