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
    integrations: [
      // Keeps out errors thrown by code that is not ours - browser extensions
      // and Google Tag Manager container tags inject scripts into the page, and
      // their unhandled rejections surface through our global handler attributed
      // to whatever route was open (that is what RESTAURAERP-FRONT-3 was: a
      // `Cannot read properties of undefined (reading 'M_ID')` from an injected
      // `executors/200.js` that exists nowhere in this codebase). The filter
      // uses the module tags the Sentry bundler plugin stamps onto our own code
      // via `applicationKey` in next.config.ts. Only errors whose stack is
      // *entirely* third-party are dropped, so anything that touches our code
      // still reports.
      Sentry.thirdPartyErrorFilterIntegration({
        filterKeys: ['restauraerp-front'],
        behaviour: 'drop-error-if-exclusively-contains-third-party-frames',
      }),
    ],
    // Common, un-actionable browser/extension noise. These originate outside
    // our code and tell us nothing about the app.
    ignoreErrors: [
      // Benign ResizeObserver notice browsers emit; never a real fault.
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Injected/blocked third-party scripts (analytics, extensions) that fail
      // to load report as a bare, frame-less "Script error."
      'Script error.',
    ],
  });
}

// Ties a client-side navigation to its trace, so a slow route change is measured.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
