'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import DiscountInput from '../pos/components/DiscountInput';
import { ChefHat, CheckCircle, XCircle, RefreshCw, Package, Truck, DollarSign, CreditCard, Banknote, Smartphone, Printer, Tag, Clock, MapPin } from 'lucide-react';

const statusConfig: Record<string, { badge: string; label: string }> = {
  pending: { badge: 'badge-warning', label: 'Pending' },
  cooking: { badge: 'badge-info', label: 'Cooking' },
  cooked: { badge: 'badge-success', label: 'Cooked' },
  served: { badge: 'badge-primary', label: 'Served' },
  packed: { badge: 'badge-primary', label: 'Packed' },
  picked: { badge: 'badge-secondary', label: 'Picked Up' },
  delivered: { badge: 'badge-accent', label: 'Delivered' },
  paid: { badge: 'badge-neutral', label: 'Paid' },
};

const getNextActions = (type: string, status: string) => {
  if (status === 'pending') return [{ label: 'Cook', status: 'cooking', icon: ChefHat, color: 'btn-info' }];
  if (status === 'cooking') return [{ label: 'Cooked', status: 'cooked', icon: CheckCircle, color: 'btn-success' }];
  
  if (type === 'dine_in') {
    if (status === 'cooked') return [{ label: 'Serve', status: 'served', icon: CheckCircle, color: 'btn-primary' }];
  } else if (type === 'takeaway') {
    if (status === 'cooked') return [{ label: 'Pack', status: 'packed', icon: Package, color: 'btn-primary' }];
  } else if (type === 'delivery' || type === 'catering') {
    if (status === 'cooked') return [{ label: 'Pack', status: 'packed', icon: Package, color: 'btn-primary' }];
    if (status === 'packed') return [{ label: 'Pick Up', status: 'picked', icon: Truck, color: 'btn-secondary' }];
    if (status === 'picked') return [{ label: 'Deliver', status: 'delivered', icon: CheckCircle, color: 'btn-accent' }];
  }

  return [];
};

