import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native/parsing modules out of the Turbopack bundler.
  serverExternalPackages: ["better-sqlite3", "pdf-parse", "mammoth"],
};

export default nextConfig;