import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enforce strict mode for React — catches side effects early
  reactStrictMode: true,

  // Never expose raw S3 URLs or internal keys to the client
  serverExternalPackages: ['@prisma/client'],

  // Content Security Policy — prevent document exfiltration
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
