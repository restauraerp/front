'use client';
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import {
  RECEIPT_KEYS,
  RECEIPT_DEFAULTS,
  type ReceiptFormat,
  type ReceiptFontScale,
  clearBrandingCache,
  useBranding,
} from '@/hooks/useBranding';
import { FileText, Minimize2, Check, Sparkles, Printer } from 'lucide-react';

interface StoredSetting {
  id: number;
  key: string;
  value: string;
}

const FONT_SCALES: { value: ReceiptFontScale; label: string; desc: string }[] = [
  { value: '80%', label: '80%', desc: 'Extra Compact (Maximum Roll Saving)' },
  { value: '90%', label: '90%', desc: 'Compact' },
  { value: '100%', label: '100%', desc: 'Standard (Default)' },
  { value: '110%', label: '110%', desc: 'Medium' },
  { value: '120%', label: '120%', desc: 'Large (High Legibility)' },
];

export default function ReceiptSettingsCard() {
  const branding = useBranding();
  const [stored, setStored] = useState<StoredSetting[] | null>(null);
  const [format, setFormat] = useState<ReceiptFormat>(RECEIPT_DEFAULTS.format);
  const [fontScale, setFontScale] = useState<ReceiptFontScale>(RECEIPT_DEFAULTS.fontScale);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApi('/website-settings?nopaginate=1')
      .then((res) => {
        const rows: StoredSetting[] = res?.data ?? res ?? [];
        setStored(rows);

        const formatRow = rows.find((r) => r.key === RECEIPT_KEYS.format);
        const scaleRow = rows.find((r) => r.key === RECEIPT_KEYS.fontScale);

        if (formatRow?.value === 'minimal') {
          setFormat('minimal');
        } else {
          setFormat('detailed');
        }

        let scale = (scaleRow?.value ?? '').trim();
        if (scale && !scale.endsWith('%')) scale = `${scale}%`;
        const valid = FONT_SCALES.some((s) => s.value === scale);
        setFontScale(valid ? (scale as ReceiptFontScale) : '100%');
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load receipt settings.')));
  }, []);

  const saveSetting = async (key: string, value: string) => {
    if (stored === null) return;
    const existing = stored.find((r) => r.key === key);
    const body = JSON.stringify({ key, value, type: 'string' });

    if (existing) {
      await fetchApi(`/website-settings/${existing.id}`, { method: 'PUT', body });
    } else {
      const created = await fetchApi('/website-settings', { method: 'POST', body });
      if (created?.id) {
        setStored((rows) => [...(rows ?? []), created]);
      }
    }
  };

  const handleFormatChange = async (nextFormat: ReceiptFormat) => {
    if (format === nextFormat || saving) return;
    setFormat(nextFormat);
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      await saveSetting(RECEIPT_KEYS.format, nextFormat);
      clearBrandingCache();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setFormat(format); // revert
      setError(apiErrorMessage(err, 'Could not save receipt format.'));
    } finally {
      setSaving(false);
    }
  };

  const handleFontScaleChange = async (nextScale: ReceiptFontScale) => {
    if (fontScale === nextScale || saving) return;
    setFontScale(nextScale);
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      await saveSetting(RECEIPT_KEYS.fontScale, nextScale);
      clearBrandingCache();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setFontScale(fontScale); // revert
      setError(apiErrorMessage(err, 'Could not save font scale.'));
    } finally {
      setSaving(false);
    }
  };

  const scaleNum = parseInt(fontScale, 10) / 100;

  return (
    <Card title="Payment Receipt Formatting & Roll Saving" style={{ marginBottom: '2rem' }}>
      <p className="text-sm text-base-content/60 mb-5">
        Configure how customer payment receipts are printed. Choose between a full detailed receipt or a minimal compact
        layout designed to conserve paper on thermal printer rolls. Font sizing can be adjusted from 80% to 120%.
      </p>

      {error && (
        <div className="alert alert-error py-2 mb-4">
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="text-sm font-semibold block mb-2">Receipt Layout Style</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Detailed Option */}
              <button
                type="button"
                onClick={() => handleFormatChange('detailed')}
                disabled={stored === null || saving}
                className={`flex flex-col text-left p-3.5 rounded-xl border-2 transition-all ${
                  format === 'detailed'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-base-300 hover:border-base-content/20 bg-base-100'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="font-semibold flex items-center gap-2 text-sm">
                    <FileText size={16} className={format === 'detailed' ? 'text-primary' : 'text-base-content/60'} />
                    Detailed Receipt
                  </span>
                  {format === 'detailed' && <Check size={16} className="text-primary font-bold" />}
                </div>
                <p className="text-xs text-base-content/60 leading-relaxed">
                  Standard complete format: restaurant logo, large token banner, addresses, taxes, payment info, and footer.
                </p>
              </button>

              {/* Minimal Option */}
              <button
                type="button"
                onClick={() => handleFormatChange('minimal')}
                disabled={stored === null || saving}
                className={`flex flex-col text-left p-3.5 rounded-xl border-2 transition-all ${
                  format === 'minimal'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-base-300 hover:border-base-content/20 bg-base-100'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="font-semibold flex items-center gap-2 text-sm">
                    <Minimize2 size={16} className={format === 'minimal' ? 'text-primary' : 'text-base-content/60'} />
                    Minimal (Roll Saving)
                  </span>
                  {format === 'minimal' && <Check size={16} className="text-primary font-bold" />}
                </div>
                <p className="text-xs text-base-content/60 leading-relaxed">
                  Ultra-compact paper saver: inline token, tight row height, minimal padding, and streamlined items list.
                </p>
              </button>
            </div>
          </div>

          {/* Font Scale Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold">Receipt Font Size</label>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-base-200 text-primary">
                {fontScale}
              </span>
            </div>
            <p className="text-xs text-base-content/60 mb-3">
              Scale all printed text to fit your thermal printer paper width (58mm or 80mm).
            </p>
            <div className="grid grid-cols-5 gap-2">
              {FONT_SCALES.map((scale) => (
                <button
                  key={scale.value}
                  type="button"
                  onClick={() => handleFontScaleChange(scale.value)}
                  disabled={stored === null || saving}
                  className={`btn btn-sm ${
                    fontScale === scale.value ? 'btn-primary' : 'btn-outline border-base-300 hover:bg-base-200'
                  }`}
                  title={scale.desc}
                >
                  {scale.label}
                </button>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-base-content/50 px-1">
              <span>80% (Smaller / Saves Roll)</span>
              <span>100% (Standard)</span>
              <span>120% (Larger)</span>
            </div>
          </div>

          {/* Saving Status Notification */}
          <div className="pt-2">
            {saved && (
              <div className="flex items-center gap-2 text-success text-xs font-medium">
                <Sparkles size={14} />
                <span>Saved — customer receipts will print using this style immediately.</span>
              </div>
            )}
            {saving && (
              <span className="text-xs text-base-content/50 italic">Saving settings...</span>
            )}
          </div>
        </div>

        {/* Right Column: Live Thermal Paper Preview */}
        <div className="lg:col-span-5 bg-base-200/50 p-4 rounded-2xl border border-base-300">
          <div className="flex items-center justify-between mb-3 text-xs font-medium text-base-content/70">
            <span className="flex items-center gap-1.5">
              <Printer size={14} /> Live Thermal Paper Preview
            </span>
            <span className="badge badge-sm badge-neutral font-mono">{fontScale} · {format}</span>
          </div>

          {/* Receipt Mock Paper */}
          <div
            className="bg-white text-black shadow-md rounded border border-gray-200 mx-auto font-mono select-none overflow-hidden transition-all duration-200"
            style={{
              width: '100%',
              maxWidth: '260px',
              padding: format === 'minimal' ? '6px 8px' : '12px 14px',
              fontSize: `${(0.72 * scaleNum).toFixed(3)}rem`,
              lineHeight: format === 'minimal' ? '1.2' : '1.35',
            }}
          >
            {/* Detailed: Large Token Banner */}
            {format === 'detailed' && (
              <div className="text-center mb-2 pb-1 border-b-2 border-black">
                <div style={{ fontSize: `${(0.65 * scaleNum).toFixed(3)}rem` }} className="tracking-widest">
                  TOKEN
                </div>
                <div style={{ fontSize: `${(1.8 * scaleNum).toFixed(3)}rem` }} className="font-bold leading-none">
                  14
                </div>
              </div>
            )}

            {/* Header */}
            <div className="text-center mb-2">
              <div className="font-bold uppercase tracking-tight" style={{ fontSize: `${(0.95 * scaleNum).toFixed(3)}rem` }}>
                {branding.name || 'BANGLA BISTRO'}
              </div>
              {format === 'detailed' && (
                <>
                  <div style={{ fontSize: `${(0.65 * scaleNum).toFixed(3)}rem` }}>Gulshan 2, Dhaka</div>
                  <div style={{ fontSize: `${(0.65 * scaleNum).toFixed(3)}rem` }}>+8801700000000</div>
                </>
              )}
              {format === 'minimal' && (
                <div className="flex justify-between items-center text-[10px] text-gray-700 mt-0.5 border-b border-dashed border-gray-400 pb-1">
                  <span className="font-bold">#TOKEN 14</span>
                  <span>ORD #1082</span>
                  <span>14:30</span>
                </div>
              )}
            </div>

            {/* Detailed Meta */}
            {format === 'detailed' && (
              <div className="border-b border-dashed border-black pb-1 mb-1.5 text-[10px]">
                <div className="flex justify-between">
                  <span>Order #: 1082</span>
                  <span>Today, 14:30</span>
                </div>
                <div className="flex justify-between">
                  <span>Type: DINE IN</span>
                  <span>Status: COMPLETED</span>
                </div>
              </div>
            )}

            {/* Items */}
            <div className={`border-b border-dashed border-black ${format === 'minimal' ? 'pb-1 mb-1' : 'pb-1.5 mb-1.5'}`}>
              <div className="flex justify-between font-bold text-[10px] pb-0.5 border-b border-black">
                <span>Item</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Total</span>
              </div>
              <div className={`flex justify-between ${format === 'minimal' ? 'py-0.5' : 'py-1'}`}>
                <span className="truncate max-w-[130px]">Kacchi Biryani</span>
                <span className="text-center">1</span>
                <span className="text-right">৳450</span>
              </div>
              <div className={`flex justify-between ${format === 'minimal' ? 'py-0.5' : 'py-1'}`}>
                <span className="truncate max-w-[130px]">Borhani Cold</span>
                <span className="text-center">2</span>
                <span className="text-right">৳160</span>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-0.5 text-[11px]">
              {format === 'detailed' && (
                <>
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>৳610.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (5%)</span>
                    <span>৳30.50</span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-bold pt-1 border-t border-black text-[12px]">
                <span>TOTAL</span>
                <span>৳640.50</span>
              </div>
              <div className="text-center text-[10px] pt-1">
                PAID VIA CASH
              </div>
            </div>

            {/* Detailed: Footer & Social */}
            {format === 'detailed' && (
              <div className="text-center pt-2 mt-2 border-t border-dashed border-gray-400 text-[9px] text-gray-600">
                Thank you for your visit!
              </div>
            )}
          </div>

          <p className="text-[11px] text-center text-base-content/50 mt-2">
            {format === 'minimal' ? '✓ ~45% shorter roll length per receipt' : 'Full standard receipt preview'}
          </p>
        </div>
      </div>
    </Card>
  );
}
