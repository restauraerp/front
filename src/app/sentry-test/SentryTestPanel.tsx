'use client';

/**
 * The buttons behind /sentry-test. See page.tsx for what the page is for.
 *
 * Client component because the errors have to happen in the browser (and one
 * round-trips to the server route). Each button is deliberate: nothing throws
 * until pressed.
 */
import * as Sentry from '@sentry/nextjs';
import { useState } from 'react';

export function SentryTestPanel({ enabled }: { enabled: boolean }) {
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const captureHandled = () => {
    const id = Sentry.captureException(
      new Error('Sentry test: handled error from /sentry-test'),
    );
    setNote(`Sent a handled error. Event id: ${id}`);
  };

  const throwClient = () => {
    // Uncaught on purpose: this is the path a real client crash takes, and the
    // one the global handler Sentry installs is there to catch.
    throw new Error('Sentry test: uncaught client error from /sentry-test');
  };

  const triggerServer = async () => {
    setPending(true);
    setNote(null);
    try {
      const res = await fetch('/sentry-test/server-error');
      setNote(
        `Server route answered ${res.status} (a 500 is expected). ` +
          'Look for the server-side event in Sentry.',
      );
    } catch {
      setNote('Could not reach the server route.');
    } finally {
      setPending(false);
    }
  };

  const button: React.CSSProperties = {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '0.75rem 1rem',
    marginBottom: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid #d4d4d8',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '0.95rem',
  };

  return (
    <main
      style={{
        maxWidth: 560,
        margin: '3rem auto',
        padding: '0 1.5rem',
        fontFamily: 'system-ui, sans-serif',
        color: '#18181b',
      }}
    >
      <h1 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>Sentry test</h1>
      <p style={{ color: '#52525b', marginTop: 0 }}>
        Trigger an error and confirm it reaches Sentry &rarr; Issues. Safe to
        leave in place: nothing fires until you press a button.
      </p>

      <div
        style={{
          padding: '0.6rem 0.9rem',
          borderRadius: '0.5rem',
          marginBottom: '1.5rem',
          fontWeight: 600,
          background: enabled ? '#dcfce7' : '#fef9c3',
          color: enabled ? '#166534' : '#854d0e',
        }}
      >
        {enabled
          ? 'Sentry is ON for this build — events will be sent.'
          : 'Sentry is OFF for this build — no DSN was set at build time, so nothing will be sent. Set NEXT_PUBLIC_SENTRY_DSN and redeploy.'}
      </div>

      <button type="button" style={button} onClick={captureHandled}>
        <strong>Capture a handled error</strong>
        <br />
        <span style={{ color: '#52525b', fontSize: '0.85rem' }}>
          Sentry.captureException — surest signal, shows the event id here.
        </span>
      </button>

      <button type="button" style={button} onClick={throwClient}>
        <strong>Throw a client error</strong>
        <br />
        <span style={{ color: '#52525b', fontSize: '0.85rem' }}>
          An uncaught browser error — the path a real crash takes.
        </span>
      </button>

      <button type="button" style={button} onClick={triggerServer} disabled={pending}>
        <strong>Trigger a server error</strong>
        <br />
        <span style={{ color: '#52525b', fontSize: '0.85rem' }}>
          A 500 from a route handler — the server-side path.
        </span>
      </button>

      {note && (
        <p
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            background: '#f4f4f5',
            fontSize: '0.9rem',
            wordBreak: 'break-word',
          }}
        >
          {note}
        </p>
      )}
    </main>
  );
}
