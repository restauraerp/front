'use client';
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { BUSINESS_TIME_KEYS, clearBrandingCache } from '@/hooks/useBranding';
import { Clock, Globe, CalendarDays } from 'lucide-react';

interface StoredSetting {
  id: number;
  key: string;
  value: string;
}

/** A small, region-first set of timezones; the empty value means the deployment default. */
const TIMEZONES = [
  'Asia/Dhaka', 'Asia/Kolkata', 'Asia/Karachi', 'Asia/Kathmandu', 'Asia/Yangon',
  'Asia/Dubai', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Jakarta',
  'Europe/London', 'America/New_York', 'UTC',
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * The timing that reports, tokens and the business day are calculated against.
 *
 * All three live in the same key/value table (names match core-api's
 * BusinessTime). Saving clears the settings cache so the reporting screens and
 * anything else reading these re-read them without a reload. Data is always
 * stored in the deployment timezone; these only change how it is read back.
 */
export default function BusinessDayCard() {
  const [stored, setStored] = useState<StoredSetting[] | null>(null);
  const [timezone, setTimezone] = useState('');
  const [dayStart, setDayStart] = useState('00:00');
  const [weekStart, setWeekStart] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchApi('/website-settings?nopaginate=1')
      .then((res) => {
        const rows: StoredSetting[] = res?.data ?? res ?? [];
        setStored(rows);
        const val = (k: string) => (rows.find((r) => r.key === k)?.value ?? '').trim();
        setTimezone(val(BUSINESS_TIME_KEYS.timezone));
        setDayStart(/^\d{1,2}:\d{2}$/.test(val(BUSINESS_TIME_KEYS.dayStart)) ? val(BUSINESS_TIME_KEYS.dayStart) : '00:00');
        setWeekStart(/^[0-6]$/.test(val(BUSINESS_TIME_KEYS.weekStart)) ? val(BUSINESS_TIME_KEYS.weekStart) : '0');
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load business-day settings.')));
  }, []);

  const persist = async (key: string, value: string) => {
    const existing = (stored ?? []).find((row) => row.key === key);
    const body = JSON.stringify({ key, value, type: 'string' });
    if (existing) {
      await fetchApi(`/website-settings/${existing.id}`, { method: 'PUT', body });
    } else {
      const created = await fetchApi('/website-settings', { method: 'POST', body });
      if (created?.id) setStored((rows) => [...(rows ?? []), created]);
    }
  };

  const save = async () => {
    if (stored === null) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await persist(BUSINESS_TIME_KEYS.timezone, timezone);
      await persist(BUSINESS_TIME_KEYS.dayStart, dayStart);
      await persist(BUSINESS_TIME_KEYS.weekStart, weekStart);
      clearBrandingCache();
      setSaved(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save these settings.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Business Day & Timezone" style={{ marginBottom: '2rem' }}>
      <p className="text-sm text-base-content/60 mb-4">
        When your business day begins and in which timezone. Reports, tokens and the daily figures are
        calculated against these. Your data is always stored the same way — this only changes how it is read back.
      </p>

      {error && (
        <div className="alert alert-error py-2 mb-4"><span className="text-sm">{error}</span></div>
      )}

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 text-xs text-base-content/60 mb-1">
            <Globe size={14} /> Timezone
          </label>
          <select
            className="select select-bordered w-full"
            value={timezone}
            onChange={(e) => { setTimezone(e.target.value); setSaved(false); }}
          >
            <option value="">Default (Asia/Dhaka)</option>
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 text-xs text-base-content/60 mb-1">
            <Clock size={14} /> Business day starts at
          </label>
          <input
            type="time"
            className="input input-bordered w-full"
            value={dayStart}
            onChange={(e) => { setDayStart(e.target.value || '00:00'); setSaved(false); }}
          />
          <p className="text-xs text-base-content/50 mt-1">
            e.g. set 04:00 if late-night orders should count toward the day that just ended.
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-xs text-base-content/60 mb-1">
            <CalendarDays size={14} /> Week starts on
          </label>
          <select
            className="select select-bordered w-full"
            value={weekStart}
            onChange={(e) => { setWeekStart(e.target.value); setSaved(false); }}
          >
            {WEEKDAYS.map((d, i) => <option key={i} value={String(i)}>{d}</option>)}
          </select>
        </div>

        {saved && (
          <div className="alert alert-success py-2"><span className="text-sm">Saved.</span></div>
        )}

        <button className="btn btn-primary gap-2" onClick={save} disabled={stored === null || saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Card>
  );
}
