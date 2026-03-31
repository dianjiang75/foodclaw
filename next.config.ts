import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "ioredis"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
