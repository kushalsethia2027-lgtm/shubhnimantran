import { useState } from "react";
import { api } from "./client";
import {
  approvalGate,
  chooseSamples,
  privacyPromise,
  type Guest,
  type Script,
  type Workspace,
} from "./domain";
export function Scripts({
  data,
  reload,
  aiConfigured,
  samplesOnly = false,
}: {
  data: Workspace;
  reload: () => Promise<void>;
  aiConfigured: boolean;
  samplesOnly?: boolean;
}) {
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const recommended = chooseSamples(data.guests);
  const sampleIds = new Set(data.scripts.filter((s) => s.sample).map((s) => s.guest_id));
  const guests = data.guests.filter(
    (g) =>
      (!samplesOnly || sampleIds.has(g.id) || recommended.some((s) => s.id === g.id)) &&
      `${g.guest_name} ${g.relation}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="space-y-5">
      <h2 className="workspace-title">
        {samplesOnly
          ? "Three samples. Your family’s approval."
          : "Words that respect every relationship."}
      </h2>
      <p className="workspace-note">
        {privacyPromise} Review names, relationship terms, pronunciation and selected events before
        approving. Script approval does not approve billable media or sending.
      </p>
      <p className="text-sm">
        {data.scripts.filter((s) => s.sample && s.approved_at).length} sample approvals ·{" "}
        {approvalGate(data.scripts, data.guests)
          ? "Sample gate satisfied"
          : "Three different relationship groups must be approved"}
      </p>
      {recommended.length < 3 && (
        <p className="workspace-note">
          Add guests from at least three different relationship groups before approving the sample
          set.
        </p>
      )}
      {!aiConfigured && (
        <p className="workspace-note">
          AI generation unavailable: Anthropic is not configured. You can write, save, edit and
          approve real invitation scripts manually. No generated audio preview is available yet.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <label className="workspace-form block">
        <span className="text-sm">Find a guest</span>
        <input
          className="mt-2"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Name or relationship"
        />
      </label>
      {!guests.length && (
        <div className="workspace-card">
          <p className="text-sm text-muted-foreground">
            Add guests to begin personalising invitations.
          </p>
        </div>
      )}
      {guests.slice(page * 10, page * 10 + 10).map((g) => (
        <ScriptEditor
          key={`${g.id}-${data.scripts.find((s) => s.guest_id === g.id)?.revision ?? 0}-${data.scripts.find((s) => s.guest_id === g.id)?.approved_at ?? ""}`}
          guest={g}
          script={data.scripts.find((s) => s.guest_id === g.id)}
          data={data}
          suggestedSample={recommended.some((s) => s.id === g.id)}
          aiConfigured={aiConfigured}
          reload={reload}
          onError={setError}
        />
      ))}
      <div className="flex justify-between gap-2">
        <button
          className="workspace-secondary"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span className="self-center text-xs">{guests.length} guests</span>
        <button
          className="workspace-secondary"
          disabled={(page + 1) * 10 >= guests.length}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
      {samplesOnly && (
        <div className="workspace-card">
          <h3 className="text-xl">Team-assisted review links</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Unavailable in this build. Review and approval are restricted to the signed-in wedding
            owner. Do not share your sign-in code.
          </p>
        </div>
      )}
    </div>
  );
}
function ScriptEditor({
  guest,
  script,
  data,
  suggestedSample,
  aiConfigured,
  reload,
  onError,
}: {
  guest: Guest;
  script: Script | undefined;
  data: Workspace;
  suggestedSample: boolean;
  aiConfigured: boolean;
  reload: () => Promise<void>;
  onError: (value: string) => void;
}) {
  const [wording, setWording] = useState(script?.body ?? "");
  const [phonetics, setPhonetics] = useState(script?.pronunciation ?? guest.pronunciation);
  const [sample, setSample] = useState(script?.sample ?? suggestedSample);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const dirty =
    wording !== (script?.body ?? "") ||
    phonetics !== (script?.pronunciation ?? guest.pronunciation) ||
    sample !== (script?.sample ?? false);
  const save = async (action: string) => {
    setBusy(true);
    onError("");
    try {
      await api(`/weddings/${data.wedding.id}/scripts`, "POST", {
        guest_id: guest.id,
        body: wording,
        pronunciation: phonetics,
        action,
        sample,
        revision: script?.revision ?? 0,
      });
      setNotice(
        action === "approved"
          ? "Approved wording locked until edited."
          : "Saved. Review before approving.",
      );
      await reload();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="workspace-card workspace-form space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h3 className="text-2xl">{guest.guest_name}</h3>
          <p className="text-sm text-muted-foreground">
            {guest.relation} · {guest.language}
          </p>
        </div>
        <span className="workspace-badge">{script?.approved_at ? "Approved" : "Needs review"}</span>
      </div>
      <p className="text-xs">
        Invited to:{" "}
        {guest.invited_events
          .map((id) => {
            const e = data.events.find((event) => event.id === id);
            return e ? `${e.name}, ${e.date}, ${e.venue}` : "";
          })
          .join(" · ")}
      </p>
      <label>
        Pronunciation / phonetic spelling
        <input value={phonetics} onChange={(e) => setPhonetics(e.target.value)} maxLength={240} />
      </label>
      <p className="text-xs text-muted-foreground">
        Corrected audio preview and reference uploads are unavailable until voice generation is
        verified. Save these notes so they remain attached to the approved wording.
      </p>
      <label>
        Invitation script
        <textarea
          rows={5}
          value={wording}
          onChange={(e) => setWording(e.target.value)}
          maxLength={4000}
          placeholder="Write your invitation here, or request an AI draft when configured."
        />
      </label>
      <label className="check">
        <input type="checkbox" checked={sample} onChange={(e) => setSample(e.target.checked)} />
        Include in representative sample review
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          className="workspace-secondary"
          disabled={busy || !aiConfigured}
          onClick={async () => {
            if (
              !window.confirm(
                "Request an AI script draft for this guest? This uses the configured Anthropic account and may incur usage charges. Your current draft will be replaced, but nothing is saved or approved automatically.",
              )
            )
              return;
            setBusy(true);
            onError("");
            try {
              const result = await api<{ body: string }>(
                `/weddings/${data.wedding.id}/generate-script`,
                "POST",
                { guest_id: guest.id, approved: true },
              );
              setWording(result.body);
              setNotice(
                "AI draft received. Review and save before approving. Saved pronunciation notes were used; save any new notes before regenerating.",
              );
            } catch (e) {
              onError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Working…" : "Generate AI draft"}
        </button>
        <button
          className="workspace-primary"
          disabled={busy || !wording.trim() || !dirty}
          onClick={() => void save("edited")}
        >
          Save edits
        </button>
        <button
          className="workspace-secondary"
          disabled={busy || !script || dirty || !!script.approved_at}
          onClick={() => {
            if (window.confirm(`Approve this exact wording for ${guest.guest_name}?`))
              void save("approved");
          }}
        >
          Approve wording
        </button>
        <button
          className="workspace-secondary"
          disabled={busy || !script || dirty}
          onClick={() => void save("rejected")}
        >
          Reject / reopen
        </button>
      </div>
      {dirty && <p className="text-xs">Unsaved changes — save before approving.</p>}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
    </div>
  );
}
