import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbo: {
    // Disable Turbopack to use Webpack instead
  },
  webpack: (config) => {
    // Use webpack instead of Turbopack
    return config;
  },
};

export default nextConfig;
