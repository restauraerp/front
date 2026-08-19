'use client';
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { BRANDING_KEYS, clearBrandingCache } from '@/hooks/useBranding';

interface StoredSetting {
  id: number;
  key: string;
  value: string;
}

/**
 * The name and address a customer sees, as named fields.
 *
 * These values already existed, but only reachable through a raw key/value
 * editor: an owner had to know that the thing heading their receipt was called
 * `site_name`, type that string correctly, and pick a "type" from a dropdown.
 * Nobody did, which is why receipts went out headed "RESTORA ERP" with a
 * placeholder address underneath.
 *
 * The generic editor stays below this card - there are two dozen other keys
 * behind the storefront and no reason to hide them. This card is only the
 * handful that end up on paper in front of a customer.
 */
const FIELDS: { key: string; label: string; placeholder: string; hint?: string }[] = [
  { key: BRANDING_KEYS.name, label: 'Restaurant name', placeholder: 'Bangla Bistro', hint: 'Printed at the top of every receipt and invoice.' },
  { key: BRANDING_KEYS.address, label: 'Address', placeholder: 'Road 27, Banani, Dhaka' },
  { key: BRANDING_KEYS.phone, label: 'Phone', placeholder: '+8801700000000' },
  { key: BRANDING_KEYS.email, label: 'Email', placeholder: 'hello@restaurant.com' },
  { key: BRANDING_KEYS.currency, label: 'Currency symbol', placeholder: '৳' },
  { key: BRANDING_KEYS.receiptFooter, label: 'Receipt footer', placeholder: 'Thank you for your visit!', hint: 'The closing line on a printed receipt.' },
];

export default function RestaurantIdentityCard({ onSaved }: { onSaved?: () => void }) {
  const [stored, setStored] = useState<StoredSetting[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchApi('/website-settings?nopaginate=1')
      .then((res) => {
        if (!active) return;
        const rows = (res?.data ?? res ?? []) as StoredSetting[];
        setStored(rows);
        setValues(Object.fromEntries(FIELDS.map((f) => [f.key, rows.find((r) => r.key === f.key)?.value ?? ''])));
      })
      .catch(() => active && setStored([]));

    return () => { active = false; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // One request per changed key. The endpoint is a row-per-key resource
      // with no bulk write, and a key that already exists must be updated
      // rather than inserted - its uniqueness is enforced per tenant.
      for (const field of FIELDS) {
        const existing = stored?.find((row) => row.key === field.key);
        const value = (values[field.key] ?? '').trim();

        if ((existing?.value ?? '') === value) continue;

        if (existing) {
          await fetchApi(`/website-settings/${existing.id}`, {
            method: 'PUT',
            body: JSON.stringify({ key: field.key, value, type: 'string' }),
          });
        } else if (value !== '') {
          await fetchApi('/website-settings', {
            method: 'POST',
            body: JSON.stringify({ key: field.key, value, type: 'string' }),
          });
        }
      }

      // The receipt and the slip read through a shared cache; without this a
      // freshly renamed restaurant would keep printing the old name until the
      // tab was reloaded.
      clearBrandingCache();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved?.();

      const refreshed = await fetchApi('/website-settings?nopaginate=1');
      setStored((refreshed?.data ?? refreshed ?? []) as StoredSetting[]);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save these details.'));
    } finally {
      setSaving(false);
    }
  };

  if (stored === null) {
    return (
      <Card title="Restaurant identity">
        <div className="flex justify-center py-8"><span className="loading loading-spinner text-primary" /></div>
      </Card>
    );
  }

  return (
    <Card title="Restaurant identity">
      <p className="text-sm text-base-content/60 mb-4">
        What your customers see on receipts, invoices and kitchen tickets.
      </p>

      {error && <div role="alert" className="alert alert-error mb-4 text-sm"><span>{error}</span></div>}

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <Input
                label={field.label}
                name={field.key}
                placeholder={field.placeholder}
                value={values[field.key] ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
              />
              {field.hint && <p className="text-xs text-base-content/50 mt-1">{field.hint}</p>}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-6">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          {saved && <span className="text-success text-sm">Saved — receipts will use these straight away.</span>}
        </div>
      </form>
    </Card>
  );
}
