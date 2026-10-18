import { plannerClient } from "../planner/backend";
import { api } from "../workspace/client";
export const pendingInviteKey = "nimantran-pending-planner-invite";
const destinationKey = "nimantran-google-destination";
export function safeDestination(value: string | null): "/planner/" | "/demo/" | "/app" {
  return value === "/demo/" || value === "/app" ? value : "/planner/";
}
export async function startGoogle(destination: string) {
  sessionStorage.setItem(destinationKey, safeDestination(destination));
  const client = plannerClient();
  const { data } = await client.auth.getSession();
  if (data.session?.user.app_metadata.providers?.includes("google")) {
    const { error } = await client.auth.getUser();
    if (!error) {
      if (safeDestination(destination) === "/app") {
        const result = await api<{ session: { access_token: string; refresh_token: string } }>(
          "/auth/google-session",
          "POST",
          { refresh_token: data.session.refresh_token },
        );
        const { error } = await client.auth.setSession(result.session);
        if (error) throw error;
      }
      window.location.assign(safeDestination(destination));
      return;
    }
  }

  const { error } = await plannerClient().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/auth/",
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
}
export function takeDestination() {
  const destination = safeDestination(sessionStorage.getItem(destinationKey));
  sessionStorage.removeItem(destinationKey);
  return destination;
}
