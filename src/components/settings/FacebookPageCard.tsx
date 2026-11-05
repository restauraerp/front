'use client';
import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { BRANDING_KEYS, clearBrandingCache } from '@/hooks/useBranding';
import { displayFacebookUrl, normaliseFacebookUrl } from '@/lib/facebook';

interface StoredSetting {
  id: number;
  key: string;
  value: string;
}

/**
 * The restaurant's Facebook page, and whether to print it as a QR code on the
 * customer receipt.
 *
 * A card of its own rather than another field in Restaurant identity: the
 * QR switch belongs with the link it prints, and turning it on is a choice
 * about the receipt, not a fact about the restaurant.
 *
 * Stored in the same key/value table as the rest - facebook_page_url, cleaned
 * up to a canonical https link, and receipt_facebook_qr as '1'/'0'. The switch
 * cannot be turned on without a valid page, and the receipt checks both again.
 */
export default function FacebookPageCard({ onSaved }: { onSaved?: () => void }) {
  const [stored, setStored] = useState<StoredSetting[] | null>(null);
  const [url, setUrl] = useState('');
  const [printQr, setPrintQr] = useState(false);
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
        setUrl(rows.find((r) => r.key === BRANDING_KEYS.facebookPage)?.value ?? '');
        setPrintQr(rows.find((r) => r.key === BRANDING_KEYS.facebookQr)?.value === '1');
      })
      .catch(() => active && setStored([]));

    return () => { active = false; };
  }, []);

  const page = normaliseFacebookUrl(url);
  const invalid = url.trim() !== '' && page === null;

  const write = async (key: string, value: string) => {
    const existing = stored?.find((row) => row.key === key);

    if ((existing?.value ?? '') === value) return;

    if (existing) {
      await fetchApi(`/website-settings/${existing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ key, value, type: 'string' }),
      });
    } else if (value !== '') {
      await fetchApi('/website-settings', {
        method: 'POST',
        body: JSON.stringify({ key, value, type: 'string' }),
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid) return;

    setSaving(true);
    setError(null);

    try {
      await write(BRANDING_KEYS.facebookPage, page ?? '');
      // No page, no QR: a switch left on with nothing to print is off.
      await write(BRANDING_KEYS.facebookQr, page && printQr ? '1' : '0');

      clearBrandingCache();
      if (page) setUrl(page);
      if (!page) setPrintQr(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved?.();

      const refreshed = await fetchApi('/website-settings?nopaginate=1');
      setStored((refreshed?.data ?? refreshed ?? []) as StoredSetting[]);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the Facebook page.'));
    } finally {
      setSaving(false);
    }
  };

  if (stored === null) {
    return (
      <Card title="Facebook page">
        <div className="flex justify-center py-8"><span className="loading loading-spinner text-primary" /></div>
      </Card>
    );
  }

  return (
    <Card title="Facebook page">
      <p className="text-sm text-base-content/60 mb-4">
        Your restaurant&apos;s Facebook page. Print it as a QR code on customer receipts so guests can follow you in one scan.
      </p>

      {error && <div role="alert" className="alert alert-error mb-4 text-sm"><span>{error}</span></div>}

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6">
        <div className="space-y-4">
          <label className="form-control w-full">
            <span className="label-text font-medium mb-1">Facebook page URL</span>
            <input
              type="text"
              inputMode="url"
              className={`input input-bordered w-full ${invalid ? 'input-error' : ''}`}
              placeholder="https://www.facebook.com/yourrestaurant"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            {invalid ? (
              <span className="text-xs text-error mt-1">That isn&apos;t a Facebook page link. Copy it from your page, e.g. facebook.com/yourrestaurant.</span>
            ) : page ? (
              <a href={page} target="_blank" rel="noopener noreferrer" className="text-xs link link-primary mt-1 inline-flex items-center gap-1">
                <ExternalLink size={12} /> Check it opens your page
              </a>
            ) : null}
          </label>

          <label className={`flex items-start gap-3 rounded-lg border border-base-300 p-3 ${page ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
            <input
              type="checkbox"
              className="toggle toggle-primary mt-0.5"
              checked={!!page && printQr}
              disabled={!page}
              onChange={(e) => setPrintQr(e.target.checked)}
            />
            <span>
              <span className="font-medium block">Print QR code on customer receipt</span>
              <span className="text-xs text-base-content/60">
                {page ? 'Added above the closing line of every customer receipt.' : 'Add your page link first.'}
              </span>
            </span>
          </label>

          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary" disabled={saving || invalid}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            {saved && <span className="text-success text-sm">Saved — receipts will use this straight away.</span>}
          </div>
        </div>

        {page && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-base-300 p-4 bg-white self-start">
            <span className="text-xs text-base-content/60">{printQr ? 'On the receipt' : 'Preview'}</span>
            <QRCodeSVG value={page} size={112} level="M" />
            <span className="text-[10px] text-base-content/60 max-w-[140px] break-all text-center">{displayFacebookUrl(page)}</span>
          </div>
        )}
      </form>
    </Card>
  );
}
