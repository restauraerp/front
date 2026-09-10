/**
 * The server side of /sentry-test: a route that always throws.
 *
 * Hit by the "Trigger a server error" button. The unhandled throw returns a 500
 * and is picked up by the App Router's onRequestError hook (see
 * src/instrumentation.ts), which is the path a real server-side failure takes.
 */
export const dynamic = 'force-dynamic';

export function GET(): Response {
  throw new Error('Sentry test: deliberate server error from /sentry-test/server-error');
}
