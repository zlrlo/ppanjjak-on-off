import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  output: isGitHubPages ? "export" : undefined,
  basePath: isGitHubPages ? "/ppanjjak-on-off" : undefined,
  trailingSlash: isGitHubPages,
  experimental: { optimizePackageImports: ["lucide-react"] },
};

export default nextConfig;
