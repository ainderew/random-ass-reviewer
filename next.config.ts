import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The Docker image ships .next/standalone: the server plus the traced deps.
  output: 'standalone',
  // unpdf loads its pdf.js bundle with a dynamic import the tracer cannot see.
  outputFileTracingIncludes: { '/api/notes': ['./node_modules/unpdf/dist/**'] },
  async headers() {
    return [
      {
        // Optimised GLBs are content-addressed by the asset pipeline; a year is safe.
        source: '/models/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // The worker must never be cached, or an update could not replace it.
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
