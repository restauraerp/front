'use client';

import React from 'react';
import { AlertTriangle, Clock, Mail, Phone, MessageCircle, ExternalLink } from 'lucide-react';

/**
 * The subscription block GET /auth/me returns.
 *
 * `state` is stable and safe to branch on; `message` is prose written for a
 * restaurant manager and is rendered as-is rather than reworded here - the API
 * already explains that existing data is safe and how to start saving again.
 */
export type SubscriptionStatus = {
  state: 'full' | 'grace' | 'read_only' | 'blocked';
  error?: string | null;
  message?: string | null;
  read_only?: boolean;
  days_remaining?: number;
  contact?: { email?: string; phone?: string; whatsapp?: string; url?: string };
};

/**
 * Shown above every admin screen when billing needs attention.
 *
 * It exists so a manager finds out before losing work: previously the first
 * sign of an expired subscription was a save that failed with "API Request
 * Failed: 403 Forbidden".
 */
export default function SubscriptionBanner({ status }: { status: SubscriptionStatus | null }) {
  if (!status || status.state === 'full' || !status.message) return null;

  const readOnly = status.state === 'read_only' || status.state === 'blocked';
  const contact = status.contact ?? {};

  return (
    <div
      role="alert"
      className={`alert rounded-none border-x-0 border-t-0 ${readOnly ? 'alert-error' : 'alert-warning'}`}
    >
      {readOnly ? <AlertTriangle size={20} className="shrink-0" /> : <Clock size={20} className="shrink-0" />}

      <div className="flex-1 min-w-0">
        <p className="font-semibold">
          {readOnly ? 'Saving is paused' : 'Action needed to keep saving'}
        </p>
        <p className="text-sm opacity-90">{status.message}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {contact.url && (
          <a href={contact.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
            <ExternalLink size={14} /> View plans
          </a>
        )}
        {contact.whatsapp && (
          <a
            href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-ghost"
          >
            <MessageCircle size={14} /> WhatsApp
          </a>
        )}
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="btn btn-sm btn-ghost">
            <Phone size={14} /> {contact.phone}
          </a>
        )}
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="btn btn-sm btn-ghost">
            <Mail size={14} /> {contact.email}
          </a>
        )}
      </div>
    </div>
  );
}
