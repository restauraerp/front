import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:8029/api/v1/:path*',
      },
      {
        source: '/storage/:path*',
        destination: 'http://127.0.0.1:8029/storage/:path*',
      },
    ];
  },
};

export default nextConfig;
