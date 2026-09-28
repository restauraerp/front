'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Send, Plug, Copy, Check, ExternalLink, Share2, Unlink, AlertTriangle, Eye, EyeOff, RefreshCw, Bike } from 'lucide-react';
import { fetchApi, apiErrorMessage } from '@/lib/api';

/**
 * Integration: the restaurant's own Telegram bot, and its riders' links.
 *
 * The owner makes a bot with @BotFather and pastes its token here. Each rider
 * is then onboarded with a single-use link copied from the riders list; once
 * they tap Start in Telegram, every delivery assigned to them arrives in their
 * chat, with a Delivered button. When the delivery is over the message is cut
 * down to the customer's name.
 *
 * Only shown to the owner (manage_integrations), and only with the Delivery
 * module - the sidebar and the API both enforce that.
 */

type Bot = { username: string; name: string | null; link: string; last_error: string | null; connected_at: string | null };
type Rider = {
  id: number;
  name: string;
  phone: string | null;
  location: string | null;
  linked: boolean;
  telegram_username: string | null;
  linked_at: string | null;
  link_expires_at: string | null;
};
type State = { bot: Bot | null; limits: { per_second: number; per_minute: number }; riders: Rider[] };
type IssuedLink = { riderId: number; link: string; expires_at: string };

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '';

