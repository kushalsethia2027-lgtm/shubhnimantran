import { useState } from "react";
import { plans, weddingSchema, type Workspace } from "./domain";
import { api } from "./client";
export function WeddingForm({
  workspace,
  onSaved,
  onCancel,
}: {
  workspace?: Workspace;
  onSaved: (id: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [events, setEvents] = useState(
    workspace?.events ?? [{ id: crypto.randomUUID(), name: "Wedding", date: "", venue: "" }],
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const w = workspace?.wedding;
  return (
    <form
      className="workspace-card workspace-form space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setBusy(true);
        try {
          const input = weddingSchema.parse({
            ...Object.fromEntries(new FormData(event.currentTarget)),
            events,
          });
          const saved = await api<{ id: string }>(
            `/weddings${w ? `/${w.id}` : ""}`,
            w ? "PATCH" : "POST",
            input,
          );
          await onSaved(saved.id);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="workspace-title">
        {w ? "Wedding details" : "Begin your family's invitation"}
      </h2>
      <p className="text-sm text-muted-foreground">
        Save now and return whenever you are ready. All dates and venues are reviewed before
        production.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          Bride’s name
          <input name="bride" defaultValue={w?.bride} required maxLength={100} />
        </label>
        <label>
          Groom’s name
          <input name="groom" defaultValue={w?.groom} required maxLength={100} />
        </label>
        <label>
          Wedding date
          <input type="date" name="wedding_date" defaultValue={w?.wedding_date} required />
        </label>
        <label>
          City
          <input name="city" defaultValue={w?.city} required maxLength={100} />
        </label>
        <label>
          Wedding venue
          <input name="venue" defaultValue={w?.venue} required maxLength={240} />
        </label>
        <label>
          RSVP contact
          <input name="rsvp_contact" defaultValue={w?.rsvp_contact} required maxLength={80} />
        </label>
      </div>
      <label>
        Guest category
        <select name="plan" defaultValue={w?.plan ?? "small"}>
          {Object.entries(plans).map(([key, p]) => (
            <option key={key} value={key}>
              {p.name} · up to {p.limit} guests
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-muted-foreground">
        No checkout or payment. A production batch is limited to 200 guests.
      </p>
      <fieldset className="space-y-4">
        <legend className="mb-3 font-semibold">Your events</legend>
        {events.map((entry, i) => (
          <div key={entry.id} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3">
            <label>
              Event name
              <input
                value={entry.name}
                required
                maxLength={80}
                onChange={(e) =>
                  setEvents(events.map((v, j) => (j === i ? { ...v, name: e.target.value } : v)))
                }
              />
            </label>
            <label>
              Event date
              <input
                type="date"
                value={entry.date}
                required
                onChange={(e) =>
                  setEvents(events.map((v, j) => (j === i ? { ...v, date: e.target.value } : v)))
                }
              />
            </label>
            <label>
              Event venue
              <input
                value={entry.venue}
                required
                maxLength={240}
                onChange={(e) =>
                  setEvents(events.map((v, j) => (j === i ? { ...v, venue: e.target.value } : v)))
                }
              />
            </label>
            <button
              type="button"
              className="text-left text-sm text-destructive"
              disabled={events.length === 1}
              onClick={() => setEvents(events.filter((_, j) => j !== i))}
            >
              Remove event {i + 1}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="workspace-secondary"
          disabled={events.length >= 12}
          onClick={() =>
            setEvents([...events, { id: crypto.randomUUID(), name: "", date: "", venue: "" }])
          }
        >
          + Add event
        </button>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          Invitation tone
          <select name="tone" defaultValue={w?.tone ?? "warm"}>
            <option value="warm">Warm and affectionate</option>
            <option value="traditional">Formal and traditional</option>
            <option value="playful">Light-hearted and playful</option>
          </select>
        </label>
        <label>
          Visual preference
          <select name="template" defaultValue={w?.template ?? "maroon"}>
            <option value="maroon">Maroon & gold</option>
            <option value="floral">Floral</option>
            <option value="royal">Royal</option>
            <option value="minimal">Minimalist</option>
          </select>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Visual preferences are saved. Rendered template previews are unavailable until the rendering
        integration is verified.
      </p>
      <label>
        Family notes and preferences
        <textarea name="notes" defaultValue={w?.notes} maxLength={2000} />
      </label>
      {w && (
        <p className="workspace-note">
          Saving changes invalidates existing scripts and approvals. Weddings with active production
          are locked.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button className="workspace-primary" disabled={busy}>
          {busy ? "Saving…" : "Save wedding"}
        </button>
        <button className="workspace-secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
