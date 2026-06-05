import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
// NOTE: Removed `vite-plugin-singlefile` from plugins to avoid inlining
// JavaScript/CSS into index.html. Chrome extension CSP forbids inline scripts
// in extension pages; emitting external bundle files fixes the CSP error.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // put generated assets in the build root so output is flat
    assetsDir: '.',
    sourcemap: false,
  },
});
