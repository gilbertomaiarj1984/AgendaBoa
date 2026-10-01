import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

// Versão exibida no rodapé: vem do package.json (única fonte). O commit entra pelo build-arg GIT_SHA
// (GitHub Actions) e a data é a do próprio build.
const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { version: string };

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_GIT_SHA: (process.env.GIT_SHA || "local").slice(0, 7),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  // A foto chega comprimida (até ~700 KB) como parte da ação do servidor.
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