export default function IntegrationsPage() {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [editingToken, setEditingToken] = useState(false);
  const [saving, setSaving] = useState(false);

  const [issued, setIssued] = useState<IssuedLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyRider, setBusyRider] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setState(await fetchApi('/integrations/telegram'));
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load the integration.'));
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    return () => clearTimeout(first);
  }, [load]);

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetchApi('/integrations/telegram', { method: 'PUT', body: JSON.stringify({ token: token.trim() }) });
      setToken('');
      setEditingToken(false);
      setNotice(res?.webhook_error
        ? null
        : `Connected to @${res?.bot?.username}. Now send each rider their onboarding link.`);
      if (res?.webhook_error) setError(res.webhook_error);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not connect the bot.'));
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect the Telegram bot? Riders stop getting notifications, and every rider will need a new onboarding link if you connect again.')) return;
    try {
      await fetchApi('/integrations/telegram', { method: 'DELETE' });
      setIssued(null);
      setNotice('Telegram bot disconnected.');
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not disconnect the bot.'));
    }
  };

  const issueLink = async (rider: Rider) => {
    setBusyRider(rider.id);
    setError(null);
    try {
      const res = await fetchApi(`/integrations/telegram/riders/${rider.id}/link`, { method: 'POST' });
      setIssued({ riderId: rider.id, link: res.link, expires_at: res.expires_at });
      setCopied(false);
      try {
        await navigator.clipboard.writeText(res.link);
        setCopied(true);
      } catch {
        // Clipboard needs a secure context; the link is shown to copy by hand.
      }
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create the link.'));
    } finally {
      setBusyRider(null);
    }
  };

  const unlink = async (rider: Rider) => {
    if (!confirm(`Stop sending deliveries to ${rider.name} on Telegram? They will need a new link to reconnect.`)) return;
    setBusyRider(rider.id);
    try {
      await fetchApi(`/integrations/telegram/riders/${rider.id}/link`, { method: 'DELETE' });
      if (issued?.riderId === rider.id) setIssued(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not disconnect the rider.'));
    } finally {
      setBusyRider(null);
    }
  };

  const test = async (rider: Rider) => {
    setBusyRider(rider.id);
    setError(null);
    try {
      await fetchApi(`/integrations/telegram/riders/${rider.id}/test`, { method: 'POST' });
      setNotice(`Test message sent to ${rider.name}. It should arrive in a few seconds.`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send the test message.'));
    } finally {
      setBusyRider(null);
    }
  };

  const copyIssued = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Selecting the field is the fallback.
    }
  };

  if (!state && !error) {
    return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary" /></div>;
  }

  const bot = state?.bot ?? null;
  const issuedRider = state?.riders.find((r) => r.id === issued?.riderId);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Plug size={22} /> Integration</h1>
        <p className="text-sm text-base-content/60 mt-1">Connect outside services to your restaurant.</p>
      </div>

      {error && <div className="alert alert-error text-sm"><AlertTriangle size={16} /> {error}</div>}
      {notice && <div className="alert alert-success text-sm">{notice}</div>}

      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="card-title"><Send size={18} className="text-sky-500" /> Telegram - rider notifications</h2>
              <p className="text-sm text-base-content/60 mt-1 max-w-2xl">
                When you assign a rider to a delivery, your restaurant&apos;s bot sends them the order, the customer&apos;s
                details and a map link, with a <b>Delivered</b>{' '}button. Once it&apos;s delivered, the phone number and address
                are removed from their chat.
              </p>
            </div>
            {bot ? <span className="badge badge-success gap-1">Connected</span> : <span className="badge badge-ghost">Not connected</span>}
          </div>

          {bot && !editingToken ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-base-200/60 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{bot.name || 'Your bot'} <a className="link link-primary font-normal" href={bot.link} target="_blank" rel="noopener noreferrer">@{bot.username}</a></div>
                <div className="text-xs text-base-content/60">
                  Connected {when(bot.connected_at)} · sends at most {state?.limits.per_second} message a second and {state?.limits.per_minute} a minute
                </div>
              </div>
              <button className="btn btn-sm btn-ghost border-base-300" onClick={() => setEditingToken(true)}><RefreshCw size={14} /> Replace token</button>
              <button className="btn btn-sm btn-ghost text-error" onClick={disconnect}><Unlink size={14} /> Disconnect</button>
              {bot.last_error && (
                <div className="alert alert-warning text-sm w-full"><AlertTriangle size={16} /> {bot.last_error}</div>
              )}
            </div>
          ) : (
            <form onSubmit={connect} className="grid gap-4 md:grid-cols-2">
              <ol className="text-sm space-y-2 list-decimal list-inside text-base-content/80">
                <li>In Telegram, open <a className="link link-primary" href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">@BotFather</a> and send <code className="bg-base-200 px-1 rounded">/newbot</code>.</li>
                <li>Give it a name riders will recognise, e.g. <i>Bangla Bistro Riders</i>.</li>
                <li>Give it a username ending in <code className="bg-base-200 px-1 rounded">bot</code>, e.g. <i>banglabistro_riders_bot</i>.</li>
                <li>BotFather replies with a token like <code className="bg-base-200 px-1 rounded">123456789:AAE…</code>. Paste it here.</li>
              </ol>
              <div className="space-y-3">
                <label className="form-control">
                  <span className="label-text font-medium mb-1">Bot token</span>
                  <div className="join w-full">
                    <input
                      required
                      type={showToken ? 'text' : 'password'}
                      autoComplete="off"
                      spellCheck={false}
                      className="input input-bordered join-item flex-1 font-mono text-sm"
                      placeholder="123456789:AAE..."
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                    />
                    <button type="button" className="btn join-item" onClick={() => setShowToken((v) => !v)} aria-label={showToken ? 'Hide token' : 'Show token'}>
                      {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span className="text-xs text-base-content/50 mt-1">Keep it private - anyone with it can send messages as your bot. It is stored encrypted.</span>
                </label>
                <div className="flex gap-2">
                  <button className="btn btn-primary" disabled={saving || !token.trim()}>
                    {saving ? <span className="loading loading-spinner loading-sm" /> : <Plug size={16} />} {bot ? 'Save new token' : 'Connect bot'}
                  </button>
                  {bot && <button type="button" className="btn btn-ghost" onClick={() => { setEditingToken(false); setToken(''); }}>Cancel</button>}
                </div>
                {bot && <p className="text-xs text-warning">Switching to a different bot disconnects every rider; they will need new links.</p>}
              </div>
            </form>
          )}
        </div>
      </div>

      {bot && (
        <div className="card bg-base-100 border border-base-200 shadow-sm">
          <div className="card-body gap-4">
            <div>
              <h2 className="card-title"><Bike size={18} /> Riders</h2>
              <p className="text-sm text-base-content/60 mt-1">
                Copy a rider&apos;s onboarding link and send it to them (WhatsApp works well). They open it, tap <b>Start</b>, and
                they&apos;re connected. Each link works once and expires after 3 days.
              </p>
            </div>

            {issued && issuedRider && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                <div className="text-sm font-medium">
                  Onboarding link for {issuedRider.name} {copied && <span className="badge badge-success badge-sm ml-1">Copied</span>}
                </div>
                <div className="join w-full">
                  <input readOnly value={issued.link} onFocus={(e) => e.target.select()} className="input input-bordered input-sm join-item flex-1 font-mono text-xs" />
                  <button className="btn btn-sm btn-primary join-item" onClick={copyIssued}>{copied ? <Check size={14} /> : <Copy size={14} />} Copy</button>
                </div>
                <div className="flex flex-wrap gap-2 text-xs items-center">
                  <a className="btn btn-xs btn-ghost border-base-300" target="_blank" rel="noopener noreferrer"
                     href={`https://wa.me/${(issuedRider.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${issuedRider.name}, open this to get delivery notifications on Telegram: ${issued.link}`)}`}>
                    <Share2 size={12} /> Send on WhatsApp
                  </a>
                  <span className="text-base-content/60">Expires {when(issued.expires_at)}. Making a new link cancels this one.</span>
                </div>
              </div>
            )}

            {state && state.riders.length === 0 ? (
              <p className="text-sm text-base-content/60 py-6 text-center">
                No riders yet. Add employees with the <b>Rider</b>{' '}role in HRM - they don&apos;t need to be able to sign in.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr><th>Rider</th><th>Telegram</th><th className="text-right">Actions</th></tr>
                  </thead>
                  <tbody>
                    {state?.riders.map((rider) => (
                      <tr key={rider.id}>
                        <td>
                          <div className="font-medium">{rider.name}</div>
                          <div className="text-xs text-base-content/60">{[rider.location, rider.phone].filter(Boolean).join(' · ')}</div>
                        </td>
                        <td>
                          {rider.linked ? (
                            <div>
                              <span className="badge badge-success badge-sm">Connected</span>
                              <div className="text-xs text-base-content/60 mt-1">
                                {rider.telegram_username ? `@${rider.telegram_username} · ` : ''}since {when(rider.linked_at)}
                              </div>
                            </div>
                          ) : rider.link_expires_at ? (
                            <div>
                              <span className="badge badge-warning badge-sm">Link sent</span>
                              <div className="text-xs text-base-content/60 mt-1">Waiting for them to tap Start · expires {when(rider.link_expires_at)}</div>
                            </div>
                          ) : (
                            <span className="badge badge-ghost badge-sm">Not connected</span>
                          )}
                        </td>
                        <td className="text-right whitespace-nowrap">
                          {busyRider === rider.id ? (
                            <span className="loading loading-spinner loading-sm" />
                          ) : rider.linked ? (
                            <>
                              <button className="btn btn-xs btn-ghost" onClick={() => test(rider)}><Send size={12} /> Send test</button>
                              <button className="btn btn-xs btn-ghost text-error" onClick={() => unlink(rider)}><Unlink size={12} /> Disconnect</button>
                            </>
                          ) : (
                            <button className="btn btn-xs btn-primary" onClick={() => issueLink(rider)}>
                              <Copy size={12} /> {rider.link_expires_at ? 'New link' : 'Copy onboarding link'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <a className="text-xs link text-base-content/60 inline-flex items-center gap-1" href={bot.link} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={12} /> Open @{bot.username} in Telegram
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
