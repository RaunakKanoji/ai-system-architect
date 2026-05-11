import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "img.clerk.com",
        pathname: "/**",
        protocol: "https",
      },
    ],
  },
};

export default nextConfig;
