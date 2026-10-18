import { useEffect, useRef, useState } from "react";
import { configurationProblem, plannerClient, readableError } from "../planner/backend";
import { takeDestination } from "./client";
import { api } from "../workspace/client";
export function GoogleCallback() {
  const [error, setError] = useState("");
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.slice(1));
        if (params.has("error") || hash.has("error"))
          throw new Error(
            "Google sign-in was cancelled or could not be completed. Return to the planner and try again.",
          );
        const problem = configurationProblem();
        if (problem) throw new Error(problem);
        const client = plannerClient();
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        if (!data.session)
          throw new Error(
            "No sign-in session was received. Start again from the Google sign-in button in the same browser tab.",
          );
        const { error: verificationError } = await client.auth.getUser();
        if (verificationError) throw verificationError;
        const destination = takeDestination();
        if (destination === "/app") {
          const result = await api<{ session: { access_token: string; refresh_token: string } }>(
            "/auth/google-session",
            "POST",
            { refresh_token: data.session.refresh_token },
          );
          const { error } = await client.auth.setSession(result.session);
          if (error) throw error;
        }
        window.history.replaceState(null, "", "/auth/");
        window.location.replace(destination);
      } catch (e) {
        window.history.replaceState(null, "", "/auth/");
        setError(readableError(e));
      }
    })();
  }, []);
  return (
    <main className="workspace min-h-screen px-4 py-16">
      <section className="workspace-card mx-auto max-w-lg space-y-5">
        <h1 className="text-3xl text-maroon">Welcome to Nimantran</h1>
        {error ? (
          <>
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <a className="workspace-primary" href="/planner/">
              Return to sign-in
            </a>
            <a className="workspace-secondary" href="/demo/">
              Open invitation demo
            </a>
          </>
        ) : (
          <p role="status">Completing your secure Google sign-in…</p>
        )}
      </section>
    </main>
  );
}
