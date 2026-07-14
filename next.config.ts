import type { NextConfig } from "next";
import packageJson from "./package.json";

// Inside Docker this points at the core-api container (e.g. http://core-api:8000).
// Outside Docker it falls back to the host-mapped port used for local dev.
const apiInternalUrl = process.env.API_INTERNAL_URL || "http://127.0.0.1:8029";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
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

export default nextConfig;
