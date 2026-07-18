'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function DeliveryPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  
  const [riders, setRiders] = useState<any[]>([]);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    order_id: '',
    rider_id: '',
    address: '',
    delivery_charge: '0.00',
    status: 'Pending'
  });
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    loadData();
    loadOrders();
    loadRiders();
  }, []);

  const loadRiders = async () => {
    try {
      const res = await fetchApi('/users?nopaginate=1');
      const allUsers = res.data || res || [];
      const riderUsers = allUsers.filter((u: any) => u.roles && u.roles.some((r: any) => r.name === 'rider'));
      setRiders(riderUsers);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/deliveries');
      setDeliveries(res.data || res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await fetchApi('/orders?nopaginate=1');
      const allOrders = res.data || res || [];
      const deliverable = allOrders.filter((o: any) => o.order_type === 'delivery');
      setOrders(deliverable);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        ...formData,
        order_id: parseInt(formData.order_id),
        rider_id: formData.rider_id ? parseInt(formData.rider_id) : null
      };
      
      if (editingId) {
        await fetchApi(`/deliveries/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/deliveries', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({ order_id: '', rider_id: '', address: '', delivery_charge: '0.00', status: 'Pending' });
      loadData();
      loadOrders();
    } catch (err) {
      console.error(err);
      alert('Failed to save delivery assignment');
    }
  };

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setFormData({
      order_id: row.order_id || '',
      rider_id: row.rider_id || '',
      address: row.address || '',
      delivery_charge: row.delivery_charge || '0.00',
      status: row.status || 'Pending'
    });
    setIsFormOpen(true);
  };

  const handleAssignOrder = (order: any) => {
    setIsFormOpen(true);
    setEditingId(null);
    setFormData({
      order_id: order.id.toString(),
      rider_id: '',
      address: order.delivery_address || (order.customer ? order.customer.address : ''),
      delivery_charge: order.delivery_charge || '0.00',
      status: 'Pending'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (row: any) => {
    if (confirm(`Are you sure you want to cancel this delivery assignment?`)) {
      try {
        await fetchApi(`/deliveries/${row.id}`, { method: 'DELETE' });
        loadData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete delivery');
      }
    }
  };

  const columns = [
    { key: 'id', label: 'Delivery ID' },
    { key: 'order_id', label: 'Order ID' },
    { key: 'rider_id', label: 'Rider ID' },
    { key: 'status', label: 'Status' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>Delivery & Riders</h1>
        <Button onClick={() => {
          setIsFormOpen(!isFormOpen);
          setEditingId(null);
        }}>
          {isFormOpen ? 'Close Form' : '+ Assign Delivery'}
        </Button>
      </div>

      {isFormOpen && (
        <Card title={editingId ? 'Edit Assignment' : 'Assign Delivery'} style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Order ID" name="order_id" type="number" value={formData.order_id} onChange={handleInputChange} required />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)' }}>Assign Rider</label>
              <select 
                style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit' }} 
                name="rider_id" value={formData.rider_id} onChange={handleInputChange}
              >
                <option value="">-- Select Rider (Optional) --</option>
                {riders
                  .filter((rider) => {
                    if (!formData.order_id) return true;
                    const selectedOrder = orders.find((o: any) => o.id.toString() === formData.order_id);
                    if (selectedOrder && selectedOrder.location_id) {
                      return rider.location_id === selectedOrder.location_id;
                    }
                    return true;
                  })
                  .map(rider => (
                  <option key={rider.id} value={rider.id}>{rider.name} ({rider.location?.name || 'No Branch'})</option>
                ))}
              </select>
            </div>
            <Input label="Delivery Charge" name="delivery_charge" type="number" step="0.01" value={formData.delivery_charge} onChange={handleInputChange} required />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)' }}>Status</label>
              <select 
                style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit' }} 
                name="status" value={formData.status} onChange={handleInputChange}
              >
                <option value="Pending">Pending</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Failed">Failed</option>
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)', display: 'block', marginBottom: '0.5rem' }}>Delivery Address</label>
              <textarea 
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit', minHeight: '80px' }}
                name="address" value={formData.address} onChange={handleInputChange} required
              />
            </div>
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary">{editingId ? 'Update Delivery' : 'Assign Delivery'}</Button>
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <Card title="Deliverable Orders">
          {loadingOrders ? (
            <p>Loading deliverable orders...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full text-sm">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Address</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-4">No deliverable orders found</td></tr>
                  ) : (
                    orders.map((order) => {
                      const isAssigned = deliveries.some(d => d.order_id === order.id);
                      return (
                        <tr key={order.id}>
                          <td className="font-semibold">#{order.id}</td>
                          <td>{order.customer?.name || 'Walk-in'}</td>
                          <td className="max-w-xs truncate" title={order.delivery_address || (order.customer ? order.customer.address : '')}>
                            {order.delivery_address || (order.customer ? order.customer.address : 'No address provided')}
                          </td>
                          <td>৳{Number(order.total).toFixed(2)}</td>
                          <td>
                            <span className={`badge ${order.status === 'completed' ? 'badge-success' : 'badge-warning'} badge-sm`}>
                              {order.status}
                            </span>
                          </td>
                          <td>
                            <Button 
                              variant={isAssigned ? "secondary" : "primary"} 
                              onClick={() => handleAssignOrder(order)}
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                            >
                              {isAssigned ? 'Reassign' : 'Assign Rider'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Assigned Deliveries">
          {loading ? <p>Loading deliveries...</p> : <Table columns={columns} data={deliveries} onEdit={handleEdit} onDelete={handleDelete} />}
        </Card>
      </div>
    </div>
  );
}