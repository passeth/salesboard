import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-cdb650c7bfa1416a8f0e200aea466576.r2.dev",
      },
    ],
  },
};

export default nextConfig;
