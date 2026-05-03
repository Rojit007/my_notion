import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Phaser uses browser globals — don't attempt to bundle it server-side
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals = [...(config.externals ?? []), 'phaser'];
    }
    return config;
  },
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
