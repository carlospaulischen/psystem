import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents/partialPrefetching desligados: o app é inteiramente
  // autenticado e dinâmico (cookies/JWT por request). O modelo novo exige
  // connection()/Suspense em cada página sem ganho real para este MVP.
  // Reavaliar quando houver páginas públicas (marketing/portal).
  experimental: {
    agentUpgrade: "security",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
