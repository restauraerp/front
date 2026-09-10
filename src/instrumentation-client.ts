/**
 * Browser-side Sentry.
 *
 * DSN-gated like the server config: no NEXT_PUBLIC_SENTRY_DSN, no init, no
 * events. Next runs this before hydration, so an error during the first render
 * is still caught.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    sendDefaultPii: true,
  });
}

// Ties a client-side navigation to its trace, so a slow route change is measured.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
