import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

const proxyTarget = process.env.VITE_API_PROXY ?? "http://127.0.0.1:8080";
const base = process.env.VITE_BASE || "/";

// GitHub Pages has no SPA fallback. A copy of index.html named 404.html keeps
// /lessons and /glossary on refresh. .nojekyll stops Pages from treating the
// build as a Jekyll site.
function pagesFallback(): Plugin {
  let root = process.cwd();
  let outDir = "dist";
  return {
    name: "pages-fallback",
    apply: "build",
    configResolved(config) {
      root = config.root;
      outDir = config.build.outDir;
    },
    closeBundle() {
      if (!base || base === "/" || base === "./") return;
      const dir = path.resolve(root, outDir);
      const index = path.join(dir, "index.html");
      if (!fs.existsSync(index)) return;
      fs.copyFileSync(index, path.join(dir, "404.html"));
      fs.writeFileSync(path.join(dir, ".nojekyll"), "");
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), pagesFallback()],
  server: {
    proxy: {
      "/api": { target: proxyTarget, changeOrigin: true },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
