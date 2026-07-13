import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/family-game-platform',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: "/workspace/family-game-platform",
  },
};

export default nextConfig;