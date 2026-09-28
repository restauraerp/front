'use client';
import React, { useRef, useState } from 'react';
import { Check, Copy, ExternalLink, Globe, Share2, X } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { getSavedTenant } from '@/lib/tenant';

/**
 * The restaurant's online order link, one tap away at the till.
 *
 * Staff are the ones asked "can I order online?" - over the phone, at the
 * counter, in a Facebook comment - so the link lives where they already are,
 * ready to copy, open, or hand to WhatsApp. The restaurant code comes from
 * /auth/me rather than the tenant cookie alone, which expires after a day
 * while the session can outlive it.
 */
export default function OnlineOrderLink() {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const show = () => {
    setOpen(true);
    if (slug) return;
    setSlug(getSavedTenant());
    fetchApi('/auth/me')
      .then((me) => { if (me?.tenant?.slug) setSlug(me.tenant.slug); })
      .catch(() => {});
  };

  const url = slug && typeof window !== 'undefined' ? `${window.location.origin}/order/${slug}` : '';

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API needs a secure context; fall back to selecting the text.
      inputRef.current?.select();
      document.execCommand('copy');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    try {
      await navigator.share({ title: 'Order online', url });
    } catch {
      // Dismissed - nothing to do.
    }
  };

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Order online from us: ${url}`)}`;

  return (
    <>
      <button type="button" onClick={show} className="btn btn-sm btn-outline gap-1" title="Online order link">
        <Globe size={14} /> <span className="hidden sm:inline">Online Order Link</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-base-100 rounded-xl shadow-xl w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2"><Globe size={18} className="text-primary" /> Online Order Link</h3>
                <p className="text-sm text-base-content/60 mt-1">Customers pick their items and place a pickup or delivery order. It lands in Orders under <b>Customer Orders</b>, unpaid, to be paid on pickup or delivery.</p>
              </div>
              <button type="button" className="btn btn-sm btn-ghost btn-square" onClick={() => setOpen(false)} aria-label="Close"><X size={16} /></button>
            </div>

            {url ? (
              <>
                <div className="join w-full">
                  <input ref={inputRef} readOnly value={url} onFocus={(e) => e.target.select()} className="input input-bordered input-sm join-item flex-1 font-mono text-xs" />
                  <button type="button" onClick={copy} className="btn btn-sm btn-primary join-item gap-1">
                    {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost border-base-300 gap-1"><ExternalLink size={14} /> Open</a>
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost border-base-300 gap-1"><Share2 size={14} /> WhatsApp</a>
                  {canShare && <button type="button" onClick={share} className="btn btn-sm btn-ghost border-base-300 gap-1"><Share2 size={14} /> Share…</button>}
                </div>
              </>
            ) : (
              <div className="flex justify-center py-4"><span className="loading loading-spinner text-primary" /></div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
