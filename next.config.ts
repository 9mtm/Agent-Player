import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow GLB files and external 3D assets to load
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'models.readyplayer.me' },
      { protocol: 'https', hostname: 'readyplayerme-assets.s3.amazonaws.com' },
    ],
  },
};

export default nextConfig;

