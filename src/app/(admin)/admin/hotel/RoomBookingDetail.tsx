'use client';
import React, { useEffect, useState } from 'react';
import { Ban, BedDouble, Check, DoorOpen, LogIn, LogOut, Mail, Pencil, Phone, Printer, RotateCcw, Trash2, UserX, Wallet, X } from 'lucide-react';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { Modal, useDialogs } from '@/components/ui/Dialogs';
import { PAYMENT_METHODS, STATUS_BADGE, money, shortDate, type RoomBookingDetail as Detail } from './types';

const ACTIONS: Record<string, { label: string; className: string; Icon: typeof Check }> = {
  Confirmed: { label: 'Confirm', className: 'btn-success', Icon: Check },
  'Checked in': { label: 'Check in', className: 'btn-info', Icon: LogIn },
  'Checked out': { label: 'Check out', className: 'btn-primary', Icon: LogOut },
  Declined: { label: 'Decline', className: 'btn-error btn-outline', Icon: X },
  'No-show': { label: 'No-show', className: 'btn-ghost border-base-300', Icon: UserX },
  Cancelled: { label: 'Cancel booking', className: 'btn-ghost text-error', Icon: Ban },
  Pending: { label: 'Back to request', className: 'btn-ghost border-base-300', Icon: RotateCcw },
};

