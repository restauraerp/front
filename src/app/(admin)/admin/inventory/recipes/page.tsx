'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CrudPage } from '@/components/ui/CrudPage';
import { fetchApi } from '@/lib/api';

function RecipesPageContent() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('product_id') || '';
  const action = searchParams.get('action') || '';
  const [products, setProducts] = useState<{value: string, label: string}[]>([{ value: '', label: 'Select a Product' }]);
  const [inventoryItems, setInventoryItems] = useState<{value: string, label: string}[]>([{ value: '', label: 'Select an Item' }]);

  useEffect(() => {
    // Fetch products
    fetchApi('/products?per_page=1000').then((res) => {
      const prods = (res.data || res.data?.data || []).map((p: any) => ({
        value: p.id.toString(),
        label: p.name
      }));
      setProducts([{ value: '', label: 'Select a Product' }, ...prods]);
    }).catch(console.error);

    // Fetch inventory items
    fetchApi('/inventory-items?per_page=1000').then((res) => {
      const items = (res.data || res.data?.data || []).map((i: any) => ({
        value: i.id.toString(),
        label: `${i.name} (${i.unit})`
      }));
      setInventoryItems([{ value: '', label: 'Select an Item' }, ...items]);
    }).catch(console.error);
  }, []);

  return (
    <CrudPage
      title="Recipes (BOM)"
      endpoint={productId ? `/recipes?product_id=${productId}` : "/recipes"}
      addLabel="+ Add Recipe Item"
      tableColumns={[
        { key: 'id', label: 'ID' },
        { 
          key: 'product_id', 
          label: 'Product',
          render: (row) => row.product?.name || `Product #${row.product_id}`
        },
        { 
          key: 'inventory_item_id', 
          label: 'Ingredient',
          render: (row) => row.inventory_item?.name || `Item #${row.inventory_item_id}`
        },
        { 
          key: 'quantity_required', 
          label: 'Quantity Required',
          render: (row) => `${row.quantity_required} ${row.inventory_item?.unit || ''}`
        },
      ]}
      formFields={[
        { key: 'product_id', label: 'Product', options: products },
        { key: 'inventory_item_id', label: 'Inventory Item (Ingredient)', options: inventoryItems },
        { key: 'quantity_required', label: 'Quantity Required', type: 'number', step: '0.01' },
      ]}
      defaultValues={{ product_id: productId, inventory_item_id: '', quantity_required: '1.00' }}
      initialFormOpen={action === 'new'}
    />
  );
}

export default function RecipesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><span className="loading loading-spinner text-primary"></span></div>}>
      <RecipesPageContent />
    </Suspense>
  );
}
