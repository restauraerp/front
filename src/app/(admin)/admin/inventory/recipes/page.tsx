'use client';
import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Trash2, Plus } from 'lucide-react';
import { SearchSelect } from '@/components/ui/SearchSelect';

interface InventoryItem {
  id: number;
  title: string;
  unit: string;
  images?: { id: number; url: string; is_featured?: boolean }[];
}

interface RecipeRow {
  id?: number;
  inventory_item_id: string;
  quantity_required: string;
  _deleted?: boolean;
}

function RecipesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const productIdParam = searchParams.get('product_id') || '';

  const [products, setProducts] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(productIdParam);
  const [rows, setRows] = useState<RecipeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    Promise.all([
      fetchApi('/products?nopaginate=1'),
      fetchApi('/inventory-items?nopaginate=1'),
    ]).then(([prodRes, itemRes]) => {
      setProducts(prodRes?.data || prodRes || []);
      setInventoryItems(itemRes?.data || itemRes || []);
    }).catch(console.error);
  }, []);

  const loadRecipes = useCallback(async (productId: string) => {
    if (!productId) { setRows([]); return; }
    setLoading(true);
    try {
      const res = await fetchApi(`/recipes?product_id=${productId}&nopaginate=1`);
      const data: any[] = res?.data?.data || res?.data || res || [];
      setRows(data.map((r: any) => ({
        id: r.id,
        inventory_item_id: String(r.inventory_item_id),
        quantity_required: String(r.quantity_required),
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecipes(selectedProductId);
  }, [selectedProductId, loadRecipes]);

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const params = new URLSearchParams(searchParams.toString());
    if (productId) params.set('product_id', productId);
    else params.delete('product_id');
    router.replace(`?${params.toString()}`);
  };

  const addRow = () => {
    setRows(prev => [...prev, { inventory_item_id: '', quantity_required: '1' }]);
  };

  const updateRow = (index: number, field: keyof RecipeRow, value: string) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const removeRow = async (index: number) => {
    const row = rows[index];
    if (row.id) {
      try {
        await fetchApi(`/recipes/${row.id}`, { method: 'DELETE' });
      } catch (err) {
        console.error(err);
      }
    }
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedProductId) return;
    setSaving(true);
    try {
      for (const row of rows) {
        if (!row.inventory_item_id || !row.quantity_required) continue;
        const payload = {
          product_id: selectedProductId,
          inventory_item_id: row.inventory_item_id,
          quantity_required: row.quantity_required,
        };
        if (row.id) {
          await fetchApi(`/recipes/${row.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
          await fetchApi('/recipes', { method: 'POST', body: JSON.stringify(payload) });
        }
      }
      await loadRecipes(selectedProductId);
      setSuccessMsg('Recipe saved successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setSuccessMsg('');
    } finally {
      setSaving(false);
    }
  };

  const getItem = (id: string) => inventoryItems.find(i => String(i.id) === id);

  const getFeaturedImage = (item: InventoryItem | undefined) => {
    if (!item?.images?.length) return null;
    const featured = item.images.find(img => img.is_featured) || item.images[0];
    return featured ? (featured.url.startsWith('http') ? featured.url : `/storage/${featured.url}`) : null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Recipes</h1>
      </div>

      <Card className="mb-6">
        <div className="form-control max-w-sm">
          <label className="label"><span className="label-text font-medium">Select Product</span></label>
          <SearchSelect
            label=""
            value={selectedProductId}
            onChange={(v) => handleProductChange(String(v))}
            options={products.map((p: any) => ({ value: p.id, label: p.name }))}
            placeholder="— Choose a product —"
            searchPlaceholder="Search products…"
          />
        </div>
      </Card>

      {selectedProductId && (
        <Card title="Recipe Ingredients">
          {loading ? (
            <div className="flex justify-center py-8"><span className="loading loading-spinner text-primary"></span></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    <tr>
                      <th className="w-8">#</th>
                      <th>Inventory Item</th>
                      <th className="w-36">Quantity</th>
                      <th className="w-24">Unit</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-base-content/50 py-6">
                          No ingredients yet. Click "Add Row" to start.
                        </td>
                      </tr>
                    )}
                    {rows.map((row, idx) => {
                      const item = getItem(row.inventory_item_id);
                      const imgSrc = getFeaturedImage(item);
                      return (
                        <tr key={idx} className="align-middle">
                          <td className="text-base-content/40 text-sm">{idx + 1}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              {/* Item image preview */}
                              {imgSrc ? (
                                <img src={imgSrc} alt="" className="w-8 h-8 rounded object-cover border border-base-200 flex-shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded bg-base-200 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-[180px]">
                                <SearchSelect
                                  label=""
                                  value={row.inventory_item_id}
                                  onChange={(v) => updateRow(idx, 'inventory_item_id', String(v))}
                                  options={inventoryItems.map(i => ({ value: i.id, label: `${i.title} (${i.unit})` }))}
                                  placeholder="— Select item —"
                                  searchPlaceholder="Search items…"
                                />
                              </div>
                            </div>
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="input input-bordered input-sm w-full"
                              value={row.quantity_required}
                              onChange={e => updateRow(idx, 'quantity_required', e.target.value)}
                            />
                          </td>
                          <td className="text-sm text-base-content/60 font-medium">
                            {item?.unit || '—'}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm btn-square text-error"
                              onClick={() => removeRow(idx)}
                              title="Remove row"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {successMsg && (
                <div className="alert alert-success mt-4 py-2 px-4 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {successMsg}
                </div>
              )}

              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-base-200">
                <button
                  type="button"
                  className="btn btn-outline btn-sm gap-1"
                  onClick={addRow}
                >
                  <Plus size={15} /> Add Row
                </button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving || rows.length === 0}
                >
                  {saving ? 'Saving…' : 'Save Recipe'}
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

export default function RecipesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><span className="loading loading-spinner text-primary"></span></div>}>
      <RecipesPageContent />
    </Suspense>
  );
}
