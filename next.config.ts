import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "ioredis"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "maps.googleapis.com" },
      { protocol: "https", hostname: "places.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "s3-media*.yelp.com" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "**.seriouseats.com" },
      { protocol: "https", hostname: "**.therecipecritic.com" },
      { protocol: "https", hostname: "**.bonappetit.com" },
      { protocol: "https", hostname: "**.foodandwine.com" },
      { protocol: "https", hostname: "**.simplyrecipes.com" },
      { protocol: "https", hostname: "**.eatingthaifood.com" },
      { protocol: "https", hostname: "**.justonecookbook.com" },
      { protocol: "https", hostname: "**.maangchi.com" },
      { protocol: "https", hostname: "**.wp.com" },
      // Removed wildcard { hostname: "**" } — was an open proxy security risk
    ],
  },
};

export default nextConfig;
