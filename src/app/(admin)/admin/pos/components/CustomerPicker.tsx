'use client';
import React, { useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import AddressAutocomplete from '@/components/ui/AddressAutocomplete';

interface Customer { id: number; name: string | null; phone: string | null; email: string | null; }
interface Props {
  customers: Customer[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onAddCustomer: (name: string, phone: string, email: string, address: string, orgName: string, googleMapLoc: string) => Promise<void>;
}

export default function CustomerPicker({ customers, selectedId, onSelect, onAddCustomer }: Props) {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newOrgName, setNewOrgName] = useState('');
  const [newGoogleMapLoc, setNewGoogleMapLoc] = useState('');
  const [adding, setAdding] = useState(false);

  const selected = customers.find(c => c.id === selectedId);
  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return (c.name?.toLowerCase().includes(q) || c.phone?.includes(q));
  });

  const handleAdd = async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    setAdding(true);
    try {
      await onAddCustomer(newName.trim(), newPhone.trim(), newEmail.trim(), newAddress.trim(), newOrgName.trim(), newGoogleMapLoc.trim());
      setShowAdd(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewAddress('');
      setNewOrgName('');
      setNewGoogleMapLoc('');
    } finally { setAdding(false); }
  };

  if (selected) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.8rem' }}>
        <span style={{ fontWeight: 600, color: '#166534' }}>👤 {selected.name}</span>
        {selected.phone && <span style={{ color: '#6b7280' }}>({selected.phone})</span>}
        <button onClick={() => onSelect(null)} style={{ marginLeft: 'auto', cursor: 'pointer', background: 'none', border: 'none', color: '#9ca3af' }}><X size={14} /></button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name/phone…"
            style={{ width: '100%', padding: '0.45rem 0.6rem 0.45rem 2rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.8rem', outline: 'none' }}
          />
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid #e5e7eb', background: showAdd ? '#fef3c7' : 'white', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#374151' }}>
          <UserPlus size={14} /> New
        </button>
      </div>
      {showAdd && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.75rem', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full Name *" style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '0.75rem', outline: 'none' }} />
          <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Phone Number *" style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '0.75rem', outline: 'none' }} />
          <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email (Optional)" style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '0.75rem', outline: 'none' }} />
          <input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Customer Home/Delivery Address (Optional)" style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '0.75rem', outline: 'none' }} />
          <div style={{ padding: '0.45rem', borderRadius: '6px', background: '#fef3c7', border: '1px solid #fde68a' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 600, color: '#92400e', marginBottom: '0.2rem' }}>COMPANY INFO (OPTIONAL)</p>
            <input value={newOrgName} onChange={e => setNewOrgName(e.target.value)} placeholder="Company / Organization Name" style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #fcd34d', fontSize: '0.75rem', outline: 'none', marginBottom: '0.3rem' }} />
            <AddressAutocomplete 
              value={newGoogleMapLoc}
              onChange={(e: any) => setNewGoogleMapLoc(e.target.value)}
              onPlaceSelected={(addr, lat, lng) => {
                setNewGoogleMapLoc(lat && lng ? `${lat},${lng}` : addr);
              }}
              placeholder="Search Company Location..." 
              style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #fcd34d', fontSize: '0.75rem', outline: 'none' }} 
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
             <button onClick={handleAdd} disabled={adding} style={{ padding: '0.4rem 1rem', borderRadius: '6px', background: '#6366f1', color: 'white', border: 'none', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
               {adding ? 'Adding…' : 'Save Customer'}
             </button>
          </div>
        </div>
      )}
      {search && filtered.length > 0 && (
        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white' }}>
          {filtered.slice(0, 5).map(c => (
            <button key={c.id} onClick={() => { onSelect(c.id); setSearch(''); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.6rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontWeight: 600, color: '#1f2937' }}>{c.name}</span>{c.phone && <span style={{ color: '#6b7280', marginLeft: '0.5rem', fontSize: '0.75rem' }}>{c.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
