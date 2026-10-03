'use client';
import React, { useState } from 'react';
import { Ban, Check, CheckCheck, Pencil, Phone, PhoneCall, RotateCcw, Trash2, Users, Wallet, X, MapPin, Clock, Printer, Mail } from 'lucide-react';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { Modal, useDialogs } from '@/components/ui/Dialogs';
import { EVENT_TYPES, PAYMENT_METHODS, STATUS_BADGE, longDate, money, time12, type BookingDetail as Detail } from './types';

const ACTIONS: Record<string, { label: string; className: string; Icon: typeof Check }> = {
  Confirmed: { label: 'Confirm', className: 'btn-success', Icon: Check },
  Declined: { label: 'Decline', className: 'btn-error btn-outline', Icon: X },
  Completed: { label: 'Mark completed', className: 'btn-ghost border-base-300', Icon: CheckCheck },
  Cancelled: { label: 'Cancel booking', className: 'btn-ghost text-error', Icon: Ban },
  Pending: { label: 'Back to tentative', className: 'btn-ghost border-base-300', Icon: RotateCcw },
};

/** One venue booking: the guest to call, the price, payments, and what can happen next. */
export default function BookingDetail({ booking: initial, onClose, onChanged, onEdit }: {
  booking: Detail;
  onClose: () => void;
  onChanged: (b: Detail) => void;
  onEdit: (b: Detail) => void;
}) {
  const [b, setB] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState({ amount: '', method: 'cash', note: '' });
  const { confirm, prompt, dialog } = useDialogs();

  const apply = (next: Detail) => { setB(next); onChanged(next); };

  const run = async (work: () => Promise<Detail>) => {
    setBusy(true); setError(null);
    try { apply(await work()); } catch (err) { setError(apiErrorMessage(err, 'Could not update the booking.')); } finally { setBusy(false); }
  };

  const move = async (status: string) => {
    let reason: string | null = null;
    if (status === 'Declined' || status === 'Cancelled') {
      reason = await prompt({
        title: status === 'Declined' ? `Decline ${b.guest_name}'s enquiry?` : `Cancel ${b.guest_name}'s booking?`,
        message: `Call ${b.guest_phone} to let them know - they are not told automatically.${b.paid > 0 ? ` ${money(b.paid)} has been paid; refund or keep it as agreed, and record that in your accounts.` : ''}`,
        label: 'Reason (for your records)',
        placeholder: status === 'Declined' ? 'Date already taken' : 'Guest cancelled',
        action: status === 'Declined' ? 'Decline' : 'Cancel booking',
        tone: 'btn-error',
      });
      if (reason === null) return;
    }
    if (status === 'Confirmed' && b.paid === 0 && !(await confirm({
      title: 'Confirm without an advance?',
      message: 'No payment has been recorded. Confirming holds the venue for this event.',
      action: 'Confirm anyway',
      tone: 'btn-success',
    }))) return;
    run(() => fetchApi(`/venue-bookings/${b.id}/status`, { method: 'POST', body: JSON.stringify({ status, reason }) }));
  };

  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const sendEmail = async () => {
    setBusy(true); setError(null); setEmailNotice(null);
    try {
      const res = await fetchApi(`/venue-bookings/${b.id}/email`, { method: 'POST' });
      setEmailNotice(`Sent to ${res.to}.`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send the email.'));
    } finally {
      setBusy(false);
    }
  };

  const addPayment = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const res = await fetchApi(`/venue-bookings/${b.id}/payments`, { method: 'POST', body: JSON.stringify({ amount: Number(payment.amount), method: payment.method, note: payment.note || null }) });
      setPayment({ amount: '', method: 'cash', note: '' });
      return res;
    });
  };

  const removePayment = async (id: number, amount: number) => {
    if (!(await confirm({ title: `Remove the ${money(amount)} payment?`, message: 'Only for a payment recorded by mistake.', action: 'Remove payment' }))) return;
    run(() => fetchApi(`/venue-bookings/${b.id}/payments/${id}`, { method: 'DELETE' }));
  };

  const open = b.status === 'Pending' || b.status === 'Confirmed';
  const order = ['Confirmed', 'Completed', 'Declined', 'Pending', 'Cancelled'];

  return (
    <Modal onClose={onClose} wide>
      {dialog}
      <div className="space-y-4">
        <div className="flex flex-wrap items-start gap-2 pr-8">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">{b.event_title || EVENT_TYPES[b.event_type] || 'Event'}</h3>
            <div className="text-sm text-base-content/70 flex flex-wrap gap-x-3 gap-y-1 mt-1">
              <span className="flex items-center gap-1"><Clock size={14} /> {longDate(b.date)}, {time12(b.start_time)} - {time12(b.end_time)}{b.end_date !== b.date ? ' (next day)' : ''}</span>
              <span className="flex items-center gap-1"><MapPin size={14} /> {b.hall?.name}{b.location ? `, ${b.location.name}` : ''}</span>
              <span className="flex items-center gap-1"><Users size={14} /> {b.guests} guests</span>
            </div>
          </div>
          <span className={`badge ${STATUS_BADGE[b.status] ?? 'badge-ghost'}`}>{b.status === 'Pending' ? 'Tentative' : b.status}</span>
          <span className="badge badge-ghost">{EVENT_TYPES[b.event_type]}</span>
        </div>

        <div className="rounded-xl border border-base-200 p-3 flex flex-wrap items-center gap-2">
          <span className="font-medium">{b.guest_name}</span>
          <a href={`tel:${b.guest_phone}`} className="btn btn-sm btn-outline btn-primary gap-1"><Phone size={14} /> {b.guest_phone}</a>
          {b.called_at
            ? <span className="text-xs text-success flex items-center gap-1"><PhoneCall size={12} /> Called {new Date(b.called_at).toLocaleString()}{b.called_by ? ` by ${b.called_by}` : ''}</span>
            : open && <button className="btn btn-xs btn-ghost border-base-300" disabled={busy} onClick={() => run(() => fetchApi(`/venue-bookings/${b.id}/called`, { method: 'POST' }))}><PhoneCall size={12} /> I called the guest</button>}
          <div className="basis-full flex flex-wrap items-center gap-2 text-sm">
            <Mail size={14} className="text-base-content/50" />
            {b.guest_email ? (
              <>
                <a className="link link-hover" href={`mailto:${b.guest_email}`}>{b.guest_email}</a>
                <span className="text-xs text-base-content/50">
                  Emailed automatically when confirmed, declined or paid{b.last_emailed_at ? ` · last ${new Date(b.last_emailed_at).toLocaleString()}` : ''}
                </span>
                {(b.status === 'Pending' || b.status === 'Confirmed' || b.status === 'Completed') && (
                  <button className="btn btn-xs btn-outline gap-1" disabled={busy} onClick={sendEmail}>
                    <Mail size={12} /> Email {b.status === 'Pending' ? 'quotation' : 'confirmation'}
                  </button>
                )}
              </>
            ) : (
              <span className="text-xs text-warning">No email - add one (Edit) to send the guest booking emails.</span>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-base-200 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Venue rent</span><span>{money(b.rent_amount)}</span></div>
            {b.package && <div className="flex justify-between"><span>{b.package.name} × {b.guests} @ {money(b.package.price_per_person)}</span><span>{money(b.food_amount)}</span></div>}
            {b.extras.map((x, i) => <div key={i} className="flex justify-between"><span>{x.label}</span><span>{money(x.amount)}</span></div>)}
            {b.discount > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>-{money(b.discount)}</span></div>}
            <div className="flex justify-between font-semibold text-base border-t border-base-300 pt-1"><span>Total</span><span>{money(b.total)}</span></div>
            <div className="flex justify-between"><span>Paid</span><span>{money(b.paid)}</span></div>
            <div className={`flex justify-between font-semibold ${b.due > 0 ? 'text-warning' : 'text-success'}`}><span>{b.due > 0 ? 'Due' : 'Fully paid'}</span><span>{money(b.due)}</span></div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-1"><Wallet size={14} /> Payments</div>
            {b.payments.length === 0 && <p className="text-xs text-base-content/60">No payments yet. Record the advance when it is paid.</p>}
            <ul className="space-y-1">
              {b.payments.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-sm rounded-lg bg-base-200 px-2 py-1">
                  <span className="font-medium">{money(p.amount)}</span>
                  <span className="badge badge-xs badge-ghost">{PAYMENT_METHODS[p.method] ?? p.method}</span>
                  <span className="flex-1 truncate text-xs text-base-content/60">{p.note ?? ''} {new Date(p.paid_at).toLocaleDateString()}{p.received_by ? ` · ${p.received_by}` : ''}</span>
                  <button className="btn btn-xs btn-ghost btn-square text-error" disabled={busy} onClick={() => removePayment(p.id, p.amount)} aria-label="Remove payment"><Trash2 size={12} /></button>
                </li>
              ))}
            </ul>
            {b.due > 0 && b.status !== 'Declined' && b.status !== 'Cancelled' && (
              <form className="flex flex-wrap gap-2" onSubmit={addPayment}>
                <input required type="number" min={1} max={b.due} step="0.01" className="input input-sm input-bordered w-28" placeholder="Amount" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
                <select className="select select-sm select-bordered" value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
                  {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input className="input input-sm input-bordered flex-1 min-w-24" maxLength={200} placeholder={b.paid === 0 ? 'Advance' : 'Note'} value={payment.note} onChange={(e) => setPayment({ ...payment, note: e.target.value })} />
                <button className="btn btn-sm btn-primary" disabled={busy}>Record</button>
              </form>
            )}
          </div>
        </div>

        {b.notes && <p className="text-sm bg-base-200 rounded-lg px-3 py-2 whitespace-pre-line">{b.notes}</p>}
        {b.decline_reason && <p className="text-sm text-error">{b.status}: {b.decline_reason}</p>}
        {b.handled_by && b.handled_at && <p className="text-xs text-base-content/50">{b.status === 'Declined' ? 'Declined' : 'Confirmed'} by {b.handled_by}, {new Date(b.handled_at).toLocaleString()}</p>}
        {emailNotice && <div role="status" className="alert alert-success text-sm py-2">{emailNotice}</div>}
        {error && <div role="alert" className="alert alert-error text-sm py-2 whitespace-pre-line">{error}</div>}

        <div className="flex flex-wrap gap-2 justify-end border-t border-base-200 pt-3">
          <div className="flex gap-1 mr-auto">
            {open && <button className="btn btn-sm btn-ghost gap-1" disabled={busy} onClick={() => onEdit(b)}><Pencil size={14} /> Edit</button>}
            <a className="btn btn-sm btn-ghost gap-1" href={`/venue-print/${b.id}`} target="_blank" rel="noopener noreferrer">
              <Printer size={14} /> {b.status === 'Pending' ? 'Quotation' : b.status === 'Completed' ? 'Invoice' : 'Confirmation'}
            </a>
          </div>
          {[...b.next].sort((x, y) => order.indexOf(x) - order.indexOf(y)).map((status) => {
            const a = ACTIONS[status];
            return a && (
              <button key={status} className={`btn btn-sm gap-1 ${a.className}`} disabled={busy} onClick={() => move(status)}>
                {busy ? <span className="loading loading-spinner loading-xs" /> : <a.Icon size={14} />} {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
