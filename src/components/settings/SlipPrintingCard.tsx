'use client';
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { SLIP_KEYS, SLIP_DEFAULTS, clearBrandingCache } from '@/hooks/useBranding';
import { ChefHat, Printer, Truck } from 'lucide-react';

interface StoredSetting {
  id: number;
  key: string;
  value: string;
}

type SlipKey = keyof typeof SLIP_KEYS;

const SLIPS: { key: SlipKey; label: string; hint: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  {
    key: 'kitchen',
    label: 'Kitchen slip',
    hint: 'The chef’s ticket — items and cooking notes for the line. No prices.',
    Icon: ChefHat,
  },
  {
    key: 'customer',
    label: 'Customer receipt',
    hint: 'The priced receipt handed to the customer, with totals and payment.',
    Icon: Printer,
  },
  {
    key: 'delivery',
    label: 'Delivery slip',
    hint: 'For delivery orders — the customer’s name, phone and address for the rider, plus the amount to collect.',
    Icon: Truck,
  },
];

/**
 * Turns each of the three slips on or off.
 *
 * The values live in the same key/value table as everything else, as '1'/'0'.
 * A key that has never been written is absent rather than '0', so the toggle
 * shows SLIP_DEFAULTS until the owner sets it - kitchen and customer on,
 * delivery off. Saving clears the branding cache so the order screen's print
 * buttons re-read the change without a reload.
 */
export default function SlipPrintingCard() {
  const [stored, setStored] = useState<StoredSetting[] | null>(null);
  const [values, setValues] = useState<Record<SlipKey, boolean>>({ ...SLIP_DEFAULTS });
  const [savingKey, setSavingKey] = useState<SlipKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApi('/website-settings?nopaginate=1')
      .then((res) => {
        const rows: StoredSetting[] = res?.data ?? res ?? [];
        setStored(rows);
        setValues({
          kitchen: readBool(rows, SLIP_KEYS.kitchen, SLIP_DEFAULTS.kitchen),
          customer: readBool(rows, SLIP_KEYS.customer, SLIP_DEFAULTS.customer),
          delivery: readBool(rows, SLIP_KEYS.delivery, SLIP_DEFAULTS.delivery),
        });
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load slip settings.')));
  }, []);

  const toggle = async (key: SlipKey) => {
    if (stored === null) return;
    const next = !values[key];
    // Optimistic: the toggle should feel instant; revert on failure below.
    setValues((v) => ({ ...v, [key]: next }));
    setSavingKey(key);
    setError(null);

    try {
      const settingKey = SLIP_KEYS[key];
      const existing = stored.find((row) => row.key === settingKey);
      const body = JSON.stringify({ key: settingKey, value: next ? '1' : '0', type: 'boolean' });

      if (existing) {
        await fetchApi(`/website-settings/${existing.id}`, { method: 'PUT', body });
      } else {
        const created = await fetchApi('/website-settings', { method: 'POST', body });
        // Remember the new row's id so a second toggle updates rather than
        // trying to create a duplicate key.
        if (created?.id) setStored((rows) => [...(rows ?? []), created]);
      }

      clearBrandingCache();
    } catch (err) {
      setValues((v) => ({ ...v, [key]: !next })); // revert
      setError(apiErrorMessage(err, 'Could not save that change.'));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <Card title="Slip Printing" style={{ marginBottom: '2rem' }}>
      <p className="text-sm text-base-content/60 mb-4">
        Choose which slips the order screen offers a print button for. Turning one off hides its button everywhere.
      </p>

      {error && (
        <div className="alert alert-error py-2 mb-4">
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="space-y-3">
        {SLIPS.map(({ key, label, hint, Icon }) => (
          <label
            key={key}
            className="flex items-start gap-3 p-3 rounded-xl bg-base-200/60 hover:bg-base-200 cursor-pointer transition-colors"
          >
            <Icon size={20} className="text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{label}</p>
              <p className="text-xs text-base-content/60">{hint}</p>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary flex-shrink-0"
              checked={values[key]}
              disabled={stored === null || savingKey === key}
              onChange={() => toggle(key)}
            />
          </label>
        ))}
      </div>
    </Card>
  );
}

function readBool(rows: StoredSetting[], key: string, fallback: boolean): boolean {
  const row = rows.find((r) => r.key === key);
  const value = (row?.value ?? '').trim();
  return value === '' ? fallback : value === '1';
}
