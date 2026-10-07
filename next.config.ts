import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
