import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveServiceUrl } from "./auth-config";
import type { Scene, Booking, Review } from "./domain";
let client: SupabaseClient | undefined;
export const configured = () => Boolean(import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]);
export function db() {
  if (!configured())
    throw Error(
      "Sign-in is temporarily unavailable. The site owner needs to configure the public Supabase key.",
    );
  if (typeof window !== "undefined" && !client) {
    try {
      for (const key of ["nimantran-social-auth", "nimantran-social-auth-code-verifier"]) {
        const old = sessionStorage.getItem(key);
        if (old && !localStorage.getItem(key)) {
          localStorage.setItem(key, old);
          sessionStorage.removeItem(key);
        }
      }
    } catch {
      throw Error("Please allow site storage in this browser to sign in with Google.");
    }
  }
  client ??= createClient(
    resolveServiceUrl(import.meta.env["VITE_SUPABASE_URL"]),
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
    {
      auth: {
        flowType: "pkce",
        persistSession: true,
        detectSessionInUrl: false,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
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
export async function google(destination = "profile") {
  try {
    sessionStorage.setItem(
      "nimantran-auth-return",
      ["host", "explore", "tickets", "saved", "profile"].includes(destination)
        ? destination
        : "profile",
    );
    const referral = new URLSearchParams(location.search).get("ref");
    if (
      referral &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(referral)
    )
      sessionStorage.setItem("nimantran-referrer", referral);
  } catch {
    /* Optional navigation state must not block auth. */
  }
  const { data, error } = await db().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: location.origin + "/auth/",
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
  if (!data.url) throw Error("Google sign-in did not return a sign-in link. Please try again.");
  location.assign(data.url);
}
let callback: Promise<void> | undefined;
export function completeGoogle() {
  callback ??= (async () => {
    const query = new URLSearchParams(location.search),
      hash = new URLSearchParams(location.hash.slice(1));
    try {
      if (query.has("error") || hash.has("error"))
        throw Error(
          query.get("error_description") ??
            hash.get("error_description") ??
            "Google sign-in was cancelled. Please try again.",
        );
      const code = query.get("code");
      if (code) {
        const { error } = await db().auth.exchangeCodeForSession(code);
        if (error) throw error;
      }
      const { data, error } = await db().auth.getUser();
      if (error || !data.user)
        throw (
          error ??
          Error("No sign-in session was received. Please start again from Continue with Google.")
        );
    } finally {
      history.replaceState(null, "", "/auth/");
    }
  })();
  return callback;
}
export function errorText(e: unknown) {
  const x = e as { code?: string; message?: string };
  if (x.code === "PGRST202" || x.code === "42P01")
    return "The new events database is not installed yet. Apply migration 202610290005_social_events.sql to the existing Supabase project, then refresh.";
  return x.message ?? "That request did not complete. Please try again.";
}
