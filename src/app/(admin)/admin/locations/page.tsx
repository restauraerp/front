'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LocationsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'head_office',
    address: '',
    phone: '',
    email: '',
    is_active: 1
  });
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [featuredVideo, setFeaturedVideo] = useState<File | null>(null);
  const [images, setImages] = useState<FileList | null>(null);
  const [videos, setVideos] = useState<FileList | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [existingMedia, setExistingMedia] = useState<any>(null);

  // Tables Management State
  const [managingTablesFor, setManagingTablesFor] = useState<any | null>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tableFormData, setTableFormData] = useState({ name: '', capacity: 4, is_active: 1 });

  const [locationTypes, setLocationTypes] = useState<any[]>([]);

  useEffect(() => {
    fetchApi('/location-types').then(res => setLocationTypes(res.data || res || [])).catch(console.error);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/locations');
      setLocations(res.data || res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'is_active') {
          payload.append(key, parseInt(formData.is_active as any) === 1 ? '1' : '0');
        } else if ((formData as any)[key]) {
          payload.append(key, (formData as any)[key]);
        }
      });

      if (featuredImage) {
        payload.append('featured_image', featuredImage);
      }
      if (featuredVideo) {
        payload.append('featured_video', featuredVideo);
      }

      if (images) {
        for (let i = 0; i < images.length; i++) {
          payload.append('images[]', images[i]);
        }
      }
      
      if (videos) {
        for (let i = 0; i < videos.length; i++) {
          payload.append('videos[]', videos[i]);
        }
      }

      if (editingId) {
        payload.append('_method', 'PUT');
        await fetchApi(`/locations/${editingId}`, {
          method: 'POST',
          body: payload,
        });
      } else {
        await fetchApi('/locations', {
          method: 'POST',
          body: payload,
        });
      }
      
      setIsFormOpen(false);
      setEditingId(null);
      setFeaturedImage(null);
      setFeaturedVideo(null);
      setImages(null);
      setVideos(null);
      setExistingMedia(null);
      setFormData({ name: '', type: 'head_office', address: '', phone: '', email: '', is_active: 1 });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save location');
    }
  };

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setFormData({
      name: row.name || '',
      type: row.type || 'head_office',
      address: row.address || '',
      phone: row.phone || '',
      email: row.email || '',
      is_active: row.is_active ? 1 : 0
    });
    setExistingMedia({
      featuredImage: row.featured_image,
      featuredVideo: row.featured_video,
      images: row.images || [],
      videos: row.videos || []
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (row: any) => {
    if (confirm(`Are you sure you want to delete ${row.name}?`)) {
      try {
        await fetchApi(`/locations/${row.id}`, { method: 'DELETE' });
        loadData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete location');
      }
    }
  };

  const loadTables = async (locationId: number) => {
    try {
      setTablesLoading(true);
      const res = await fetchApi(`/locations/${locationId}/tables`);
      setTables(res.data || res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setTablesLoading(false);
    }
  };

  const handleManageTables = (location: any) => {
    setManagingTablesFor(location);
    loadTables(location.id);
  };

  const handleTableInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTableFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingTablesFor) return;
    try {
      const payload = {
        name: tableFormData.name,
        capacity: parseInt(tableFormData.capacity as any),
        is_active: parseInt(tableFormData.is_active as any) === 1
      };
      await fetchApi(`/locations/${managingTablesFor.id}/tables`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setTableFormData({ name: '', capacity: 4, is_active: 1 });
      loadTables(managingTablesFor.id);
    } catch (err) {
      console.error(err);
      alert('Failed to create table');
    }
  };

  const handleDeleteTable = async (tableRow: any) => {
    if (!managingTablesFor) return;
    if (confirm(`Are you sure you want to delete table ${tableRow.name}?`)) {
      try {
        await fetchApi(`/tables/${tableRow.id}`, { method: 'DELETE' });
        loadTables(managingTablesFor.id);
      } catch (err) {
        console.error(err);
        alert('Failed to delete table');
      }
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Branch Name' },
    { key: 'type', label: 'Type', render: (row: any) => row.type_title || (row.type ? row.type.replace('_', ' ').toUpperCase() : '') },
    { key: 'phone', label: 'Phone' },
    { key: 'is_active', label: 'Active', render: (row: any) => row.is_active ? 'Yes' : 'No' },
    { 
      key: 'tables', 
      label: 'Tables', 
      render: (row: any) => (
        <button 
          onClick={() => handleManageTables(row)} 
          className="btn btn-xs btn-outline btn-primary"
        >
          Manage Tables
        </button>
      ) 
    }
  ];

  const tableColumns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Table Name/No.' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'is_active', label: 'Status', render: (row: any) => (
      <span className={`badge ${row.is_active ? 'badge-success' : 'badge-ghost'} badge-sm`}>
        {row.is_active ? 'Active' : 'Inactive'}
      </span>
    )}
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>Locations Management</h1>
          <Button onClick={() => {
          setIsFormOpen(!isFormOpen);
          setEditingId(null);
          setExistingMedia(null);
          setFormData({ name: '', type: 'head_office', address: '', phone: '', email: '', is_active: 1 });
        }}>
          {isFormOpen ? 'Close Form' : '+ New Location'}
        </Button>
      </div>

      {isFormOpen && (
        <Card title={editingId ? 'Edit Location' : 'New Location'} style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Name" name="name" value={formData.name} onChange={handleInputChange} required />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)' }}>Location Type</label>
              <select 
                style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit' }} 
                name="type" 
                value={formData.type} 
                onChange={handleInputChange}
              >
                {locationTypes.length > 0 ? (
                  locationTypes.map(lt => (
                    <option key={lt.slug} value={lt.slug}>{lt.title}</option>
                  ))
                ) : (
                  <>
                    <option value="head_office">Head Office</option>
                    <option value="branch">Branch</option>
                  </>
                )}
              </select>
            </div>

            <Input label="Phone" name="phone" value={formData.phone} onChange={handleInputChange} required />
            <Input label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
            
            <div style={{ gridColumn: '1 / -1' }}>
              <Input label="Address" name="address" value={formData.address} onChange={handleInputChange} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)' }}>Status</label>
              <select 
                style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit' }} 
                name="is_active" 
                value={formData.is_active} 
                onChange={handleInputChange}
              >
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)' }}>Featured Image</label>
              {existingMedia?.featuredImage && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <img src={`/storage/${existingMedia.featuredImage.url}`} alt="Featured" style={{ height: '80px', borderRadius: '4px', objectFit: 'cover' }} />
                </div>
              )}
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setFeaturedImage(e.target.files?.[0] || null)}
                style={{ padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)' }}>Featured Video</label>
              {existingMedia?.featuredVideo && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <video 
                    src={`/storage/${existingMedia.featuredVideo.url}`} 
                    controls 
                    style={{ height: '120px', borderRadius: '4px', objectFit: 'cover' }} 
                  />
                </div>
              )}
              <input 
                type="file" 
                accept="video/*"
                onChange={(e) => setFeaturedVideo(e.target.files?.[0] || null)}
                style={{ padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)' }}>Images (Multiple)</label>
              {existingMedia?.images?.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '0.5rem' }}>
                  {existingMedia.images.map((img: any) => (
                    <img key={img.id} src={`/storage/${img.url}`} alt="Gallery" style={{ height: '60px', borderRadius: '4px', objectFit: 'cover' }} />
                  ))}
                </div>
              )}
              <input 
                type="file" 
                multiple 
                accept="image/*"
                onChange={(e) => setImages(e.target.files)}
                style={{ padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)' }}>Videos (Multiple)</label>
              <input 
                type="file" 
                multiple 
                accept="video/*"
                onChange={(e) => setVideos(e.target.files)}
                style={{ padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
            </div>
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary">{editingId ? 'Update Location' : 'Create Location'}</Button>
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? <p>Loading locations...</p> : <Table columns={columns} data={locations} onEdit={handleEdit} onDelete={handleDelete} />}
      </Card>

      {/* Manage Tables Modal/Overlay */}
      {managingTablesFor && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-4xl">
            <h3 className="font-bold text-lg mb-4">Managing Tables for {managingTablesFor.name}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Add Table Form */}
              <div className="md:col-span-1">
                <Card title="Add New Table">
                  <form onSubmit={handleTableSubmit} className="flex flex-col gap-4">
                    <Input label="Table Name/Number" name="name" value={tableFormData.name} onChange={handleTableInputChange} required />
                    
                    <Input label="Capacity (Persons)" type="number" name="capacity" value={tableFormData.capacity as any} onChange={handleTableInputChange} required min={1} />
                    
                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-sm text-base-content/70">Status</label>
                      <select 
                        className="select select-bordered w-full"
                        name="is_active" 
                        value={tableFormData.is_active} 
                        onChange={handleTableInputChange}
                      >
                        <option value={1}>Active</option>
                        <option value={0}>Inactive</option>
                      </select>
                    </div>

                    <Button type="submit" variant="primary" className="mt-2">Add Table</Button>
                  </form>
                </Card>
              </div>

              {/* Tables List */}
              <div className="md:col-span-2">
                <Card title={`Current Tables (${tables.length})`}>
                  {tablesLoading ? (
                    <p>Loading tables...</p>
                  ) : (
                    <Table 
                      columns={tableColumns} 
                      data={tables} 
                      onDelete={handleDeleteTable} 
                    />
                  )}
                </Card>
              </div>
            </div>

            <div className="modal-action">
              <button className="btn" onClick={() => setManagingTablesFor(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}