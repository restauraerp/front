import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import packageJson from "./package.json";

// Inside Docker this points at the core-api container (e.g. http://core-api:8000).
// Outside Docker it falls back to the host-mapped port used for local dev.
const apiInternalUrl = process.env.API_INTERNAL_URL || "http://127.0.0.1:8029";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  // Dev only, and ignored entirely in a production build. Next blocks requests
  // for its dev resources (/_next/webpack-hmr and friends) from any origin
  // other than the one it was opened on, and a blocked HMR request leaves the
  // page loaded but never hydrated - React starts, effects never run, and
  // nothing in the console says why.
  //
  // 127.0.0.1 is the same server as localhost but a separate origin, with its
  // own cookie jar - which makes it the way to exercise a second, independent
  // browser identity against the same dev server.
  allowedDevOrigins: ['127.0.0.1'],
  // /admin/reporting has no page of its own - it lands on the Sales tab. Doing
  // this as an HTTP redirect rather than a redirect() inside a page component
  // avoids rendering (and erroring out of) a throwaway Server Component.
  async redirects() {
    return [
      {
        source: '/admin/reporting',
        destination: '/admin/reporting/sales',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiInternalUrl}/api/v1/:path*`,
      },
      {
        source: '/storage/:path*',
        destination: `${apiInternalUrl}/storage/:path*`,
      },
    ];
  },
};

// Wrap with Sentry: it instruments the build and, when SENTRY_AUTH_TOKEN (plus
// org/project) is present at build time, uploads source maps so a minified stack
// trace reads like the real one. Absent those, the build is unchanged - runtime
// reporting is gated separately on NEXT_PUBLIC_SENTRY_DSN.
//
// Dev is deliberately left unwrapped. The Sentry plugin instruments every
// Turbopack compile, which is pure overhead for a local dev server that never
// uploads source maps - it only adds CPU to each rebuild. Source maps matter
// for the production build (npm run build), where this wrapper still applies.
const isProdBuild = process.env.NODE_ENV === 'production';

export default isProdBuild
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Quiet unless something is actually wrong, and keep the Sentry logger out
      // of the shipped client bundle.
      silent: !process.env.CI,
      disableLogger: true,
    })
  : nextConfig;

