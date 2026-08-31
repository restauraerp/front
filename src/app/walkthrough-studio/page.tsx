/**
 * The door to the studio, and the lock on it.
 *
 * A server component whose only job is to refuse production, so the studio is
 * genuinely absent there rather than merely unreachable. The sidebar link and
 * the API route both already say they behave this way; the page itself did not,
 * and answered 200 to anybody who typed the path - rendering a screen that then
 * failed to load its copy, which reads as a broken page rather than a closed
 * door.
 *
 * The editor lives in Studio.tsx because that half is a client component, and a
 * client component cannot be the thing that calls notFound().
 */

import { notFound } from 'next/navigation';

import Studio from './Studio';

// Never prerendered into the production build: the answer depends on the
// environment the server is running in, which is the whole point.
export const dynamic = 'force-dynamic';

export default function WalkthroughStudioPage() {
  // Matches app/walkthrough-studio/api/route.ts, deliberately word for word.
  // 404 rather than 403: in production this route is simply not part of the app.
  if (process.env.NODE_ENV === 'production') notFound();

  return <Studio />;
}
