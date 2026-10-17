// Independent static submission build. The main TanStack/Lovable configuration is unchanged.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
export default defineConfig({
  root: resolve(import.meta.dirname, "demo-site"),
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": resolve(import.meta.dirname, "src") } },
  build: { outDir: resolve(import.meta.dirname, "dist-demo"), emptyOutDir: true },
});
