import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Phaser uses browser globals — exclude from server bundling (Next.js 16 / Turbopack)
  serverExternalPackages: ['phaser'],
  // Silence the Turbopack + empty webpack config warning
  turbopack: {},
  // Allow serving uploaded assets from /public/uploads
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
