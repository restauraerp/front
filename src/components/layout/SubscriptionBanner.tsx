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
  /** Raw tenant status. A running trial reports state `full`, so this is the
   *  only field that distinguishes a trial from a paid subscription. */
  tenant_status?: 'trialing' | 'active' | 'suspended' | 'cancelled';
  /** Whether this really is the demo restaurant. The `demo_session` cookie
   *  cannot answer this: it outlives the demo visit and follows the visitor
   *  into their own account. */
  is_demo?: boolean;
  trial_ends_at?: string | null;
  trial_days_remaining?: number | null;
  /** The package itself. Sent for a healthy subscription too, not only a
   *  failing one, so the profile screen can always name it. */
  plan?: string | null;
  plan_name?: string | null;
  billing_cycle?: 'monthly' | 'yearly' | null;
  /** The day the paid period ends, which is also when the next payment is
   *  due. `expired_at` carries the same value under an older name. */
  expires_at?: string | null;
  expired_at?: string | null;
  /** When saving actually stops - the due date plus the grace period. */
  grace_ends_at?: string | null;
  grace_days?: number | null;
  /** Whole days until the paid period ends; negative once it has passed. */
  days_until_expiry?: number | null;
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
      className={[
        'alert',
        // daisyUI 5 lays .alert out as a grid with grid-auto-flow: column, so
        // three children become three columns at every width and crush on a
        // phone. Stacked below sm, columns above - the documented pattern.
        'alert-vertical sm:alert-horizontal',
        // Full-bleed strip rather than a floating card: it sits flush under the
        // topbar and should read as part of the chrome.
        'rounded-none border-x-0 border-t-0',
        readOnly ? 'alert-error' : 'alert-warning',
      ].join(' ')}
    >
      {readOnly ? <AlertTriangle size={20} className="shrink-0" /> : <Clock size={20} className="shrink-0" />}

      <div className="min-w-0 text-center sm:text-start">
        <p className="font-semibold leading-tight">
          {readOnly ? 'Saving is paused' : 'Action needed to keep saving'}
        </p>
        <p className="text-sm opacity-90 leading-snug mt-0.5">{status.message}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-end">
        {contact.url && (
          <a
            href={contact.url}
            target="_blank"
            rel="noopener noreferrer"
            // Explicit colours, not btn-neutral: inside a coloured alert the
            // neutral background is overridden while the alert's white text
            // colour still inherits, leaving white-on-white. Stating both ends
            // of the pair keeps it readable on error and warning alike.
            className="btn btn-sm gap-1.5 bg-base-100 text-base-content border-base-100 hover:bg-base-200 hover:border-base-200"
          >
            View plans
            <ExternalLink size={14} />
          </a>
        )}

        {/* Icon-only, with the address or number in the tooltip. Spelling out a
            long email inside a button is what made this row sprawl on desktop
            and wrap onto three lines on a phone. */}
        {contact.whatsapp && (
          <a
            href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-square btn-ghost"
            aria-label={`WhatsApp ${contact.whatsapp}`}
            title={`WhatsApp ${contact.whatsapp}`}
          >
            <MessageCircle size={16} />
          </a>
        )}

        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="btn btn-sm btn-square btn-ghost"
            aria-label={`Call ${contact.phone}`}
            title={`Call ${contact.phone}`}
          >
            <Phone size={16} />
          </a>
        )}

        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="btn btn-sm btn-square btn-ghost"
            aria-label={`Email ${contact.email}`}
            title={`Email ${contact.email}`}
          >
            <Mail size={16} />
          </a>
        )}
      </div>
    </div>
  );
}
