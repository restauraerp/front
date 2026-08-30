'use client';

/**
 * Where the walkthrough is reworded.
 *
 * Both languages of a step side by side, in the order the tour plays them,
 * because that is how the copy is actually judged: a Bengali body that says
 * something slightly different from its English twin is invisible in a file
 * and obvious in a pair of boxes. Saving writes the XML under walkthrough/ and
 * recompiles - so the outcome of an afternoon here is a diff to review, not a
 * database somebody has to remember to export.
 *
 * Not part of the restaurant's admin, and deliberately not linked from it. This
 * is a tool for whoever maintains the product, it only exists on a developer's
 * machine, and the route behind it returns 404 in a production build.
 */

import { useCallback, useEffect, useState } from 'react';

type Words = { en: string; bn: string };
type StepEdit = { key: string; title: Words; body: Words };
type MissionEdit = { id: string; title: Words; steps: StepEdit[] };
type Kind = 'demo' | 'trial';

const KINDS: Kind[] = ['demo', 'trial'];
const API = '/walkthrough-studio/api';

const LABEL: Record<Kind, string> = {
  demo: 'Demo - somebody deciding whether this is worth their time',
  trial: 'Trial - somebody setting their own restaurant up',
};

export default function WalkthroughStudio() {
  const [all, setAll] = useState<Record<Kind, MissionEdit[]> | null>(null);
  const [kind, setKind] = useState<Kind>('demo');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);

  // Loaded inside the effect rather than through a callback so the state
  // settling happens in the promise, where it belongs, rather than on the way
  // through the effect body.
  useEffect(() => {
    let cancelled = false;

    void fetch(API, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`The studio API answered ${res.status}.`);

        return res.json();
      })
      .then((body) => {
        if (cancelled) return;

        setAll(body.tours);
        setDirty(false);
        setNote(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        setNote({ tone: 'bad', text: error instanceof Error ? error.message : 'Could not read the copy.' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // A reload with unsaved edits in the boxes is the one way to lose work here,
  // and it is a keystroke away from the reload that picks up a saved change.
  useEffect(() => {
    if (!dirty) return;

    const warn = (event: BeforeUnloadEvent) => event.preventDefault();

    window.addEventListener('beforeunload', warn);

    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const edit = useCallback(
    (missionIndex: number, stepIndex: number | null, field: 'title' | 'body', language: 'en' | 'bn', value: string) => {
      setAll((held) => {
        if (!held) return held;

        const missions = held[kind].map((mission, m) => {
          if (m !== missionIndex) return mission;

          if (stepIndex === null) {
            return { ...mission, title: { ...mission.title, [language]: value } };
          }

          return {
            ...mission,
            steps: mission.steps.map((step, s) =>
              s === stepIndex ? { ...step, [field]: { ...step[field], [language]: value } } : step,
            ),
          };
        });

        return { ...held, [kind]: missions };
      });

      setDirty(true);
    },
    [kind],
  );

  const save = useCallback(async () => {
    if (!all || saving) return;

    setSaving(true);
    setNote(null);

    try {
      const res = await fetch(API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, missions: all[kind] }),
      });

      const body = await res.json();

      if (!res.ok) throw new Error([body.error, body.output].filter(Boolean).join('\n'));

      setDirty(false);
      setNote({ tone: 'good', text: `Written to ${(body.files ?? []).join(' and ')}. ${body.output ?? ''}`.trim() });
    } catch (error) {
      setNote({ tone: 'bad', text: error instanceof Error ? error.message : 'The save failed.' });
    } finally {
      setSaving(false);
    }
  }, [all, kind, saving]);

  const missions = all?.[kind] ?? [];
  const steps = missions.reduce((count, mission) => count + mission.steps.length, 0);

  return (
    <div className="min-h-screen bg-base-200">
      <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-6 py-4">
          <div className="mr-auto">
            <h1 className="text-lg font-semibold">Walkthrough copy</h1>
            <p className="text-sm text-base-content/60">
              walkthrough/{kind}/tour.xml and bn.xml · {missions.length} missions, {steps} steps
            </p>
          </div>

          <div role="tablist" className="tabs tabs-box">
            {KINDS.map((one) => (
              <button
                key={one}
                type="button"
                role="tab"
                className={`tab ${one === kind ? 'tab-active' : ''}`}
                onClick={() => setKind(one)}
              >
                {one}
              </button>
            ))}
          </div>

          <button type="button" className="btn btn-primary" onClick={save} disabled={!dirty || saving}>
            {saving ? 'Saving…' : dirty ? 'Save and compile' : 'Saved'}
          </button>
        </div>

        {note && (
          <div className={`px-6 pb-4 text-sm ${note.tone === 'good' ? 'text-success' : 'text-error'}`}>
            <pre className="whitespace-pre-wrap font-sans">{note.text}</pre>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <p className="mb-8 text-sm text-base-content/70">
          {LABEL[kind]}. Editing here changes the files in the repository - commit them like any other change.
          Which control a step points at, and whether it waits for a click, stays in{' '}
          <code>src/lib/walkthrough/tours.ts</code>.
        </p>

        {all === null && <p className="text-base-content/60">Reading the copy…</p>}

        {missions.map((mission, missionIndex) => (
          <section key={mission.id} className="mb-10">
            <div className="mb-4 flex items-baseline gap-3">
              <h2 className="text-base font-semibold">Mission {missionIndex + 1}</h2>
              <code className="text-xs text-base-content/50">{mission.id}</code>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              <Field
                label="Mission title (English)"
                value={mission.title.en}
                onChange={(value) => edit(missionIndex, null, 'title', 'en', value)}
              />
              <Field
                label="Mission title (Bengali)"
                bengali
                value={mission.title.bn}
                onChange={(value) => edit(missionIndex, null, 'title', 'bn', value)}
              />
            </div>

            {mission.steps.map((step, stepIndex) => (
              <div key={step.key} className="mb-4 rounded-box border border-base-300 bg-base-100 p-4">
                <code className="text-xs text-base-content/50">
                  {mission.id}.{step.key}
                </code>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Title (English)"
                    value={step.title.en}
                    onChange={(value) => edit(missionIndex, stepIndex, 'title', 'en', value)}
                  />
                  <Field
                    label="Title (Bengali)"
                    bengali
                    value={step.title.bn}
                    onChange={(value) => edit(missionIndex, stepIndex, 'title', 'bn', value)}
                  />
                  <Field
                    label="Body (English)"
                    rows={4}
                    value={step.body.en}
                    onChange={(value) => edit(missionIndex, stepIndex, 'body', 'en', value)}
                  />
                  <Field
                    label="Body (Bengali)"
                    bengali
                    rows={4}
                    value={step.body.bn}
                    onChange={(value) => edit(missionIndex, stepIndex, 'body', 'bn', value)}
                  />
                </div>
              </div>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}

/**
 * One box of words.
 *
 * Bengali gets its own font stack and a slightly looser line height - the app
 * already loads Hind Siliguri, and Bengali set in a Latin face is legible but
 * cramped enough that it reads as worse copy than it is.
 */
function Field({
  label,
  value,
  onChange,
  rows,
  bengali = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  bengali?: boolean;
}) {
  const style = bengali ? { fontFamily: 'var(--font-hind-siliguri), sans-serif', lineHeight: 1.9 } : undefined;

  return (
    <label className="form-control w-full">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-base-content/50">{label}</span>

      {rows ? (
        <textarea
          className="textarea textarea-bordered w-full"
          rows={rows}
          style={style}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className="input input-bordered w-full"
          style={style}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}