/** One stay: the guest, the room, the money, and what the desk can do next. */
export default function RoomBookingDetail({ booking: initial, onClose, onChanged, onEdit }: {
  booking: Detail;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (b: Detail) => void;
}) {
  const [b, setB] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rooms, setRooms] = useState<{ id: number; number: string; floor: string | null }[] | null>(null);
  const [roomId, setRoomId] = useState<string>(initial.room ? String(initial.room.id) : '');
  const [payment, setPayment] = useState({ amount: '', method: 'cash', note: '' });
  const { confirm, prompt, dialog } = useDialogs();

  const holds = b.status === 'Confirmed' || b.status === 'Checked in';

  useEffect(() => {
    if (!holds) return;
    let live = true;
    fetchApi(`/hotel/bookings/${b.id}/rooms`).then((res) => { if (live) setRooms(res.rooms); }).catch(() => {});
    return () => { live = false; };
  }, [b.id, holds, b.room?.id]);

  const run = async (work: () => Promise<Detail>, done?: string) => {
    setBusy(true); setError(null); setNotice(null);
    try { setB(await work()); onChanged(); if (done) setNotice(done); } catch (err) { setError(apiErrorMessage(err, 'Could not update the booking.')); } finally { setBusy(false); }
  };

  const move = async (status: string) => {
    let reason: string | null = null;
    if (status === 'Declined' || status === 'Cancelled') {
      reason = await prompt({
        title: status === 'Declined' ? `Decline ${b.guest_name}'s request?` : `Cancel ${b.guest_name}'s booking?`,
        message: `${b.guest_email ? `They are emailed at ${b.guest_email}. ` : ''}Call ${b.guest_phone} to let them know.${b.paid > 0 ? ` ${money(b.paid)} has been paid - refund or keep it as agreed.` : ''}`,
        label: 'Reason (for your records)',
        placeholder: status === 'Declined' ? 'Fully booked' : 'Guest cancelled',
        action: status === 'Declined' ? 'Decline' : 'Cancel booking',
        tone: 'btn-error',
      });
      if (reason === null) return;
    }
    if (status === 'No-show' && !(await confirm({ title: 'Mark as a no-show?', message: `${b.guest_name} did not arrive. The room is freed.`, action: 'Mark no-show', tone: 'btn-warning' }))) return;
    if (status === 'Checked out' && b.due > 0 && !(await confirm({ title: `Check out with ${money(b.due)} still due?`, message: 'Record the payment first if the guest has paid.', action: 'Check out anyway', tone: 'btn-warning' }))) return;
    if (status === 'Checked in' && !roomId) { setError('Choose the room first.'); return; }

    run(() => fetchApi(`/hotel/bookings/${b.id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason, room_id: status === 'Checked in' ? Number(roomId) : undefined }),
    }), status === 'Checked in' ? `Checked in to room ${rooms?.find((r) => String(r.id) === roomId)?.number ?? ''}.` : undefined);
  };

  const assign = (value: string) => {
    setRoomId(value);
    if (b.status === 'Confirmed') run(() => fetchApi(`/hotel/bookings/${b.id}/room`, { method: 'POST', body: JSON.stringify({ room_id: value ? Number(value) : null }) }), value ? 'Room assigned.' : 'Room unassigned.');
  };

  const addPayment = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const res = await fetchApi(`/hotel/bookings/${b.id}/payments`, { method: 'POST', body: JSON.stringify({ amount: Number(payment.amount), method: payment.method, note: payment.note || null }) });
      setPayment({ amount: '', method: 'cash', note: '' });
      return res;
    }, 'Payment recorded.');
  };

  const removePayment = async (id: number, amount: number) => {
    if (!(await confirm({ title: `Remove the ${money(amount)} payment?`, message: 'Only for a payment recorded by mistake.', action: 'Remove payment' }))) return;
    run(() => fetchApi(`/hotel/bookings/${b.id}/payments/${id}`, { method: 'DELETE' }));
  };

  const sendEmail = async () => {
    setBusy(true); setError(null);
    try { const res = await fetchApi(`/hotel/bookings/${b.id}/email`, { method: 'POST' }); setNotice(`Sent to ${res.to}.`); } catch (err) { setError(apiErrorMessage(err, 'Could not send the email.')); } finally { setBusy(false); }
  };

  const order = ['Confirmed', 'Checked in', 'Checked out', 'Declined', 'No-show', 'Pending', 'Cancelled'];
  const open = b.status === 'Pending' || b.status === 'Confirmed';

  return (
    <Modal onClose={onClose} wide>
      {dialog}
      <div className="space-y-4">
        <div className="flex flex-wrap items-start gap-2 pr-8">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">{b.guest_name}</h3>
            <div className="text-sm text-base-content/70">
              {b.room_type?.name} · {shortDate(b.check_in)} → {shortDate(b.check_out)} · {b.nights} night{b.nights === 1 ? '' : 's'} · {b.adults} adult{b.adults === 1 ? '' : 's'}{b.children ? `, ${b.children} child${b.children === 1 ? '' : 'ren'}` : ''}
            </div>
          </div>
          <span className={`badge ${STATUS_BADGE[b.status] ?? 'badge-ghost'}`}>{b.status === 'Pending' ? 'Request' : b.status}</span>
          {b.source === 'website' && <span className="badge badge-ghost">Website</span>}
        </div>

        <div className="rounded-xl border border-base-200 p-3 flex flex-wrap items-center gap-2 text-sm">
          <a href={`tel:${b.guest_phone}`} className="btn btn-sm btn-outline btn-primary gap-1"><Phone size={14} /> {b.guest_phone}</a>
          {b.guest_email ? (
            <>
              <span className="flex items-center gap-1"><Mail size={14} className="text-base-content/50" /> {b.guest_email}</span>
              {b.last_emailed_at && <span className="text-xs text-base-content/50">emailed {new Date(b.last_emailed_at).toLocaleString()}</span>}
              {(open || b.status === 'Checked in') && <button className="btn btn-xs btn-outline gap-1" disabled={busy} onClick={sendEmail}><Mail size={12} /> Email {b.status === 'Pending' ? 'acknowledgement' : 'confirmation'}</button>}
            </>
          ) : <span className="text-xs text-base-content/50">No email - the guest is reached by phone.</span>}
        </div>

        {holds && (
          <div className="rounded-xl bg-base-200 p-3 flex flex-wrap items-center gap-2 text-sm">
            <BedDouble size={16} />
            <span className="font-medium">Room</span>
            <select className="select select-sm select-bordered" value={roomId} disabled={busy} onChange={(e) => assign(e.target.value)}>
              <option value="">{b.status === 'Checked in' ? 'Choose…' : 'Not assigned yet'}</option>
              {b.room && !rooms?.some((r) => r.id === b.room!.id) && <option value={b.room.id}>{b.room.number}</option>}
              {(rooms ?? []).map((r) => <option key={r.id} value={r.id}>{r.number}{r.floor ? ` (floor ${r.floor})` : ''}</option>)}
            </select>
            {rooms && rooms.length === 0 && !b.room && <span className="text-xs text-error">No room of this type is free for all these nights.</span>}
            {b.checked_in_at && <span className="text-xs text-base-content/60 flex items-center gap-1"><DoorOpen size={12} /> In since {new Date(b.checked_in_at).toLocaleString()}</span>}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-base-200 p-3 text-sm space-y-1">
            {b.nightly_rates.length <= 7
              ? b.nightly_rates.map((n) => <div key={n.date} className="flex justify-between text-xs"><span>{shortDate(n.date)}</span><span>{money(n.rate)}</span></div>)
              : <div className="flex justify-between"><span>{b.nights} nights</span><span>{money(b.room_amount)}</span></div>}
            {b.extras.map((x, i) => <div key={i} className="flex justify-between"><span>{x.label}</span><span>{money(x.amount)}</span></div>)}
            {b.discount > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>-{money(b.discount)}</span></div>}
            <div className="flex justify-between font-semibold text-base border-t border-base-300 pt-1"><span>Total</span><span>{money(b.total)}</span></div>
            <div className="flex justify-between"><span>Paid</span><span>{money(b.paid)}</span></div>
            <div className={`flex justify-between font-semibold ${b.due > 0 ? 'text-warning' : 'text-success'}`}><span>{b.due > 0 ? 'Due' : 'Fully paid'}</span><span>{money(b.due)}</span></div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-1"><Wallet size={14} /> Payments</div>
            {b.payments.length === 0 && <p className="text-xs text-base-content/60">No payments yet.</p>}
            <ul className="space-y-1">
              {b.payments.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-sm rounded-lg bg-base-200 px-2 py-1">
                  <span className="font-medium">{money(p.amount)}</span>
                  <span className="badge badge-xs badge-ghost">{PAYMENT_METHODS[p.method] ?? p.method}</span>
                  <span className="flex-1 truncate text-xs text-base-content/60">{p.note ?? ''} {new Date(p.paid_at).toLocaleDateString()}</span>
                  <button className="btn btn-xs btn-ghost btn-square text-error" disabled={busy} onClick={() => removePayment(p.id, p.amount)} aria-label="Remove payment"><Trash2 size={12} /></button>
                </li>
              ))}
            </ul>
            {b.due > 0 && !['Declined', 'Cancelled'].includes(b.status) && (
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
        {notice && <div role="status" className="alert alert-success text-sm py-2">{notice}</div>}
        {error && <div role="alert" className="alert alert-error text-sm py-2 whitespace-pre-line">{error}</div>}

        <div className="flex flex-wrap gap-2 justify-end border-t border-base-200 pt-3">
          <div className="flex gap-1 mr-auto">
            {open && <button className="btn btn-sm btn-ghost gap-1" disabled={busy} onClick={() => onEdit(b)}><Pencil size={14} /> Edit</button>}
            <a className="btn btn-sm btn-ghost gap-1" href={`/room-print/${b.id}`} target="_blank" rel="noopener noreferrer"><Printer size={14} /> {b.status === 'Checked out' ? 'Invoice' : 'Confirmation'}</a>
          </div>
          {[...b.next].sort((x, y) => order.indexOf(x) - order.indexOf(y)).map((status) => {
            const a = status === 'Confirmed' && b.status !== 'Pending'
              ? { label: b.status === 'Checked in' ? 'Undo check-in' : 'Undo no-show', className: 'btn-ghost border-base-300', Icon: RotateCcw }
              : status === 'Checked in' && b.status === 'Checked out'
                ? { label: 'Undo check-out', className: 'btn-ghost border-base-300', Icon: RotateCcw }
                : ACTIONS[status];
            return a && (
              <button key={status} className={`btn btn-sm gap-1 ${a.className}`} disabled={busy || (status === 'Checked in' && !roomId)} onClick={() => move(status)} title={status === 'Checked in' && !roomId ? 'Choose the room first' : undefined}>
                {busy ? <span className="loading loading-spinner loading-xs" /> : <a.Icon size={14} />} {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
