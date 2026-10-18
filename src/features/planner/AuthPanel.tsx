import { GoogleSignIn } from "../auth/GoogleSignIn";
export function AuthPanel() {
  return (
    <section className="workspace-card mx-auto max-w-lg space-y-5">
      <h1 className="text-3xl text-maroon">Your family. One shared plan.</h1>
      <p className="text-sm text-muted-foreground">
        Continue with your Google account to create a private wedding workspace or join your
        family’s plan. No email codes or separate password.
      </p>
      <GoogleSignIn destination="/planner/" />
      <p className="text-xs text-muted-foreground">
        Invited planners must choose the Google account with the exact email the owner invited.
        Bride-side and groom-side permissions still apply.
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
          Add this site’s <code>/auth/</code> URL to Supabase Auth’s allowed redirect URLs. Enable
          the Google provider in Supabase and configure the Google OAuth client.
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
