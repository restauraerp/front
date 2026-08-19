'use client';
import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchApi, fetchOptional, apiErrorMessage } from '@/lib/api';
import {
  ShoppingBag, Trash2, Plus, Minus, CreditCard, RefreshCw,
  Search, MessageSquare, Pause, Play, ChevronDown, ChevronUp,
  ChefHat, Package
} from 'lucide-react';
import OrderTypeSelector from './components/OrderTypeSelector';
import TableSelector from './components/TableSelector';
import CustomerPicker from './components/CustomerPicker';
import AddressAutocomplete from '@/components/ui/AddressAutocomplete';
import { tenantKey } from '@/lib/tenant';
import { isSellable } from '@/lib/product';

interface CartItem {
  id: number; name: string; price: string; qty: number; notes: string;
  needs_cooking?: boolean;
  images?: { url: string; is_featured?: boolean }[];
}
interface HeldOrder { id: number; items: CartItem[]; orderType: string; tableId: number | null; customerId: number | null; }

export default function POSPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary" /></div>}>
      <POS />
    </Suspense>
  );
}

function POS() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editOrderId = searchParams.get('edit');
  const [editMode, setEditMode] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
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
  // Who to credit for the sale. Separate from the account running the till,
  // which is very often shared - see the served_by_user_id migration.
  const [employees, setEmployees] = useState<any[]>([]);
  const [servedBy, setServedBy] = useState<number | ''>('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [taxRate, setTaxRate] = useState(0);
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
      // CRM is a paid module. On a tier without it this resolves to an
      // empty list instead of rejecting, so the till still opens - a
      // 403 here used to take the product catalog down with it.
      fetchOptional<any>('/customers?nopaginate=1', []),
      fetchApi('/discounts'),
      fetchApi('/tax-rules'),
      fetchApi('/locations'),
      fetchOptional<any>('/users?nopaginate=1', []),
    ])
      .then(([prodRes, setRes, catRes, custRes, discRes, taxRes, locRes, staffRes]) => {
        setProducts(prodRes.data || prodRes || []);
        const map: Record<string, string> = {};
        (setRes.data || setRes || []).forEach((s: any) => { map[s.key] = s.value; });
        setSettings(map);
        setCategories(catRes.data || catRes || []);
        setCustomers(custRes.data || custRes || []);
        setDiscounts(discRes.data || discRes || []);
        // Tax comes from the restaurant's own rules. No active rule means
        // no tax - this used to be a hardcoded 10% that matched nothing in
        // the system. The server recomputes it on submit either way; this
        // is so the cart shows the same number the bill will.
        const rules = taxRes?.data || taxRes || [];
        setTaxRate(rules.filter((r: any) => r.is_active).reduce((sum: number, r: any) => sum + Number(r.percentage || 0), 0));
        const locs = locRes.data || locRes || [];
        setLocations(locs);
        setEmployees(staffRes?.data || staffRes || []);

        let savedLoc = null;
        if (typeof window !== 'undefined') {
          savedLoc = localStorage.getItem(tenantKey('restora_active_location_id'));
        }

        if (savedLoc && locs.some((l: any) => l.id === Number(savedLoc))) {
          setActiveLocationId(Number(savedLoc));
        } else if (locs.length > 0 && !activeLocationId) {
          setActiveLocationId(locs[0].id);
          if (typeof window !== 'undefined') {
            localStorage.setItem(tenantKey('restora_active_location_id'), locs[0].id.toString());
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

  useEffect(() => {
    if (!editOrderId || loading) return;
    setEditLoading(true);
    fetchApi(`/orders/${editOrderId}`)
      .then(res => {
        const order = res.data || res;
        if (order.payment_status === 'paid') {
          alert('This order has already been paid and cannot be edited.');
          router.push('/admin/orders');
          return;
        }
        setEditMode(true);
        setOrderType(order.order_type || 'dine_in');
        setSelectedTable(order.table_id || null);
        setSelectedCustomer(order.customer_id || null);
        setDeliveryCharge(parseFloat(order.delivery_charge || '0'));
        setDeliveryTime(order.delivery_time || '');
        setDeliveryAddress(order.delivery_address || '');
        setLatitude(order.latitude ? String(order.latitude) : '');
        setLongitude(order.longitude ? String(order.longitude) : '');
        if (order.discount_id) {
          const disc = discounts.find((d: any) => d.id === order.discount_id);
          if (disc) setAppliedDiscount(disc);
        }
        if (order.location_id) setActiveLocationId(order.location_id);
        const merged = new Map<number, CartItem>();
        for (const item of (order.items || [])) {
          const pid = item.product?.id || item.product_id;
          const existing = merged.get(pid);
          const qty = item.quantity || item.qty || 1;
          if (existing) {
            existing.qty += qty;
            if (item.notes && !existing.notes.includes(item.notes)) {
              existing.notes = [existing.notes, item.notes].filter(Boolean).join('; ');
            }
          } else {
            merged.set(pid, {
              id: pid,
              name: item.product?.name || `Product #${item.product_id}`,
              price: String(item.price),
              qty,
              notes: item.notes || '',
              needs_cooking: item.product?.needs_cooking,
              images: item.product?.images,
            });
          }
        }
        setCart(Array.from(merged.values()));
      })
      .catch(() => {
        alert('Failed to load order for editing.');
        router.push('/admin/orders');
      })
      .finally(() => setEditLoading(false));
  }, [editOrderId, loading]);

  // Only what may actually be sold. The catalog keeps withdrawn products so
  // they can be brought back, and /products returns them all, so the till has
  // to leave them out itself - it was ringing up items taken off the menu.
  const sellableProducts = useMemo(() => products.filter(isSellable), [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let list = sellableProducts;

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
  }, [sellableProducts, selectedCategory, searchQuery, activeLocationId]);

  // Counted off the sellable list too, so a category whose every product was
  // withdrawn stops offering a tab that opens onto nothing.
  const categoriesWithProducts = useMemo(() => {
    return categories
      .map(cat => ({ ...cat, productCount: sellableProducts.filter(p => p.category_id === cat.id).length }))
      .filter(cat => cat.productCount > 0);
  }, [categories, sellableProducts]);

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
  const tax = Number((afterDiscount * (taxRate / 100)).toFixed(2));
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
    setServedBy('');
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
    try {
      const res = await fetchApi('/customers', {
        method: 'POST',
        body: JSON.stringify({ name, phone, email, address, organization_name: orgName, google_map_location: googleMapLoc }),
      });
      const newCustomer = res.data || res;
      setCustomers(prev => [...prev, newCustomer]);
      setSelectedCustomer(newCustomer.id);
    } catch (error) {
      // Refused because the plan has no CRM, or because billing is behind.
      // Either way the API explains it and says who to contact - show that
      // rather than letting the dialog fail silently.
      alert(apiErrorMessage(error, 'Could not save this customer. Please try again.'));
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckingOut(true);
    try {
      const payload = {
        location_id: activeLocationId,
        order_type: orderType,
        subtotal: subtotal.toFixed(2),
        tax_amount: tax.toFixed(2),
        discount_amount: discountAmount.toFixed(2),
        delivery_charge: finalDeliveryCharge.toFixed(2),
        total: total.toFixed(2),
        table_id: orderType === 'dine_in' ? selectedTable : null,
        served_by_user_id: servedBy === '' ? null : servedBy,
        customer_id: selectedCustomer,
        discount_id: appliedDiscount?.id || null,
        delivery_time: deliveryTime || null,
        delivery_address: deliveryAddress || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        items: cart.map(item => ({
          product_id: item.id, qty: item.qty, price: item.price, notes: item.notes || null,
        })),
      };

      if (editMode && editOrderId) {
        await fetchApi(`/orders/${editOrderId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        router.push('/admin/orders');
        return;
      }

      const res = await fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const newOrder = res.data || res;
      setLastOrderId(newOrder.id);
      (document.getElementById('checkout_success') as HTMLDialogElement)?.showModal();
      setCart([]);
      setSelectedTable(null);
      setSelectedCustomer(null);
      // Cleared with the rest of the ticket: the next customer is not
      // necessarily served by the same person, and a sticky value would
      // quietly credit them anyway.
      setServedBy('');
      setAppliedDiscount(null);
    } catch {
      alert(editMode ? 'Failed to update order. Please try again.' : 'Failed to place order. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 p-2 md:p-0 md:h-[calc(100vh-4rem)]">
      {/* Left: Product Section */}
      <div className="flex-1 flex flex-col min-w-0 h-[65vh] md:h-full">
        {/* Header Row: Title + Search + Location */}
        <div className="flex items-center gap-4 mb-3 flex-wrap">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap' }}>{editMode ? `Edit Order #${editOrderId}` : 'Point of Sale'}</h1>

          {/* Location Switcher. Hidden at one outlet - activeLocationId is
              still set from the list above and still goes out with the order,
              because orders.location_id is NOT NULL. */}
          {locations.length > 1 && (
            <select
              value={activeLocationId || ''}
              onChange={(e) => {
                const id = Number(e.target.value);
                setActiveLocationId(id);
                if (typeof window !== 'undefined') localStorage.setItem(tenantKey('restora_active_location_id'), id.toString());
              }}
              className="select select-sm select-bordered"
              style={{ fontWeight: 600, color: '#4b5563' }}
            >
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>📍 {loc.name}</option>
              ))}
            </select>
          )}

          <div className="relative flex-1 min-w-[200px] max-w-[320px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 z-10" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products…"
              className="input input-bordered input-sm w-full pl-9"
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
        <div className="flex-1 overflow-y-auto min-h-0 pb-4">
          {(loading || editLoading) ? (
            <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary" /></div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 0', gap: '0.75rem', color: '#9ca3af' }}>
              <ShoppingBag size={40} />
              <p>{searchQuery || selectedCategory ? 'No matching products found.' : 'No products available.'}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
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
      <div className="w-full md:w-1/3 flex flex-col gap-2 shrink-0 md:h-full">
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

              {/* Hidden when there is nobody to choose between: a restaurant
                  with one staff account has no attribution question to answer,
                  and an empty picker is just another thing to skip past. */}
              {employees.length > 1 && (
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.3rem' }}>SERVED BY (OPTIONAL)</p>
                  <select
                    className="select select-bordered select-sm w-full"
                    style={{ fontSize: '0.8rem' }}
                    value={servedBy}
                    onChange={(e) => setServedBy(e.target.value === '' ? '' : Number(e.target.value))}
                    aria-label="Employee who served this order"
                  >
                    <option value="">Nobody in particular</option>
                    {employees.map((employee: any) => (
                      <option key={employee.id} value={employee.id}>{employee.name}</option>
                    ))}
                  </select>
                </div>
              )}
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
        <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col shadow-sm min-h-[400px] md:min-h-0 overflow-hidden">
          <div className="flex items-center justify-between py-3 px-4 border-b border-gray-100">
            <h2 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>{editMode ? `Editing Order #${editOrderId}` : 'Current Order'}</h2>
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
                {cart.map(item => {
                  const featuredImg = item.images?.find(i => i.is_featured) || item.images?.[0];
                  return (
                    <div key={item.id} style={{ padding: '0.45rem 0.55rem', borderRadius: '10px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {/* Product thumbnail */}
                        <div style={{ width: '34px', height: '34px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {featuredImg ? (
                            <img src={`/storage/${featuredImg.url}`} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af' }}>{item.name.substring(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <p style={{ fontWeight: 600, fontSize: '0.8rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                            {item.needs_cooking && (
                              <span title="Needs cooking" style={{ flexShrink: 0, color: '#f59e0b' }}><ChefHat size={11} /></span>
                            )}
                          </div>
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
                        <button
                          onClick={() => setCart(prev => prev.filter(c => c.id !== item.id))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: '2px' }}
                          title="Remove item"
                        >
                          <Trash2 size={13} />
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
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer: Totals & Checkout */}
          <div className="border-t border-gray-100 py-3 px-4 flex flex-col gap-2 bg-white z-10 shrink-0">
            <div style={{ paddingTop: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#6b7280' }}>
                <span>Subtotal</span><span>{currency}{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#16a34a' }}>
                  <span>Discount</span><span>-{currency}{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#6b7280' }}>
                <span>Tax ({taxRate}%)</span><span>{currency}{tax.toFixed(2)}</span>
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
              {editMode ? 'Update Order' : 'Place Order'}
            </button>
          </div>
        </div>
      </div>

      {/* Success modal — only shown for new orders; edits redirect to orders page */}
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