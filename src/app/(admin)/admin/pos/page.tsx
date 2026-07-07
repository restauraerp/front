'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { fetchApi } from '@/lib/api';
import {
  ShoppingBag, Trash2, Plus, Minus, CreditCard, RefreshCw,
  Search, MessageSquare, Pause, Play, ChevronDown, ChevronUp,
  ChefHat, Package
} from 'lucide-react';
import OrderTypeSelector from './components/OrderTypeSelector';
import TableSelector from './components/TableSelector';
import CustomerPicker from './components/CustomerPicker';
import DiscountInput from './components/DiscountInput';
import AddressAutocomplete from '@/components/ui/AddressAutocomplete';

interface CartItem {
  id: number; name: string; price: string; qty: number; notes: string;
  images?: { url: string }[];
}
interface HeldOrder { id: number; items: CartItem[]; orderType: string; tableId: number | null; customerId: number | null; }

export default function POS() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});

  // New state for restaurant features
  const [locations, setLocations] = useState<any[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<number | null>(null);
  const [orderType, setOrderType] = useState('dine_in');
  const [tables, setTables] = useState<any[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [showOrderConfig, setShowOrderConfig] = useState(true);

  const currency = settings.currency_symbol || '৳';

  useEffect(() => {
    Promise.all([
      fetchApi('/products?nopaginate=1'),
      fetchApi('/website-settings'),
      fetchApi('/product-categories?nopaginate=1'),
      fetchApi('/customers?nopaginate=1'),
      fetchApi('/discounts'),
      fetchApi('/locations'),
    ])
      .then(([prodRes, setRes, catRes, custRes, discRes, locRes]) => {
        setProducts(prodRes.data || prodRes || []);
        const map: Record<string, string> = {};
        (setRes.data || setRes || []).forEach((s: any) => { map[s.key] = s.value; });
        setSettings(map);
        setCategories(catRes.data || catRes || []);
        setCustomers(custRes.data || custRes || []);
        setDiscounts(discRes.data || discRes || []);
        const locs = locRes.data || locRes || [];
        setLocations(locs);

        let savedLoc = null;
        if (typeof window !== 'undefined') {
          savedLoc = localStorage.getItem('restora_active_location_id');
        }

        if (savedLoc && locs.some((l: any) => l.id === Number(savedLoc))) {
          setActiveLocationId(Number(savedLoc));
        } else if (locs.length > 0 && !activeLocationId) {
          setActiveLocationId(locs[0].id);
          if (typeof window !== 'undefined') {
            localStorage.setItem('restora_active_location_id', locs[0].id.toString());
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Load tables when order type is dine_in or active location changes
  useEffect(() => {
    if (orderType === 'dine_in' && activeLocationId) {
      setTablesLoading(true);
      fetchApi(`/locations/${activeLocationId}/tables`)
        .then(res => setTables(res.data || res || []))
        .catch(() => setTables([]))
        .finally(() => setTablesLoading(false));
    } else {
      setSelectedTable(null);
    }
  }, [orderType, activeLocationId]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let list = products;

    // Filter by location availability
    if (activeLocationId) {
      list = list.filter(p => {
        if (!p.locations || p.locations.length === 0) return true;
        const loc = p.locations.find((l: any) => l.id === activeLocationId);
        return loc && loc.pivot && (loc.pivot.is_available === 1 || loc.pivot.is_available === true);
      });
    }

    if (selectedCategory) list = list.filter(p => p.category_id === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name?.toLowerCase().includes(q));
    }
    return list;
  }, [products, selectedCategory, searchQuery, activeLocationId]);

  const categoriesWithProducts = useMemo(() => {
    return categories
      .map(cat => ({ ...cat, productCount: products.filter(p => p.category_id === cat.id).length }))
      .filter(cat => cat.productCount > 0);
  }, [categories, products]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { ...product, qty: 1, notes: '' }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, qty: item.qty + delta } : item).filter(item => item.qty > 0));
  };

  const updateNotes = (id: number, notes: string) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, notes } : item));
  };

  const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.price || '0') * item.qty, 0);
  const discountAmount = appliedDiscount
    ? (appliedDiscount.discount_type === 'percentage'
      ? subtotal * (parseFloat(appliedDiscount.value || '0') / 100)
      : parseFloat(appliedDiscount.value || '0'))
    : 0;
  const afterDiscount = subtotal - discountAmount;
  const tax = afterDiscount * 0.1;
  const finalDeliveryCharge = orderType === 'delivery' ? deliveryCharge : 0;
  const total = afterDiscount + tax + finalDeliveryCharge;

  const holdOrder = () => {
    if (cart.length === 0) return;
    setHeldOrders(prev => [...prev, {
      id: Date.now(), items: [...cart], orderType, tableId: selectedTable, customerId: selectedCustomer,
    }]);
    setCart([]);
    setSelectedTable(null);
    setSelectedCustomer(null);
    setAppliedDiscount(null);
  };

  const recallOrder = (id: number) => {
    const order = heldOrders.find(o => o.id === id);
    if (!order) return;
    if (cart.length > 0) holdOrder(); // Hold current first
    setCart(order.items);
    setOrderType(order.orderType);
    setSelectedTable(order.tableId);
    setSelectedCustomer(order.customerId);
    setHeldOrders(prev => prev.filter(o => o.id !== id));
  };

  const handleAddCustomer = async (name: string, phone: string, email: string, address: string, orgName: string, googleMapLoc: string) => {
    const res = await fetchApi('/customers', {
      method: 'POST',
      body: JSON.stringify({ name, phone, email, address, organization_name: orgName, google_map_location: googleMapLoc }),
    });
    const newCustomer = res.data || res;
    setCustomers(prev => [...prev, newCustomer]);
    setSelectedCustomer(newCustomer.id);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckingOut(true);
    try {
      const res = await fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify({
          location_id: activeLocationId,
          order_type: orderType,
          status: 'pending',
          subtotal: subtotal.toFixed(2),
          tax_amount: tax.toFixed(2),
          discount_amount: discountAmount.toFixed(2),
          delivery_charge: finalDeliveryCharge.toFixed(2),
          total: total.toFixed(2),
          table_id: orderType === 'dine_in' ? selectedTable : null,
          customer_id: selectedCustomer,
          discount_id: appliedDiscount?.id || null,
          delivery_time: deliveryTime || null,
          delivery_address: deliveryAddress || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          items: cart.map(item => ({
            product_id: item.id, qty: item.qty, price: item.price, notes: item.notes || null,
          })),
        }),
      });
      const newOrder = res.data || res;
      setLastOrderId(newOrder.id);
      (document.getElementById('checkout_success') as HTMLDialogElement)?.showModal();
      setCart([]);
      setSelectedTable(null);
      setSelectedCustomer(null);
      setAppliedDiscount(null);
    } catch {
      alert('Failed to place order. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', height: 'calc(100vh - 4rem)' }}>
      {/* Left: Product Section */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header Row: Title + Search + Location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap' }}>Point of Sale</h1>

          {/* Location Switcher */}
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
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>📍 {loc.name}</option>
              ))}
            </select>
          )}

          <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '320px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products…"
              style={{
                width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '0.85rem',
                outline: 'none', background: 'white',
              }}
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: '0.4rem 0.85rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
              border: !selectedCategory ? '2px solid #6366f1' : '1px solid #e5e7eb',
              background: !selectedCategory ? '#6366f115' : 'white',
              color: !selectedCategory ? '#6366f1' : '#6b7280',
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
          >All Items</button>
          {categoriesWithProducts.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              style={{
                padding: '0.4rem 0.85rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
                border: selectedCategory === cat.id ? '2px solid #6366f1' : '1px solid #e5e7eb',
                background: selectedCategory === cat.id ? '#6366f115' : 'white',
                color: selectedCategory === cat.id ? '#6366f1' : '#6b7280',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}
            >
              {cat.name} <span style={{ opacity: 0.7, fontSize: '0.7rem', marginLeft: '0.15rem' }}>({cat.productCount})</span>
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary" /></div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 0', gap: '0.75rem', color: '#9ca3af' }}>
              <ShoppingBag size={40} />
              <p>{searchQuery || selectedCategory ? 'No matching products found.' : 'No products available.'}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: '0.75rem' }}>
              {filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  style={{
                    borderRadius: '14px', overflow: 'hidden', backgroundColor: 'white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer',
                    border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column',
                    textAlign: 'left', transition: 'all 0.15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = '#6366f1'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                  className="active:scale-95"
                >
                  <div style={{ height: '110px', width: '100%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {p.images && p.images.length > 0 ? (
                      <img src={`/storage/${p.images[0].url}`} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '1.75rem', fontWeight: 'bold' }}>{p.name?.substring(0, 2).toUpperCase() || '🍽️'}</span>
                    )}
                  </div>
                  <div style={{ padding: '0.65rem 0.75rem' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.82rem', lineHeight: 1.2, marginBottom: '0.15rem', color: '#1f2937' }}>{p.name}</p>
                    <p style={{ color: '#6366f1', fontWeight: 700, fontSize: '0.95rem' }}>{currency}{p.price}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart & Order Config */}
      <div style={{ width: '33.333%', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
        {/* Order Config Panel */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <button
            onClick={() => setShowOrderConfig(!showOrderConfig)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: showOrderConfig ? '0.6rem' : 0 }}
          >
            Order Settings
            {showOrderConfig ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showOrderConfig && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <OrderTypeSelector value={orderType} onChange={setOrderType} />
              {orderType === 'dine_in' && (
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.3rem' }}>SELECT TABLE</p>
                  <TableSelector tables={tables} selectedId={selectedTable} onSelect={setSelectedTable} loading={tablesLoading} />
                </div>
              )}
              {['takeaway', 'delivery', 'catering'].includes(orderType) && (
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.3rem' }}>{orderType === 'catering' ? 'DATE & TIME' : 'DELIVERY TIME'}</p>
                  <input type="datetime-local" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} className="input input-bordered input-sm w-full" style={{ fontSize: '0.8rem' }} />
                  <p style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: '0.1rem' }}>Leave empty for ASAP</p>
                </div>
              )}
              {['delivery', 'catering'].includes(orderType) && (
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.3rem' }}>DELIVERY ADDRESS</p>
                  <AddressAutocomplete
                    value={deliveryAddress}
                    onChange={(e: any) => setDeliveryAddress(e.target.value)}
                    onPlaceSelected={(addr, lat, lng) => {
                      setDeliveryAddress(addr);
                      setLatitude(lat ? lat.toString() : '');
                      setLongitude(lng ? lng.toString() : '');
                    }}
                    className="input input-bordered w-full p-2"
                    placeholder="Search with Google Maps..."
                    style={{ fontSize: '0.8rem', lineHeight: 1.2, height: '40px' }}
                  />
                  {latitude && longitude && (
                    <p style={{ fontSize: '0.65rem', color: '#10b981', marginTop: '0.2rem' }}>
                      ✓ Location pinpointed
                    </p>
                  )}
                </div>
              )}
              {orderType === 'delivery' && (
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.3rem' }}>DELIVERY CHARGE</p>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '0.8rem', fontWeight: 600 }}>{currency}</span>
                    <input
                      type="number"
                      min="0"
                      value={deliveryCharge}
                      onChange={e => setDeliveryCharge(parseFloat(e.target.value) || 0)}
                      className="input input-bordered input-sm w-full"
                      style={{ paddingLeft: '1.8rem', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              )}
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.3rem' }}>CUSTOMER (OPTIONAL)</p>
                <CustomerPicker customers={customers} selectedId={selectedCustomer} onSelect={setSelectedCustomer} onAddCustomer={handleAddCustomer} />
              </div>
            </div>
          )}
        </div>

        {/* Held Orders */}
        {heldOrders.length > 0 && (
          <div style={{ background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a', padding: '0.5rem 0.65rem' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e', marginBottom: '0.3rem' }}>HELD ORDERS ({heldOrders.length})</p>
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {heldOrders.map(o => (
                <button key={o.id} onClick={() => recallOrder(o.id)} style={{
                  padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600,
                  background: 'white', border: '1px solid #fde68a', cursor: 'pointer', color: '#92400e',
                }}>
                  <Play size={10} style={{ marginRight: '0.2rem' }} />
                  {o.items.length} items
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cart */}
        <div style={{ flex: 1, background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.75rem', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>Current Order</h2>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {cart.length > 0 && (
                <>
                  <button onClick={holdOrder} style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', background: '#fef3c7', border: '1px solid #fde68a', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600, color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Pause size={10} /> Hold
                  </button>
                  <button onClick={() => setCart([])} style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Trash2 size={10} /> Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Cart items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.65rem' }}>
            {cart.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0', gap: '0.5rem', color: '#d1d5db' }}>
                <ShoppingBag size={28} /><p style={{ fontSize: '0.8rem' }}>Cart is empty</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {cart.map(item => (
                  <div key={item.id} style={{ padding: '0.45rem 0.55rem', borderRadius: '10px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.8rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                        <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: 0 }}>{currency}{item.price}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                        <button onClick={() => updateQty(item.id, -1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={11} /></button>
                        <span style={{ fontWeight: 700, fontSize: '0.8rem', width: '22px', textAlign: 'center' }}>{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={11} /></button>
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, width: '55px', textAlign: 'right' }}>{currency}{(parseFloat(item.price) * item.qty).toFixed(0)}</span>
                      <button onClick={() => setEditingNotes(editingNotes === item.id ? null : item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: item.notes ? '#6366f1' : '#d1d5db', padding: '2px' }}>
                        <MessageSquare size={13} />
                      </button>
                    </div>
                    {editingNotes === item.id && (
                      <input
                        value={item.notes}
                        onChange={e => updateNotes(item.id, e.target.value)}
                        placeholder="e.g. no onion, extra spicy…"
                        style={{ width: '100%', marginTop: '0.3rem', padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '0.72rem', outline: 'none' }}
                        autoFocus
                      />
                    )}
                    {item.notes && editingNotes !== item.id && (
                      <p style={{ fontSize: '0.65rem', color: '#6366f1', margin: '0.15rem 0 0', fontStyle: 'italic' }}>📝 {item.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer: Discount, Payment, Totals */}
          <div style={{ borderTop: '1px solid #f3f4f6', padding: '0.6rem 0.65rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <DiscountInput discounts={discounts} appliedDiscount={appliedDiscount} onApply={setAppliedDiscount} subtotal={subtotal} />

            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#6b7280' }}>
                <span>Subtotal</span><span>{currency}{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#16a34a' }}>
                  <span>Discount</span><span>-{currency}{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#6b7280' }}>
                <span>Tax (10%)</span><span>{currency}{tax.toFixed(2)}</span>
              </div>
              {orderType === 'delivery' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#6b7280' }}>
                  <span>Delivery Charge</span><span>{currency}{finalDeliveryCharge.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', marginTop: '0.3rem' }}>
                <span>Total</span><span style={{ color: '#6366f1' }}>{currency}{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || checkingOut}
              style={{
                width: '100%', padding: '0.65rem', borderRadius: '10px', border: 'none',
                background: cart.length === 0 ? '#e5e7eb' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                transition: 'all 0.15s', boxShadow: cart.length > 0 ? '0 4px 14px rgba(99,102,241,0.4)' : 'none',
              }}
            >
              {checkingOut ? <span className="loading loading-spinner loading-sm" /> : <CreditCard size={16} />}
              Place Order
            </button>
          </div>
        </div>
      </div>

      {/* Success modal */}
      <dialog id="checkout_success" className="modal">
        <div className="modal-box text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h3 className="font-bold text-lg">Order Placed!</h3>
          <p className="py-2 text-base-content/60">The order has been submitted successfully.</p>
          <div className="modal-action justify-center gap-2">
            {lastOrderId && (
              <>
                <button className="btn btn-outline btn-sm gap-1" onClick={() => window.open(`/kitchen-print/${lastOrderId}`, '_blank')}>
                  <ChefHat size={14} /> Print Chef Slip
                </button>
                <button className="btn btn-outline btn-sm gap-1" onClick={() => window.location.href = '/admin/orders'}>
                  <Package size={14} /> Go to Orders
                </button>
              </>
            )}
            <form method="dialog">
              <button className="btn btn-primary btn-sm gap-2" onClick={() => setLastOrderId(null)}>
                <RefreshCw size={14} /> New Order
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  );
}