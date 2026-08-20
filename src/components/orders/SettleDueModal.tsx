'use client';

import React, { useState } from 'react';
import { Banknote, CreditCard, Smartphone } from 'lucide-react';
import { fetchApi, apiErrorMessage } from '@/lib/api';

/** The little an order has to carry to be settled. */
export interface SettleableOrder {
  id: number;
  total?: string | number | null;
  amount_outstanding?: number | null;
  due_note?: string | null;
  customer?: { name?: string | null } | null;
}

interface Props {
  order: SettleableOrder;
  onClose: () => void;
  /** Called after the API has taken the money, so the caller can reload. */
  onSettled: () => void;
}

const taka = (value: number) =>
  `৳${value.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The same three the till offers, so a tab settled a week later lands in the
 * same bucket the Completed tab groups by. A free-text method would split
 * "bkash" from "mfs" in reconciliation for no gain.
 */
const METHODS = [
  { value: 'cash', label: 'Cash', Icon: Banknote },
  { value: 'card', label: 'Card', Icon: CreditCard },
  { value: 'mfs', label: 'MFS', Icon: Smartphone },
] as const;

/**
 * Collecting money owed on an order, in part or in full.
 *
 * Part payments get their own field rather than being assumed away: a guest
 * settles half the tab on Friday and the rest on Sunday, and the balance is
 * what the restaurant is chasing. The amount is seeded with what is left rather
 * than with the bill, because asking again for a tab already half paid is the
 * mistake this screen exists to prevent.
 */
export function SettleDueModal({ order, onClose, onSettled }: Props) {
  const outstanding = Number(order.amount_outstanding ?? order.total ?? 0);

  const [amount, setAmount] = useState(outstanding.toFixed(2));
  const [method, setMethod] = useState<string>('cash');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entered = Number(amount);
  // Checked here so a typo is caught before a round trip; the API refuses the
  // same thing, and it is the API that decides.
  const problem =
    !(entered > 0)
      ? 'Enter how much is being paid now.'
      : entered > outstanding + 0.001
        ? `Only ${taka(outstanding)} is outstanding on this order.`
        : null;

  const submit = async () => {
    if (problem) { setError(problem); return; }

    setSaving(true);
    setError(null);
    try {
      await fetchApi(`/orders/${order.id}/settle`, {
        method: 'POST',
        body: JSON.stringify({ amount: entered.toFixed(2), method, note: note || null }),
      });
      onSettled();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not record this payment.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-lg">Collect on order #{order.id}</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {order.due_note && (
          <p className="text-sm text-base-content/60 mb-4">On account: {order.due_note}</p>
        )}

        <div className="bg-base-200/50 border border-base-300 rounded-2xl p-4 text-center mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-base-content/60 mb-1">Outstanding</p>
          <p className="text-3xl font-extrabold text-warning">{taka(outstanding)}</p>
          {Number(order.total ?? 0) > outstanding && (
            <p className="text-xs text-base-content/60 mt-1">
              of {taka(Number(order.total ?? 0))} billed — the rest is already paid
            </p>
          )}
        </div>

        <div className="form-control w-full mb-4">
          <label className="label py-1" htmlFor="settle-amount">
            <span className="label-text font-semibold">Paying now</span>
          </label>
          <input
            id="settle-amount"
            type="number"
            step="0.01"
            min="0"
            max={outstanding}
            className="input input-bordered w-full text-lg font-semibold"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(null); }}
          />
          {entered > 0 && entered < outstanding && (
            <p className="text-xs text-base-content/60 mt-1">
              {taka(outstanding - entered)} will still be owed.
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="label px-0 py-1"><span className="label-text font-semibold">Paid by</span></label>
          <div className="grid grid-cols-3 gap-3">
            {METHODS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMethod(value)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-200 ${
                  method === value
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-base-200 bg-base-100 hover:border-primary/30 hover:bg-base-200'
                }`}
              >
                <Icon size={22} className="mb-1.5" />
                <span className="font-semibold text-sm">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-control w-full mb-5">
          <label className="label py-1" htmlFor="settle-note">
            <span className="label-text text-sm">Reference or note (optional)</span>
          </label>
          <input
            id="settle-note"
            className="input input-bordered w-full"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={method === 'mfs' ? 'e.g. bKash TrxID BKS8891' : method === 'card' ? 'e.g. Visa ending 4421' : 'e.g. settled at the counter'}
          />
        </div>

        {error && <p className="text-error text-sm mb-3">{error}</p>}

        <button
          className="btn btn-primary w-full btn-lg rounded-xl"
          onClick={submit}
          disabled={saving || !!problem}
        >
          {saving ? <span className="loading loading-spinner" /> : `Record ${taka(entered > 0 ? entered : 0)}`}
        </button>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
