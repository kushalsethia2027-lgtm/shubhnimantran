// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";
import { plannerEnvironmentGuard } from "./scripts/planner-env";

export default defineConfig({
  vite: {
    plugins: [
      plannerEnvironmentGuard(),
      {
        name: "nimantran-server-environment",
        configResolved(config) {
          if (config.command !== "serve") return;
          // Vite normally exposes only VITE_* to application code. Load explicitly
          // allowed server variables into the Node process, never into define/client env.
          const values = loadEnv(config.mode, config.envDir, "");
          for (const key of [
            "APP_ORIGIN",
            "SUPABASE_URL",
            "SUPABASE_ANON_KEY",
            "SUPABASE_SERVICE_ROLE_KEY",
            "SUPPORT_EMAIL",
            "ANTHROPIC_API_KEY",
            "ANTHROPIC_MODEL",
            "ELEVENLABS_API_KEY",
            "SHOTSTACK_API_KEY",
            "SHOTSTACK_ENV",
            "TWILIO_ACCOUNT_SID",
            "TWILIO_AUTH_TOKEN",
            "TWILIO_WHATSAPP_FROM",
            "TWILIO_CONTENT_SID",
          ]) {
            if (process.env[key] === undefined && values[key] !== undefined)
              process.env[key] = values[key];
          }
        },
      },
    ],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
