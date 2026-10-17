// Build configuration only. Never import this module into application/browser code.
import { loadEnv, type Plugin } from "vite";
export function assertPublicPlannerKey(value?: string): void {
  if (!value) return;
  let allowed = value.startsWith("sb_publishable_");
  if (!allowed && value.split(".").length === 3) {
    try {
      allowed =
        JSON.parse(Buffer.from(value.split(".")[1]!, "base64url").toString("utf8")).role === "anon";
    } catch {
      allowed = false;
    }
  }
  if (!allowed)
    throw new Error(
      "VITE_SUPABASE_PUBLISHABLE_KEY must be a publishable or legacy anon key. Secret/service-role keys must never enter the frontend build. No key value has been logged.",
    );
}
export function plannerEnvironmentGuard(): Plugin {
  return {
    name: "nimantran-planner-public-key-guard",
    configResolved(config) {
      assertPublicPlannerKey(
        loadEnv(config.mode, config.envDir, "VITE_")["VITE_SUPABASE_PUBLISHABLE_KEY"],
      );
    },
  };
}
