import type { NextConfig } from "next";
import { R2_PREFIX } from "./src/lib/r2";


function r2RemotePatterns(): NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> {
  const origin = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim();
  if (!origin) return [];

  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    // A malformed value should not take the whole build down. Images stay
    // unoptimised, and the misconfiguration is already reported where it
    // matters — the upload controls, which check the same variable.
    console.warn(
      `next.config.ts: NEXT_PUBLIC_R2_PUBLIC_URL is not a valid URL (${origin}); ` +
        "remote images will not be optimised.",
    );
    return [];
  }

  const basePath = url.pathname.replace(/\/+$/, "");

  return [
    {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      // Narrowed to this app's own prefix rather than the whole host: a bucket
      // may be shared, and a bare `/**` would turn the optimiser into an open
      // proxy for every object in it.
      pathname: `${basePath}/${R2_PREFIX}/**`,
      // No image URL this app builds carries a query string, so allowing one
      // would only widen what the optimiser accepts.
      search: "",
    },
  ];
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: r2RemotePatterns(),
  },

  async redirects() {
    return [
      // Both people screens moved under /admin; keep old links working.
      { source: "/team", destination: "/admin/users", permanent: true },
      { source: "/teams", destination: "/admin/teams", permanent: true },
    ];
  },
};

export default nextConfig;
