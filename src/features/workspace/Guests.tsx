import { useState } from "react";
import { api, download } from "./client";
import {
  csvExport,
  guestSchema,
  plans,
  previewCsv,
  relations,
  type Guest,
  type ImportRow,
  type Workspace,
} from "./domain";
export function Guests({ data, reload }: { data: Workspace; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState<Guest | "new" | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const base = `/weddings/${data.wedding.id}`;
  const selected = editing && editing !== "new" ? editing : null;
  const issues = (g: Guest) => !g.relation || !g.invited_events.length || !g.messaging_consent;
  const visible = data.guests.filter(
    (g) =>
      `${g.guest_name} ${g.relation} ${g.whatsapp_number}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" || (filter === "attention" && issues(g)) || g.language === filter),
  );
  const act = async (fn: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="workspace-title">Your people</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.guests.length} / {plans[data.wedding.plan].limit} guests ·{" "}
            {data.guests.filter(issues).length} need attention
          </p>
        </div>
        <button className="workspace-primary" onClick={() => setEditing("new")}>
          + Add guest
        </button>
      </div>
      <p className="workspace-note">
        Guests receive only their selected events. Missing WhatsApp permission needs attention
        before delivery; CSV import never assumes permission.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <div className="workspace-card workspace-form space-y-4">
        <h3 className="text-2xl">Bring your guest list</h3>
        <div className="flex flex-wrap gap-2">
          <button
            className="workspace-secondary"
            onClick={() =>
              download(
                "nimantran-guests-template.csv",
                "guest_name,relation,language,whatsapp_number,invited_events,notes\r\n",
              )
            }
          >
            Download CSV template
          </button>
          <button
            className="workspace-secondary"
            disabled={!data.guests.length}
            onClick={() =>
              download(
                "nimantran-guests.csv",
                csvExport([
                  [
                    "guest_name",
                    "relation",
                    "language",
                    "whatsapp_number",
                    "invited_events",
                    "notes",
                  ],
                  ...data.guests.map((g) => [
                    g.guest_name,
                    g.relation,
                    g.language,
                    g.whatsapp_number,
                    g.invited_events
                      .map((id) => data.events.find((e) => e.id === id)?.name ?? "")
                      .join("|"),
                    g.notes,
                  ]),
                ]),
              )
            }
          >
            Export guests
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Use exact event names: {data.events.map((e) => e.name).join(" | ")}. Separate multiple
          events with |. Hindi or Hinglish only. Max 2 MB / 400 rows. Export is spreadsheet-safe.
        </p>
        <label>
          Choose CSV to preview
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              setPreview([]);
              setError("");
              if (!f) return;
              try {
                if (f.size > 2_000_000) throw new Error("CSV must be smaller than 2 MB.");
                if (!f.name.toLowerCase().endsWith(".csv")) throw new Error("Choose a .csv file.");
                const result = previewCsv(await f.text(), data.events, data.guests);
                if (!result.length) throw new Error("No guest rows found.");
                setPreview(result);
              } catch (ex) {
                setError((ex as Error).message);
              }
              e.target.value = "";
            }}
          />
        </label>
        {preview.length > 0 && (
          <div className="space-y-3">
            <p>
              {preview.length} rows · {preview.filter((r) => r.errors.length > 0).length} invalid.
              Nothing has been imported.
            </p>
            <div className="max-h-72 overflow-auto">
              <table>
                <thead>
                  <tr>
                    <th>CSV row</th>
                    <th>Guest</th>
                    <th>Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r) => (
                    <tr key={r.line}>
                      <td>{r.line}</td>
                      <td>{r.data["guest_name"]}</td>
                      <td>{r.errors.length ? r.errors.join("; ") : "Ready to import"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs">
              Fix all invalid rows in your CSV and upload again. No rows are silently skipped.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="workspace-primary"
                disabled={
                  busy ||
                  preview.some((r) => r.errors.length > 0) ||
                  preview.length + data.guests.length > plans[data.wedding.plan].limit
                }
                onClick={() =>
                  act(async () => {
                    await api(
                      `${base}/guests`,
                      "POST",
                      preview.map((r) => r.guest),
                    );
                    setMessage(`Imported ${preview.length} guests.`);
                    setPreview([]);
                  })
                }
              >
                Confirm import of {preview.length} guests
              </button>
              <button className="workspace-secondary" onClick={() => setPreview([])}>
                Discard preview
              </button>
            </div>
          </div>
        )}
      </div>
      {editing && (
        <form
          key={selected?.id ?? "new"}
          className="workspace-card workspace-form space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fields = new FormData(e.currentTarget);
            void act(async () => {
              const input = guestSchema.parse({
                ...Object.fromEntries(fields),
                ...(selected ? { id: selected.id } : {}),
                invited_events: fields.getAll("invited_events"),
                messaging_consent: fields.get("messaging_consent") === "on",
              });
              await api(`${base}/guests`, "POST", [input]);
              setEditing(null);
              setMessage("Guest saved. Any previous script requires fresh review.");
            });
          }}
        >
          <h3 className="text-2xl">{selected ? "Edit guest" : "Welcome another guest"}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              Guest name
              <input
                name="guest_name"
                defaultValue={selected?.guest_name}
                required
                maxLength={100}
              />
            </label>
            <label>
              Relationship / respectful address
              <input
                name="relation"
                list="relations"
                defaultValue={selected?.relation}
                required
                maxLength={100}
              />
              <datalist id="relations">
                {relations.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </datalist>
            </label>
            <label>
              WhatsApp number
              <input
                name="whatsapp_number"
                type="tel"
                defaultValue={selected?.whatsapp_number}
                placeholder="+91 98765 43210"
                required
              />
            </label>
            <label>
              Language
              <select name="language" defaultValue={selected?.language ?? "Hindi"}>
                <option>Hindi</option>
                <option>Hinglish</option>
              </select>
            </label>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">
              Invited events · choose at least one
            </legend>
            <div className="flex flex-wrap gap-4">
              {data.events.map((ev) => (
                <label className="check" key={ev.id}>
                  <input
                    type="checkbox"
                    name="invited_events"
                    value={ev.id}
                    defaultChecked={selected?.invited_events.includes(ev.id)}
                  />
                  {ev.name}
                </label>
              ))}
            </div>
          </fieldset>
          <label>
            Approved phonetic spelling / pronunciation notes
            <input name="pronunciation" maxLength={240} defaultValue={selected?.pronunciation} />
          </label>
          <label>
            Family notes
            <textarea name="notes" maxLength={1000} defaultValue={selected?.notes} />
          </label>
          <label className="check">
            <input
              type="checkbox"
              name="messaging_consent"
              defaultChecked={selected?.messaging_consent}
            />
            This guest has agreed to receive this wedding invitation on WhatsApp.
          </label>
          <p className="text-xs text-muted-foreground">
            Updating details invalidates the guest’s script. A guest already in production is
            locked.
          </p>
          <div className="flex gap-3">
            <button className="workspace-primary" disabled={busy}>
              Save guest
            </button>
            <button className="workspace-secondary" type="button" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className="workspace-card workspace-form space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            Search guests
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Name, relation or number"
            />
          </label>
          <label>
            Filter
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">All guests</option>
              <option value="attention">Needs attention</option>
              <option>Hindi</option>
              <option>Hinglish</option>
            </select>
          </label>
        </div>
        {!visible.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {data.guests.length
              ? "No guests match your search."
              : "Your guest list begins here. Add someone or preview a CSV."}
          </p>
        ) : (
          <div className="space-y-3">
            {visible.slice(page * 15, page * 15 + 15).map((g) => (
              <div
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {g.guest_name} <span className="workspace-badge">{g.relation}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {g.whatsapp_number} · {g.language}
                  </p>
                  <p className="mt-1 text-xs">
                    {g.invited_events
                      .map((id) => data.events.find((e) => e.id === id)?.name)
                      .join(", ")}
                  </p>
                  {!g.messaging_consent && (
                    <p className="mt-1 text-xs text-destructive">WhatsApp permission needed</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button className="workspace-secondary" onClick={() => setEditing(g)}>
                    Edit
                  </button>
                  <button
                    className="workspace-secondary"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Delete ${g.guest_name} and their script?`))
                        void act(async () => {
                          await api(`${base}/guests/${g.id}`, "DELETE");
                          setPage(0);
                        });
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <button
            className="workspace-secondary"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span className="text-xs">
            {visible.length
              ? `${page * 15 + 1}–${Math.min(page * 15 + 15, visible.length)} of ${visible.length}`
              : "0 guests"}
          </span>
          <button
            className="workspace-secondary"
            disabled={(page + 1) * 15 >= visible.length}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
