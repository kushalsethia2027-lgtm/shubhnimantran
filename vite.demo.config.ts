// Independent static submission build. The main TanStack/Lovable configuration is unchanged.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { plannerEnvironmentGuard } from "./scripts/planner-env";
export default defineConfig({
  root: resolve(import.meta.dirname, "demo-site"),
  base: "./",
  envDir: resolve(import.meta.dirname),
  appType: "mpa",
  plugins: [plannerEnvironmentGuard(), react(), tailwindcss()],
  resolve: { alias: { "@": resolve(import.meta.dirname, "src") } },
  build: {
    outDir: resolve(import.meta.dirname, "dist-demo"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, "demo-site/index.html"),
        demo: resolve(import.meta.dirname, "demo-site/demo/index.html"),
        product: resolve(import.meta.dirname, "demo-site/product/index.html"),
        planner: resolve(import.meta.dirname, "demo-site/planner/index.html"),
      },
    },
  },
});
