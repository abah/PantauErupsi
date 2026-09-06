import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["cheerio"],
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;

// Enable Cloudflare bindings during `next dev` when available
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
