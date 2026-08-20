import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  
  async redirects() {
    return [
      // Both people screens moved under /admin; keep old links working.
      { source: "/team", destination: "/admin/users", permanent: true },
      { source: "/teams", destination: "/admin/teams", permanent: true },
    ];
  },
};

export default nextConfig;
