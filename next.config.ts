import type { NextConfig } from "next";

const isMobileBuild = process.env.NEXT_BUILD_TARGET === "mobile";

const nextConfig: NextConfig = {
  output: isMobileBuild ? "export" : undefined,
  images: {
    unoptimized: isMobileBuild,
  },
};

export default nextConfig;
