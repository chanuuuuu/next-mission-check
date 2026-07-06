import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/search-accommodation",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