// Component for the ticking timer
const LiveTimer = ({ placedAt }: { placedAt: string }) => {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(placedAt).getTime()) / 1000);
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(`${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [placedAt]);
  return <span className="font-mono text-xs opacity-80 flex items-center gap-1"><Clock size={12}/> {elapsed}</span>;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('dine_in');
  const [sortDineIn, setSortDineIn] = useState('time'); // 'time' | 'table'
  const [sortOthers, setSortOthers] = useState('time'); // 'time' | 'delivery_time'
  
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);

  useEffect(() => {
    loadOrders();
    fetchApi('/discounts').then(res => setDiscounts(res.data || res || [])).catch(console.error);
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
    
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      const res = await fetchApi('/orders?nopaginate=1');
      setOrders(res.data || res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (order: any, newStatus: string) => {
    if (newStatus === 'pay_modal') {
      setPaymentMethod('cash');
      setPaymentOrder(order);
      const existingDiscount = order.discount_id ? discounts.find(d => d.id === order.discount_id) : null;
      setAppliedDiscount(existingDiscount || null);
      (document.getElementById('payment_modal') as HTMLDialogElement)?.showModal();
      return;
    }
    try {
      await fetchApi(`/orders/${order.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
      loadOrders();
    } catch { alert('Failed to update order status'); }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Cancel this order?')) {
      try {
        await fetchApi(`/orders/${id}`, { method: 'DELETE' });
        loadOrders();
      } catch { alert('Failed to cancel order'); }
    }
  };

  // Payment Recalculations
  const modalSubtotal = paymentOrder ? parseFloat(paymentOrder.subtotal) : 0;
  const modalDiscountAmt = appliedDiscount 
    ? (appliedDiscount.discount_type === 'percentage' ? modalSubtotal * (parseFloat(appliedDiscount.value || '0') / 100) : parseFloat(appliedDiscount.value || '0'))
    : 0;
  const modalAfterDiscount = modalSubtotal - modalDiscountAmt;
  const modalTax = modalAfterDiscount * 0.1;
  const modalDelivery = paymentOrder ? parseFloat(paymentOrder.delivery_charge || '0') : 0;
  const modalTotal = modalAfterDiscount + modalTax + modalDelivery;

  const submitPayment = async () => {
    if (!paymentOrder) return;
    setProcessing(true);
    try {
      await fetchApi(`/orders/${paymentOrder.id}`, { 
        method: 'PUT', 
        body: JSON.stringify({ 
          payment_method: paymentMethod, discount_id: appliedDiscount?.id || null,
          discount_amount: modalDiscountAmt.toFixed(2), delivery_charge: modalDelivery.toFixed(2),
          tax_amount: modalTax.toFixed(2), total: modalTotal.toFixed(2)
        }) 
      });
      (document.getElementById('payment_modal') as HTMLDialogElement)?.close();
      setPaymentOrder(null);
      loadOrders();
    } catch { 
      alert('Failed to process payment'); 
    } finally { setProcessing(false); }
  };

  const renderActions = (order: any) => {
    const actions = getNextActions(order.order_type, order.status);
    return (
      <div className="flex gap-1 flex-wrap mt-3 pt-3 border-t border-base-200">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <button key={action.status} className={`btn btn-xs gap-1 ${action.color}`} onClick={() => handleUpdateStatus(order, action.status)}>
              <Icon size={12} /> {action.label}
            </button>
          );
        })}
        {order.payment_status !== 'paid' && (
          <button className="btn btn-xs btn-success gap-1" onClick={() => handleUpdateStatus(order, 'pay_modal')}>
            <DollarSign size={12} /> Pay
          </button>
        )}
        {(order.status === 'pending' || order.status === 'cooking') && (
          <button className="btn btn-xs btn-error btn-outline gap-1" onClick={() => handleDelete(order.id)}>
            <XCircle size={12} /> Cancel
          </button>
        )}
        <div className="ml-auto flex gap-1">
          <button className="btn btn-xs btn-ghost border border-base-300 text-info hover:bg-info/10" onClick={() => window.open(`/kitchen-print/${order.id}`, '_blank')} title="Print Kitchen Ticket">
            <ChefHat size={12} />
          </button>
          <button className="btn btn-xs btn-ghost border border-base-300" onClick={() => window.open(`/receipt/${order.id}`, '_blank')} title="Print Receipt">
            <Printer size={12} />
          </button>
        </div>
      </div>
    );
  };

  const renderOrderCard = (order: any) => {
    const s = statusConfig[order.status] || { badge: 'badge-ghost', label: order.status || 'Pending' };
    const showLogistics = ['delivery', 'catering'].includes(order.order_type);
    
    return (
      <div key={order.id} className="bg-base-100 border border-base-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="font-extrabold text-lg text-primary mb-0.5">
              {order.table?.name || (order.order_type ? order.order_type.replace('_', ' ').toUpperCase() : 'NO TABLE')}
            </div>
            <div className="text-xs text-base-content/60">Order #{order.id} • {order.customer?.name || 'Walk-in'}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`badge ${s.badge} badge-sm font-bold shadow-sm`}>{s.label}</span>
            <span className={`badge ${order.payment_status === 'paid' ? 'badge-success text-white' : 'badge-error text-white'} badge-sm font-bold shadow-sm`}>
              {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
            </span>
          </div>
        </div>
        
        {showLogistics && (
          <div className="mb-3 bg-blue-50/50 p-2 rounded-lg border border-blue-100/50">
            <div className="text-xs font-semibold mb-1 flex items-center gap-1">
              <Clock size={12} className="text-primary"/> 
              {order.delivery_time ? new Date(order.delivery_time).toLocaleString() : 'ASAP'}
            </div>
            <div className="text-[10px] opacity-80 flex items-start gap-1">
              <MapPin size={12} className="mt-0.5 text-error flex-shrink-0" />
              <span className="line-clamp-2">{order.delivery_address || 'No address provided'}</span>
            </div>
            {order.latitude && order.longitude && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`} target="_blank" className="text-[10px] text-blue-500 hover:underline mt-1 inline-block">
                View on Maps
              </a>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-3 bg-base-200/50 p-2 rounded-lg">
          <LiveTimer placedAt={order.created_at} />
          <span className="font-bold text-sm">৳{order.total}</span>
        </div>

        <div className="flex-1 overflow-y-auto mb-1 pr-1 text-sm space-y-2" style={{ maxHeight: '120px' }}>
          {order.items?.map((item: any) => {
            const imgUrl = item.product?.images?.[0]?.url;
            return (
              <div key={item.id} className="flex items-center gap-2 text-base-content/80 bg-base-100 p-1 rounded-md border border-base-200 shadow-sm">
                <div className="w-8 h-8 rounded overflow-hidden bg-base-200 flex-shrink-0 flex items-center justify-center">
                  {imgUrl ? (
                    <img src={`/storage/${imgUrl}`} alt={item.product?.name} className="w-full h-full object-cover" />
                  ) : (
                    <ChefHat size={14} className="text-base-content/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-xs font-semibold">{order.order_type === 'delivery' && !item.product?.name ? `Item ${item.product_id}` : (item.product?.name || `Item ${item.product_id}`)}</div>
                  <div className="text-[10px] opacity-70">Qty: {item.qty}</div>
                </div>
              </div>
            );
          })}
        </div>

        {renderActions(order)}
      </div>
    );
  };

  // Filter & Sort Logic
  const filteredOrders = useMemo(() => {
    let current = orders.filter(o => {
      if (activeLocationId && o.location_id !== activeLocationId) return false;
      if (activeTab === 'all_orders') return true;
      const isCompleted = (o.status === 'served' || o.status === 'delivered' || (o.status === 'packed' && o.order_type === 'takeaway')) && o.payment_status === 'paid';
      return o.order_type === activeTab && !isCompleted;
    });
    
    if (activeTab === 'dine_in') {
      current.sort((a, b) => {
        if (sortDineIn === 'table') return (a.table?.name || '').localeCompare(b.table?.name || '');
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    } else {
      current.sort((a, b) => {
        if (sortOthers === 'delivery_time' && a.delivery_time && b.delivery_time) {
          return new Date(a.delivery_time).getTime() - new Date(b.delivery_time).getTime();
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    }
    return current;
  }, [orders, activeTab, sortDineIn, sortOthers, activeLocationId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h1 className="text-2xl font-bold">Order Management</h1>
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
        <button className="btn btn-ghost btn-sm gap-2 self-start md:self-auto" onClick={loadOrders}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="tabs tabs-boxed bg-base-100 border border-base-200 p-1 font-semibold flex-nowrap overflow-x-auto justify-start hide-scrollbar">
        {['all_orders', 'dine_in', 'takeaway', 'delivery', 'catering'].map(tab => (
          <a key={tab} className={`tab tab-sm md:tab-md lg:tab-lg whitespace-nowrap ${activeTab === tab ? 'tab-active' : ''} capitalize`} onClick={() => setActiveTab(tab)}>
            {tab.replace('_', '-')}
          </a>
        ))}
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
          <h2 className="text-lg font-bold capitalize">{activeTab.replace('_', '-')} Orders</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-base-content/60">Sort by:</span>
            {activeTab === 'dine_in' ? (
              <select className="select select-bordered select-sm" value={sortDineIn} onChange={e => setSortDineIn(e.target.value)}>
                <option value="time">Placement Time</option>
                <option value="table">Table Number</option>
              </select>
            ) : (
              <select className="select select-bordered select-sm" value={sortOthers} onChange={e => setSortOthers(e.target.value)}>
                <option value="time">Placement Time</option>
                <option value="delivery_time">Delivery/Event Time</option>
              </select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><span className="loading loading-spinner loading-lg text-primary" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-base-content/40 bg-base-200/50 rounded-xl border border-dashed border-base-300">
            <Package size={48} className="mx-auto mb-3 opacity-30" />
            <p>No active {activeTab.replace('_', '-')} orders.</p>
          </div>
        ) : (
          activeTab === 'dine_in' ? (
            /* DINE-IN VISUAL GRID */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredOrders.map(order => renderOrderCard(order))}
            </div>
          ) : (
            /* LIST VIEW FOR ALL ORDERS, TAKEAWAY, DELIVERY, CATERING */
            <>
              <div className="grid grid-cols-1 md:hidden gap-4">
                {filteredOrders.map(order => renderOrderCard(order))}
              </div>
              <div className="hidden md:block overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Order Info</th>
                    {activeTab === 'all_orders' && <th>Type</th>}
                    {['delivery', 'catering'].includes(activeTab) && <th>Logistics</th>}
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => {
                    const s = statusConfig[order.status] || { badge: 'badge-ghost', label: order.status || 'Pending' };
                    return (
                      <tr key={order.id} className="hover">
                        <td>
                          <div className="font-bold">#{order.id}</div>
                          <div className="text-xs opacity-70">Placed: {new Date(order.created_at).toLocaleTimeString()}</div>
                          {order.customer && <div className="text-xs text-info mt-1 font-semibold">{order.customer.name}</div>}
                        </td>
                        {activeTab === 'all_orders' && (
                          <td className="capitalize font-medium text-base-content/80">{order.order_type.replace('_', '-')}</td>
                        )}
                        {['delivery', 'catering'].includes(activeTab) && (
                          <td className="max-w-xs">
                            <div className="text-sm font-semibold mb-1 flex items-center gap-1">
                              <Clock size={12} className="text-primary"/> 
                              {order.delivery_time ? new Date(order.delivery_time).toLocaleString() : 'ASAP'}
                            </div>
                            <div className="text-xs opacity-80 flex items-start gap-1">
                              <MapPin size={12} className="mt-0.5 text-error flex-shrink-0" />
                              <span className="line-clamp-2">{order.delivery_address || 'No address provided'}</span>
                            </div>
                            {order.latitude && order.longitude && (
                              <a href={`https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`} target="_blank" className="text-[10px] text-blue-500 hover:underline mt-1 inline-block">
                                View on Maps
                              </a>
                            )}
                          </td>
                        )}
                        <td className="font-bold text-primary">৳{order.total}</td>
                        <td>
                          <div className="flex flex-col gap-1">
                            <span className={`badge badge-sm ${s.badge}`}>{s.label}</span>
                            <span className={`badge badge-sm ${order.payment_status === 'paid' ? 'badge-success text-white' : 'badge-error text-white'}`}>
                              {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                            </span>
                          </div>
                        </td>
                        <td>{renderActions(order)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </>
          )
        )}
      </Card>

      <dialog id="payment_modal" className="modal">
        <div className="modal-box p-0 overflow-hidden max-w-md bg-base-100">
          <div className="bg-gradient-to-r from-primary to-secondary p-6 text-primary-content text-center relative">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 text-white" onClick={() => (document.getElementById('payment_modal') as HTMLDialogElement)?.close()}>✕</button>
            <h3 className="font-bold text-xl mb-1 flex items-center justify-center gap-2">
              <DollarSign size={24} /> Complete Payment
            </h3>
            {paymentOrder && <p className="opacity-80 text-sm">Order #{paymentOrder.id}</p>}
          </div>
          
          <div className="p-6">
            {paymentOrder && (
              <div className="bg-base-200/50 border border-base-300 p-5 rounded-2xl mb-5 text-center shadow-inner">
                <p className="text-sm font-semibold text-base-content/60 uppercase tracking-wider mb-1">Amount Due</p>
                <p className="text-4xl font-extrabold text-base-content">৳{modalTotal.toFixed(2)}</p>
                
                <div className="mt-4 pt-3 border-t border-base-300/50 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-base-content/60 px-2">
                  <span>Sub: ৳{modalSubtotal.toFixed(2)}</span>
                  {modalDiscountAmt > 0 && <span className="text-success font-semibold">-৳{modalDiscountAmt.toFixed(2)}</span>}
                  <span>Tax: ৳{modalTax.toFixed(2)}</span>
                  {modalDelivery > 0 && <span>Del: ৳{modalDelivery.toFixed(2)}</span>}
                </div>
              </div>
            )}

            <div className="mb-6 bg-base-100 p-4 rounded-xl border border-base-200 shadow-sm">
              <label className="label px-0 pt-0 pb-2 flex items-center gap-2"><Tag size={14} className="text-primary" /><span className="label-text font-bold text-base-content/80">Apply Coupon</span></label>
              <DiscountInput discounts={discounts} appliedDiscount={appliedDiscount} onApply={setAppliedDiscount} subtotal={modalSubtotal} />
            </div>

            <div className="mb-8">
              <label className="label px-0 pt-0"><span className="label-text font-bold text-base-content/80">Select Payment Method</span></label>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setPaymentMethod('cash')} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${paymentMethod === 'cash' ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-base-200 bg-base-100 hover:border-primary/30 hover:bg-base-200'}`}>
                  <Banknote size={28} className="mb-2" /><span className="font-semibold text-sm">Cash</span>
                </button>
                <button onClick={() => setPaymentMethod('card')} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${paymentMethod === 'card' ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-base-200 bg-base-100 hover:border-primary/30 hover:bg-base-200'}`}>
                  <CreditCard size={28} className="mb-2" /><span className="font-semibold text-sm">Card</span>
                </button>
                <button onClick={() => setPaymentMethod('mfs')} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${paymentMethod === 'mfs' ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-base-200 bg-base-100 hover:border-primary/30 hover:bg-base-200'}`}>
                  <Smartphone size={28} className="mb-2" /><span className="font-semibold text-sm">MFS</span>
                </button>
              </div>
            </div>

            <button className="btn btn-primary w-full btn-lg rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all" onClick={submitPayment} disabled={processing}>
              {processing ? <span className="loading loading-spinner"></span> : `Confirm ৳${modalTotal.toFixed(2)}`}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}