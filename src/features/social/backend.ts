import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Scene, Booking, Review } from "./domain";
let client: SupabaseClient | undefined;
export const configured = () =>
  Boolean(import.meta.env["VITE_SUPABASE_URL"] && import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]);
export function db() {
  if (!configured())
    throw Error(
      "Account features need Supabase configuration. You can explore the labelled event previews without signing in.",
    );
  client ??= createClient(
    import.meta.env["VITE_SUPABASE_URL"],
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
    {
      auth: {
        flowType: "pkce",
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
        storageKey: "nimantran-social-auth",
      },
    },
  );
  return client;
}
export async function rpc<T>(name: string, args: Record<string, unknown> = {}) {
  const { data, error } = await db().rpc(name, args);
  if (error) throw error;
  return data as T;
}
export const events = () => rpc<Scene[]>("social_events");
export const bookings = () => rpc<Booking[]>("social_my_bookings");
export const guests = (id: string) => rpc<Booking[]>("social_event_guests", { p_event: id });
export const reviews = (id: string) => rpc<Review[]>("social_event_reviews", { p_event: id });
export async function google() {
  const referral = new URLSearchParams(location.search).get("ref");
  if (referral && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(referral))
    sessionStorage.setItem("nimantran-referrer", referral);
  const { error } = await db().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: location.origin + "/auth/" },
  });
  if (error) throw error;
}
export function errorText(e: unknown) {
  const x = e as { code?: string; message?: string };
  if (x.code === "PGRST202" || x.code === "42P01")
    return "The new events database is not installed yet. Apply migration 202610290005_social_events.sql to the existing Supabase project, then refresh.";
  return x.message ?? "That request did not complete. Please try again.";
}
