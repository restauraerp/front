/**
 * Server- and edge-side Sentry, plus the App Router's server-error hook.
 *
 * DSN-gated: with no NEXT_PUBLIC_SENTRY_DSN nothing initialises and nothing is
 * sent, so local and any un-configured environment stay silent. register() runs
 * once per runtime (Node and Edge both), and Sentry.init works in either, so one
 * file covers both rather than two near-identical configs.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export async function register(): Promise<void> {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    // A tenth of requests traced for slow-endpoint visibility.
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // Attach the user, their IP and request data - richer debugging at the cost
    // of sending personal data, a deliberate choice made for this project.
    sendDefaultPii: true,
  });
}

// Reports errors thrown inside the App Router's server components and handlers.
export const onRequestError = Sentry.captureRequestError;
