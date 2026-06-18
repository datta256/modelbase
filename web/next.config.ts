import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  generateEtags: true,
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
