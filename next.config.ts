import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Notifications moved from a Settings sub-page to its own top-level
      // sidebar item — keeps old bookmarks/links working.
      { source: "/settings/notifications", destination: "/notifications", permanent: true },
    ];
  },
};

export default nextConfig;
