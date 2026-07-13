import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/family-game-platform',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;