'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { fetchApi } from '@/lib/api';
import type { SubscriptionStatus } from '@/components/layout/SubscriptionBanner';
import { CalendarClock, CreditCard, Package, ShieldAlert, Sparkles } from 'lucide-react';

/**
 * What the restaurant is paying for, and when it next falls due.
 *
 * The app previously said none of this anywhere: a manager could only find out
 * their subscription had lapsed by being refused a save, and could not find out
 * beforehand at all. This is the screen that answers "which package are we on
 * and when do we pay again" without anyone having to ask us.
 */
export default function SubscriptionCard({ status }: { status: SubscriptionStatus | null }) {
  const [upgrading, setUpgrading] = useState(false);

  if (!status) return null;

  const trialing = status.tenant_status === 'trialing';

  // A trial and a paid subscription run off different dates - trial_ends_at
  // against expires_at - and mixing them up is how a trial ends up reported as
  // a paid plan expiring.
  const endsAt = trialing ? status.trial_ends_at : status.expires_at;
  const daysLeft = trialing ? status.trial_days_remaining : status.days_until_expiry;

  const date = (value?: string | null) =>
    value
      ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
      : '—';

  const [tone, label] = ((): [string, string] => {
    if (status.state === 'blocked') return ['badge-error', 'Cancelled'];
    if (status.state === 'read_only') return ['badge-error', 'Saving paused'];
    if (status.state === 'grace') return ['badge-warning', 'Payment overdue'];
    if (trialing) return ['badge-warning', 'Free trial'];
    return ['badge-success', 'Active'];
  })();

  /**
   * Same route the upgrade banner uses: the API mints a single-use token that
   * says which restaurant is paying, because a tenant code in a URL would let
   * anyone raise an order against someone else's restaurant.
   */
  const startPayment = async () => {
    if (upgrading) return;
    setUpgrading(true);

    try {
      const res = await fetchApi('/billing/upgrade-link', { method: 'POST' });

      if (res?.url) {
        window.location.href = res.url;
        return;
      }

      throw new Error('No upgrade URL returned');
    } catch (error) {
      console.error('Could not start payment', error);
      setUpgrading(false);
    }
  };

  const rows: Array<{ icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string }> = [
    {
      icon: <Package className="text-primary" size={20} />,
      label: 'Package',
      value: status.plan_name ?? status.plan ?? '—',
      hint: trialing
        ? 'You are on a free trial'
        : status.billing_cycle
          ? `Billed ${status.billing_cycle}`
          : undefined,
    },
    {
      icon: <CalendarClock className="text-info" size={20} />,
      label: trialing ? 'Trial ends' : 'Next payment due',
      value: date(endsAt),
      hint:
        typeof daysLeft === 'number'
          ? daysLeft >= 0
            ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} from today`
            : `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} ago`
          : undefined,
    },
  ];

  // Only worth showing once there is a paid period that can lapse - a trial has
  // no grace, so saying "saving stops on..." would invent a window they do not
  // have.
  if (!trialing && status.grace_ends_at) {
    rows.push({
      icon: <ShieldAlert className="text-warning" size={20} />,
      label: 'Saving stops after',
      value: date(status.grace_ends_at),
      hint:
        typeof status.grace_days === 'number'
          ? `${status.grace_days}-day grace period after the due date`
          : undefined,
    });
  }

  return (
    <Card title="Subscription">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-base-content/60">Status</span>
          <span className={`badge ${tone} badge-sm rounded-full text-white`}>{label}</span>
        </div>

        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 p-3 rounded-xl bg-base-200">
            {row.icon}
            <div className="min-w-0">
              <p className="text-xs text-base-content/50">{row.label}</p>
              <p className="font-semibold break-words">{row.value}</p>
              {row.hint && <p className="text-xs text-base-content/50 mt-0.5">{row.hint}</p>}
            </div>
          </div>
        ))}

        {/* The API's own words when something needs attention. It already
            explains that existing data is safe, so it is shown rather than
            reworded here. */}
        {status.message && (
          <div className={`alert ${status.state === 'grace' ? 'alert-warning' : 'alert-error'} text-sm`}>
            <span>{status.message}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button className="btn btn-primary flex-1 gap-2" onClick={startPayment} disabled={upgrading}>
            {upgrading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : trialing ? (
              <Sparkles size={16} />
            ) : (
              <CreditCard size={16} />
            )}
            {upgrading ? 'Opening…' : trialing ? 'Subscribe now' : 'Renew subscription'}
          </button>

          {status.contact?.url && (
            <a
              href={status.contact.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              View plans
            </a>
          )}
        </div>

        {status.is_demo && (
          <p className="text-xs text-base-content/50">
            This is the demo restaurant, so these details are for illustration only.
          </p>
        )}
      </div>
    </Card>
  );
}
