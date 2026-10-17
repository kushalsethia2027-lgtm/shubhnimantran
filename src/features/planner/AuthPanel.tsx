import { useState } from "react";
import { plannerClient, readableError } from "./backend";
export function AuthPanel({
  recovery = false,
  onRecovered = () => {},
}: {
  recovery?: boolean;
  onRecovered?: () => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <section className="workspace-card workspace-form mx-auto max-w-lg space-y-5">
      <h1 className="text-3xl text-maroon">
        {recovery ? "Set a new password" : "Your family. One shared plan."}
      </h1>
      <p className="text-sm text-muted-foreground">
        Guest & Travel Planner uses private Supabase accounts. Each planner signs in with their own
        email. Your invitation creator remains available without sign-in.
      </p>
      {!recovery && (
        <div className="flex flex-wrap gap-2">
          {(["signin", "signup", "reset"] as const).map((value) => (
            <button
              key={value}
              className="workspace-secondary"
              aria-pressed={mode === value}
              disabled={busy}
              onClick={() => {
                setMode(value);
                setMessage("");
                setError("");
              }}
            >
              {value === "signin"
                ? "Sign in"
                : value === "signup"
                  ? "Create account"
                  : "Forgot password"}
            </button>
          ))}
        </div>
      )}
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          setMessage("");
          const f = new FormData(event.currentTarget);
          const email = String(f.get("email") ?? "").trim();
          const password = String(f.get("password") ?? "");
          const auth = plannerClient().auth;
          const redirect = window.location.origin + "/planner/";
          try {
            if (recovery) {
              const { error } = await auth.updateUser({ password });
              if (error) throw error;
              onRecovered();
              setMessage("Password updated.");
            } else if (mode === "signin") {
              const { error } = await auth.signInWithPassword({ email, password });
              if (error) throw error;
            } else if (mode === "signup") {
              const { data, error } = await auth.signUp({
                email,
                password,
                options: { emailRedirectTo: redirect },
              });
              if (error) throw error;
              setMessage(
                data.session
                  ? "Account created."
                  : "Check your email to confirm your account, then return here and sign in. If you already have an account, use Sign in. Reopen your planner invitation after confirmation.",
              );
            } else {
              const { error } = await auth.resetPasswordForEmail(email, { redirectTo: redirect });
              if (error) throw error;
              setMessage(
                "If the account exists and email delivery is available, a reset link will arrive. Open it in this browser.",
              );
            }
          } catch (e) {
            setError(readableError(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {!recovery && (
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required maxLength={254} />
          </label>
        )}
        {(recovery || mode !== "reset") && (
          <label>
            {recovery ? "New password" : "Password"}
            <input
              name="password"
              type="password"
              autoComplete={recovery || mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={8}
              maxLength={128}
            />
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="workspace-note">
            {message}
          </p>
        )}
        <button className="workspace-primary w-full" disabled={busy}>
          {busy
            ? "Contacting sign-in service…"
            : recovery
              ? "Update password"
              : mode === "signin"
                ? "Sign in securely"
                : mode === "signup"
                  ? "Create my account"
                  : "Email password reset link"}
        </button>
      </form>
      <p className="text-xs text-muted-foreground">
        An owner shares a private invitation link with the other planner. Sign in using the invited,
        verified email, then accept the link. No shared passwords or public guest links.
      </p>
    </section>
  );
}
export function PlannerConfiguration({ problem }: { problem: string }) {
  return (
    <section className="workspace-card mx-auto max-w-2xl space-y-5">
      <h1 className="text-3xl text-maroon">Connect Guest & Travel Planner</h1>
      <p role="status" className="workspace-note">
        Shared planning is not connected. No guest records have been saved or synced.
      </p>
      <p className="text-sm">{problem}</p>
      <ol className="list-decimal space-y-3 pl-5 text-sm leading-6">
        <li>
          Use the existing Supabase project. Apply only unapplied migrations, including{" "}
          <code>202610170004_guest_travel_planner.sql</code>. It requires the original migrations
          001–003.
        </li>
        <li>
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in your
          deployment settings. Use the publishable or legacy anon key. Never use a service-role key
          here.
        </li>
        <li>
          Add this site’s <code>/planner/</code> URL to Supabase Auth’s allowed redirect URLs.
          Enable email sign-up and confirmation.
        </li>
        <li>
          Rebuild the website, create your account and a workspace, then invite the bride/groom
          planner from Settings.
        </li>
      </ol>
      <a
        className="workspace-secondary"
        href="https://github.com/kushalsethia2027-lgtm/shubhnimantran/blob/nimantran-mvp/docs/GUEST-TRAVEL-PLANNER.md"
      >
        Read the setup and access guide
      </a>
      <p className="text-xs text-muted-foreground">
        The invitation studio still works without this connection.
      </p>
    </section>
  );
}
