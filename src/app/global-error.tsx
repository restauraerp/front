'use client';

/**
 * The last-resort boundary: an error thrown by the root layout itself, which no
 * nested error.tsx can catch. Reports it to Sentry (a no-op when Sentry never
 * initialised) and shows a plain apology, since the app shell is what failed.
 */
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
        <h2>Something went wrong.</h2>
        <p>Please reload the page. If it keeps happening, try again shortly.</p>
      </body>
    </html>
  );
}
