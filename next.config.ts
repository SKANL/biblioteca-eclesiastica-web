import type { NextConfig } from "next";

// Minimal, clean config. The Turbopack CSS rule ships with the Tailwind v4
// template and is required so `*.css` is processed by @tailwindcss/turbopack.
// `cacheComponents` / `partialPrefetching` were removed on purpose: this app is
// fully dynamic (every screen reads the URL and the live API), so there is no
// static shell to prerender and no cache model to adopt.
const nextConfig: NextConfig = {
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
