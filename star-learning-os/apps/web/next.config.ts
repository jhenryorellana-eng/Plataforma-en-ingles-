import type { NextConfig } from 'next';

const apiInternalUrl = (
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4000'
).replace(/\/$/, '');
const publicApiUrl = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const isProduction = process.env.NODE_ENV === 'production';
const connectSources = ["'self'", 'https://api.openai.com'];
if (publicApiUrl) {
  try {
    connectSources.push(new URL(publicApiUrl).origin);
  } catch {
    throw new Error('NEXT_PUBLIC_API_URL debe ser una URL válida');
  }
}
if (!isProduction) connectSources.push('ws:', 'wss:');

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src ${[...new Set(connectSources)].join(' ')}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ');

if (process.env.VERCEL && !process.env.API_INTERNAL_URL) {
  throw new Error('API_INTERNAL_URL es obligatoria en despliegues de Vercel');
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), payment=(), microphone=(self)' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          ...(isProduction
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
            : []),
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/v1/:path*',
        destination: `${apiInternalUrl}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
