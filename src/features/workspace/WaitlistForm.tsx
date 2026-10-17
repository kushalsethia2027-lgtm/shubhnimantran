import { useState } from "react";
import { api } from "./client";
export function WaitlistForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ eligible: boolean } | null>(null);
  if (result)
    return (
      <div className="card-ornate mt-8 p-8" role="status">
        <h3 className="text-2xl text-maroon">Dhanyavaad! Your details are saved.</h3>
        <p className="mt-3 text-sm text-ink">
          {result.eligible
            ? "You qualify for the founding-family 30% discount at launch. No payment is due."
            : "You are on the waitlist. The first 100 founding-family places have been allocated."}
        </p>
        <a href="/app" className="mt-5 inline-block text-maroon underline">
          Create your wedding account
        </a>
      </div>
    );
  return (
    <form
      className="card-ornate workspace-form mt-8 space-y-4 p-6 text-left text-ink"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        setBusy(true);
        setError("");
        try {
          setResult(await api("/waitlist", "POST", data));
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Your name
        <input name="name" required maxLength={100} autoComplete="name" />
      </label>
      <label>
        WhatsApp number
        <input name="phone" type="tel" required autoComplete="tel" placeholder="+91 98765 43210" />
      </label>
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Wedding month
        <input name="date" type="month" required />
      </label>
      <label>
        Expected guests
        <input name="guest_count" type="number" min={1} max={400} required />
      </label>
      <label>
        Family language
        <select name="language">
          <option>Hindi</option>
          <option>Hinglish</option>
        </select>
      </label>
      <label>
        Person filling the form
        <select name="role">
          <option>Bride</option>
          <option>Groom</option>
          <option>Parent</option>
          <option>Family member</option>
          <option>Wedding planner</option>
        </select>
      </label>
      <p className="text-xs text-muted-foreground">
        By joining, you agree to be contacted about Nimantran early access. No invitations or
        payments will be sent.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <button className="workspace-primary w-full" disabled={busy}>
        {busy ? "Saving…" : "Join the waitlist"}
      </button>
    </form>
  );
}
