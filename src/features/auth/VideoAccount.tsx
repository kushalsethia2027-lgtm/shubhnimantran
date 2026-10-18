import { useEffect, useState } from "react";
import { configurationProblem, plannerClient, readableError } from "../planner/backend";
import { GoogleSignIn } from "./GoogleSignIn";
export function VideoAccount({ hasRecordings = false }: { hasRecordings?: boolean }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (configurationProblem()) return;
    let active = true;
    const client = plannerClient();
    void client.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? "");
    });
    const { data } = client.auth.onAuthStateChange((_event, session) =>
      setEmail(session?.user.email ?? ""),
    );
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return (
    <section className="workspace-card mb-5 space-y-3" aria-label="Invitation account">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl text-maroon">
            {email ? "Welcome, " + email : "Your invitations. Your Google account."}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {email
              ? "Use the same account in Guest & Travel Planner."
              : "Sign in once for your account and shared guest planning. You can also keep creating without sign-in."}{" "}
            Recordings still stay in this browser tab until downloaded.
          </p>
        </div>
        {email ? (
          <button
            className="workspace-secondary"
            onClick={async () => {
              const { error } = await plannerClient().auth.signOut({ scope: "local" });
              if (error) setError(readableError(error));
            }}
          >
            Sign out
          </button>
        ) : (
          <GoogleSignIn destination="/demo/" confirmLeave={hasRecordings} />
        )}
      </div>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
