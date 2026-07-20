'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { fetchApi } from '@/lib/api';
import { ChefHat, CheckCircle } from 'lucide-react';

export default function KitchenKiosk() {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  const loadOrders = async () => {
    try {
      const res = await fetchApi(`/orders?nopaginate=1&statuses=pending,cooking&_t=${Date.now()}`);
      let data = res.data || res || [];
      
      // Sort: older orders first
      data.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      setAllOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApi('/locations').then(res => {
      const locs = res.data || res || [];
      setLocations(locs);
      
      let savedLoc = null;
      if (typeof window !== 'undefined') {
        savedLoc = localStorage.getItem('restora_active_location_id');
      }
      
      if (savedLoc && locs.some((l: any) => l.id === Number(savedLoc))) {
        setActiveLocationId(Number(savedLoc));
      } else if (locs.length > 0) {
        setActiveLocationId(locs[0].id);
        if (typeof window !== 'undefined') {
          localStorage.setItem('restora_active_location_id', locs[0].id.toString());
        }
      }
    }).catch(console.error);

    loadOrders();
    const interval = setInterval(loadOrders, 10000); // 10 seconds auto-refresh
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    setProcessing(id);
    try {
      await fetchApi(`/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
      await loadOrders();
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setProcessing(null);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!activeLocationId) return allOrders;
    return allOrders.filter(o => o.location_id === activeLocationId);
  }, [allOrders, activeLocationId]);

  if (loading && allOrders.length === 0) return <div className="flex justify-center items-center min-h-[50vh]"><span className="loading loading-spinner text-primary loading-lg"></span></div>;

  return (
    <div className="bg-base-200 min-h-screen p-4 sm:p-6 -m-6 text-base-content relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <ChefHat size={28} /> Kitchen Display System
          </h1>
          {locations.length > 0 && (
            <select 
              value={activeLocationId || ''}
              onChange={(e) => {
                const id = Number(e.target.value);
                setActiveLocationId(id);
                if (typeof window !== 'undefined') localStorage.setItem('restora_active_location_id', id.toString());
              }}
              className="select select-sm select-bordered"
              style={{ fontWeight: 600, color: '#4b5563' }}
            >
              <option value="" disabled>Select Location</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>📍 {loc.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost btn-sm bg-base-100 border border-base-300" onClick={loadOrders}>
            Refresh
          </button>
          <div className="text-sm opacity-70 flex items-center gap-2 font-medium">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
            </span>
            Live Sync Active
          </div>
        </div>
      </div>
      
      {filteredOrders.length === 0 ? (
        <div className="text-center py-32 bg-base-100 rounded-2xl shadow-sm border border-base-300">
          <CheckCircle size={64} className="mx-auto text-success/50 mb-4" />
          <h2 className="text-2xl font-semibold opacity-80">Kitchen is clear!</h2>
          <p className="opacity-50 text-sm mt-2">No pending or cooking orders for this location.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredOrders.map(order => (
            <div key={order.id} className={`flex flex-col bg-base-100 p-5 rounded-2xl shadow-md border-t-4 transition-all ${order.status === 'cooking' ? 'border-t-info' : 'border-t-warning'}`}>
              <div className="flex justify-between items-start mb-4 pb-3 border-b border-base-200">
                <div>
                  <h2 className="text-xl font-black text-base-content">
                    {order.table?.name || (order.order_type || '').replace('_', ' ').toUpperCase()}
                  </h2>
                  <p className="text-sm opacity-60">Order #{order.id}</p>
                </div>
                <div className="text-right">
                  <span className={`badge font-bold ${order.status === 'cooking' ? 'badge-info text-white' : 'badge-warning'}`}>
                    {(order.status || '').toUpperCase()}
                  </span>
                  <div className="text-xs opacity-60 mt-1 font-mono">
                    {order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                {order.items?.map((item: any, idx: number) => {
                  const imgUrl = item.product?.images?.[0]?.url;
                  return (
                    <div key={idx} className="flex gap-3 bg-base-200/50 p-2.5 rounded-lg items-center">
                      <span className="font-black text-lg text-primary shrink-0">{item.quantity || item.qty}x</span>
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-base-300 shrink-0 border border-base-200 flex items-center justify-center">
                        {imgUrl ? (
                          <img src={`/storage/${imgUrl}`} alt={item.product?.name} className="w-full h-full object-cover" />
                        ) : (
                          <ChefHat size={16} className="text-base-content/30" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-base block truncate">{item.product?.name || `Item #${item.product_id}`}</span>
                        {item.notes && <p className="text-sm text-error mt-0.5 italic font-medium break-words">* {item.notes}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-auto pt-4 border-t border-base-200">
                {order.status === 'pending' ? (
                  <button 
                    className="btn btn-info w-full text-white text-lg font-bold h-12" 
                    onClick={() => handleUpdateStatus(order.id, 'cooking')}
                    disabled={processing === order.id}
                  >
                    {processing === order.id ? <span className="loading loading-spinner"></span> : 'Start Cooking'}
                  </button>
                ) : (
                  <button 
                    className="btn btn-success w-full text-white text-lg font-bold h-12" 
                    onClick={() => handleUpdateStatus(order.id, 'cooked')}
                    disabled={processing === order.id}
                  >
                    {processing === order.id ? <span className="loading loading-spinner"></span> : 'Mark as Cooked'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}