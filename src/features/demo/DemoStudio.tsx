import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Download, Flower2, Mic, Play, ShieldCheck, Upload } from "lucide-react";
import exampleAudio from "@/assets/demo-narration.mp3";
import { download } from "../workspace/client";
import { csvExport, relations } from "../workspace/domain";
import {
  buildInvitation,
  canRender,
  demoGuestSchema,
  demoSchema,
  exampleData,
  importDemoCsv,
  invalidateApprovals,
  storageKey,
  recordingContext,
  recordingMatches,
  recordingExtension,
  type DemoData,
  type DemoGuest,
} from "./model";
import { drawInvitation, renderInvitation, type RenderResult } from "./video";
import { CameraRecorder } from "./CameraRecorder";
const steps = [
  "Wedding",
  "Guests",
  "Review scripts",
  "Record voice / video",
  "Generate & download",
];
type AudioChoice = {
  blob: Blob;
  name: string;
  source: "example" | "recorded" | "uploaded";
  kind?: "audio" | "video";
  audioBlob?: Blob;
};
type GuestRecording = AudioChoice & { guestId: string; context: string; consent: boolean };
export function DemoStudio({ standalone = false }: { standalone?: boolean }) {
  const [data, setData] = useState<DemoData>(exampleData);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState("mama");
  const [recordings, setRecordings] = useState<Record<string, GuestRecording>>({});
  const [audioUrl, setAudioUrl] = useState("");

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<RenderResult | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [csv, setCsv] = useState<ReturnType<typeof importDemoCsv>>([]);
  const [editGuest, setEditGuest] = useState<DemoGuest | "new" | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const controller = useRef<AbortController | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const microphone = useRef<MediaStream | null>(null);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStart = useRef(0);
  const selected = data.guests.find((g) => g.id === selectedId) ?? data.guests[0];
  const audio = selected ? (recordings[selected.id] ?? null) : null;
  const consent = audio?.consent ?? false;
  const setConsent = (value: boolean) => {
    if (selected)
      setRecordings((previous) => {
        const existing = previous[selected.id];
        return existing
          ? { ...previous, [selected.id]: { ...existing, consent: value } }
          : previous;
      });
  };
  const mediaStale =
    !!selected && !!audio && audio.source !== "example" && !recordingMatches(data, selected, audio);
  const approvedSamples = data.guests.filter((g) => g.approved).length;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = demoSchema.safeParse(JSON.parse(raw));
        if (parsed.success) setData(parsed.data);
        else setNotice("An older demo draft could not be restored. Example data has been loaded.");
      }
    } catch {
      setNotice(
        "Browser storage is unavailable. Your draft will last only while this page stays open.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      setNotice(
        "Draft storage is full or unavailable. Keep this page open and download your work.",
      );
    }
  }, [data, ready]);
  useEffect(() => {
    if (!audio) {
      setAudioUrl("");
      return;
    }
    const url = URL.createObjectURL(audio.blob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audio]);
  useEffect(() => {
    if (!result) {
      setVideoUrl("");
      return;
    }
    const url = URL.createObjectURL(result.blob);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result]);
  useEffect(() => {
    setResult(null);
  }, [data, audio, selectedId]);
  useEffect(() => {
    if (canvas.current && selected) drawInvitation(canvas.current, data, selected, 0);
  }, [data, selected, step]);
  useEffect(
    () => () => {
      controller.current?.abort();
      if (recordingTimer.current) clearInterval(recordingTimer.current);
      if (recorder.current?.state === "recording") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      microphone.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  const update = (next: DemoData) => {
    setData(next);
    setRecordings((previous) => {
      const retained = Object.fromEntries(
        Object.entries(previous).filter(([id]) => next.guests.some((g) => g.id === id)),
      );
      return Object.keys(retained).length === Object.keys(previous).length ? previous : retained;
    });
    setError("");
    setNotice("");
  };
  const selectAudio = (next: AudioChoice) => {
    if (!selected) {
      setError("Select a guest before recording.");
      return;
    }
    setRecordings((previous) => ({
      ...previous,
      [selected.id]: {
        ...next,
        kind: next.kind ?? "audio",
        guestId: selected.id,
        context: recordingContext(data, selected),
        consent: false,
      },
    }));
    setResult(null);
    setError("");
  };
  const stopRecording = () => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  };
  const record = async () => {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")
        throw new Error(
          "Microphone recording needs current Chrome or Edge on localhost or HTTPS. You can also upload an audio file.",
        );
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphone.current = stream;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((v) =>
        MediaRecorder.isTypeSupported(v),
      );
      if (!mime) throw new Error("No supported recorder format. Upload MP3, WAV or M4A instead.");
      const active = new MediaRecorder(stream, { mimeType: mime });
      recorder.current = active;
      const chunks: Blob[] = [];
      active.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      active.onstop = () => {
        if (recordingTimer.current) clearInterval(recordingTimer.current);
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const duration = Math.round((performance.now() - recordingStart.current) / 1000);
        if (duration < 3) {
          setError(
            "Record at least 3 seconds for a demo; 30–60 seconds is recommended for a full invitation.",
          );
          return;
        }
        selectAudio({
          blob: new Blob(chunks, { type: mime }),
          name: "Your recorded voice",
          source: "recorded",
        });
      };
      active.onerror = () => {
        setError("Microphone recording failed. Check permission or upload audio instead.");
        stopRecording();
      };
      recordingStart.current = performance.now();
      setSeconds(0);
      setRecording(true);
      active.start(250);
      recordingTimer.current = setInterval(() => {
        const n = Math.floor((performance.now() - recordingStart.current) / 1000);
        setSeconds(Math.min(n, 60));
        if (n >= 60) stopRecording();
      }, 200);
    } catch (e) {
      microphone.current?.getTracks().forEach((t) => t.stop());
      setRecording(false);
      setError(
        (e as Error).name === "NotAllowedError"
          ? "Microphone permission was denied. Allow it in browser settings, or upload audio."
          : (e as Error).message,
      );
    }
  };
  const generate = async () => {
    if (!selected) return;
    const blocked = mediaStale
      ? "This guest’s details or script changed after recording. Record or upload a new personal take before generating."
      : canRender(data, selected.id, !!audio, consent);
    if (blocked) {
      setError(blocked);
      return;
    }
    if (!canvas.current || !audio) return;
    setBusy(true);
    setError("");
    setResult(null);
    setProgress(0);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const output = await renderInvitation({
        canvas: canvas.current,
        data,
        guest: selected,
        audio: await (audio.audioBlob ?? audio.blob).arrayBuffer(),
        ...(audio.kind === "video" ? { cameraClip: audio.blob } : {}),
        signal: abort.signal,
        onProgress: setProgress,
      });
      setResult(output);
      setNotice(
        "Your video was genuinely rendered in this browser. Preview it, then download the file.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      controller.current = null;
    }
  };
  const reset = () => {
    if (
      !window.confirm(
        "Clear the browser demo draft, recordings and generated preview? Downloaded files stay on your computer.",
      )
    )
      return;
    controller.current?.abort();
    stopRecording();
    setData(exampleData());
    setRecordings({});
    setResult(null);
    setCsv([]);
    setStep(0);
    setNotice("Example wedding restored. Local recordings and generated previews cleared.");
  };
  const blockReason = mediaStale
    ? "This guest’s details or script changed. Re-record their personal audio/video before generating."
    : selected
      ? canRender(data, selected.id, !!audio, consent)
      : "Add a guest first.";
  if (!ready)
    return (
      <div className="workspace">
        <main className="mx-auto max-w-6xl px-4 py-10">
          <p role="status" className="workspace-card">
            Opening your browser-local studio…
          </p>
        </main>
      </div>
    );
  return (
    <div className="workspace">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <a href="/" className="inline-flex items-center gap-2 font-display text-3xl text-maroon">
            <Flower2 size={25} />
            Nimantran
          </a>
          <div className="flex items-center gap-3">
            <span className="workspace-badge">No-login browser studio</span>
            {!standalone && (
              <a className="text-sm text-maroon underline" href="/app">
                Account studio
              </a>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-7 sm:py-10">
        <div className="mb-6 grid items-end gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="label-xs text-maroon/60">Record. Personalise. Download.</p>
            <h1 className="workspace-title mt-3">An invitation worth keeping.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Try the full local workflow without an account, email code or API key. Render a real
              video with your recorded voice and download it directly.
            </p>
          </div>
          <button className="workspace-secondary" disabled={busy || recording} onClick={reset}>
            Reset demo
          </button>
        </div>
        <div className="workspace-note mb-5">
          <strong>Submission demo · browser-local data.</strong> The initial wedding and guests are
          examples. Edits and approvals are saved only in this browser. Audio and generated videos
          stay in memory until downloaded; refreshing clears them. No AI voice cloning, cloud saving
          or WhatsApp sending is performed.
        </div>
        <nav className="workspace-nav mb-6 border-y" aria-label="Demo steps">
          {steps.map((name, i) => (
            <button
              key={name}
              aria-current={step === i ? "page" : undefined}
              disabled={busy || recording}
              onClick={() => {
                setStep(i);
                setError("");
              }}
            >
              <span className="mr-2 opacity-60">0{i + 1}</span>
              {name}
            </button>
          ))}
        </nav>
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-destructive/40 bg-card p-4 text-sm text-destructive"
          >
            {error}
          </div>
        )}
        {notice && (
          <p role="status" className="workspace-note mb-5">
            {notice}
          </p>
        )}
        {step === 0 && (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <form
              className="workspace-card workspace-form space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const next = {
                  ...data,
                  bride: String(f.get("bride")),
                  groom: String(f.get("groom")),
                  city: String(f.get("city")),
                };
                const parsed = demoSchema.safeParse(next);
                if (!parsed.success) {
                  setError(parsed.error.issues.map((i) => i.message).join("; "));
                  return;
                }
                update(
                  data.bride === parsed.data.bride &&
                    data.groom === parsed.data.groom &&
                    data.city === parsed.data.city
                    ? parsed.data
                    : invalidateApprovals(parsed.data),
                );
                setNotice(
                  "Wedding saved in this browser. Changed wedding details need fresh script review; unchanged details keep approval.",
                );
                setStep(1);
              }}
            >
              <h2 className="text-3xl text-maroon">Your celebration</h2>
              <p className="text-sm text-muted-foreground">
                Example details are prefilled so you can demonstrate immediately. Replace them with
                your own.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  Bride’s name
                  <input name="bride" defaultValue={data.bride} required maxLength={80} />
                </label>
                <label>
                  Groom’s name
                  <input name="groom" defaultValue={data.groom} required maxLength={80} />
                </label>
              </div>
              <label>
                City
                <input name="city" defaultValue={data.city} required maxLength={80} />
              </label>
              <fieldset className="space-y-4">
                <legend className="mb-3 font-semibold">Events</legend>
                {data.events.map((event, index) => (
                  <div key={event.id} className="grid gap-3 rounded-xl border p-4">
                    <label>
                      Event name
                      <input
                        value={event.name}
                        maxLength={60}
                        onChange={(e) =>
                          update(
                            invalidateApprovals({
                              ...data,
                              events: data.events.map((v, i) =>
                                i === index ? { ...v, name: e.target.value } : v,
                              ),
                            }),
                          )
                        }
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label>
                        Date
                        <input
                          type="date"
                          value={event.date}
                          onChange={(e) =>
                            update(
                              invalidateApprovals({
                                ...data,
                                events: data.events.map((v, i) =>
                                  i === index ? { ...v, date: e.target.value } : v,
                                ),
                              }),
                            )
                          }
                        />
                      </label>
                      <label>
                        Venue
                        <input
                          value={event.venue}
                          maxLength={160}
                          onChange={(e) =>
                            update(
                              invalidateApprovals({
                                ...data,
                                events: data.events.map((v, i) =>
                                  i === index ? { ...v, venue: e.target.value } : v,
                                ),
                              }),
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </fieldset>
              <button className="workspace-primary">Save wedding & continue</button>
            </form>
            <aside className="space-y-4">
              <div className="rounded-2xl bg-maroon p-7 text-cream">
                <Flower2 size={36} className="text-gold" />
                <p className="mt-5 label-xs text-champagne">
                  Every invitation carries your family’s voice
                </p>
                <h2 className="mt-4 font-display text-4xl">
                  {data.bride} <span className="text-gold">&</span> {data.groom}
                </h2>
                <p className="mt-4 text-sm text-cream/80">
                  {data.events[0]?.date} · {data.city}
                </p>
              </div>
              <div className="workspace-card space-y-3">
                <h3 className="text-2xl">What actually works here</h3>
                {[
                  "Edit wedding and event details",
                  "Add guests or preview a CSV import",
                  "Record or upload real audio",
                  "Edit and approve personalised scripts",
                  "Render, preview and download a real video",
                ].map((text) => (
                  <p key={text} className="flex gap-2 text-sm">
                    <Check size={17} className="shrink-0 text-maroon" />
                    {text}
                  </p>
                ))}
              </div>
            </aside>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-3xl text-maroon">People, not a mailing list.</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {data.guests.length} / 50 demo guests. No phone number is required for direct
                  download.
                </p>
              </div>
              <button
                className="workspace-primary"
                disabled={data.guests.length >= 50}
                onClick={() => setEditGuest("new")}
              >
                + Add guest
              </button>
            </div>
            <div className="workspace-card workspace-form space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  className="workspace-secondary"
                  onClick={() =>
                    download(
                      "nimantran-demo-guests-template.csv",
                      "guest_name,relation,language,invited_events\r\n",
                    )
                  }
                >
                  Download CSV template
                </button>
                <button
                  className="workspace-secondary"
                  onClick={() =>
                    download(
                      "nimantran-demo-guests.csv",
                      csvExport([
                        ["guest_name", "relation", "language", "invited_events"],
                        ...data.guests.map((g) => [
                          g.name,
                          g.relation,
                          g.language,
                          g.events
                            .map((id) => data.events.find((e) => e.id === id)?.name ?? "")
                            .join("|"),
                        ]),
                      ]),
                    )
                  }
                >
                  Export guests
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use event names {data.events.map((e) => e.name).join(" | ")}. Separate multiple
                events with |. Review all errors before import.
              </p>
              <label>
                Preview CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    setCsv([]);
                    setError("");
                    if (!file) return;
                    try {
                      if (file.size > 2_000_000 || !file.name.toLowerCase().endsWith(".csv"))
                        throw new Error("Choose a CSV file under 2 MB.");
                      const preview = importDemoCsv(await file.text(), data);
                      if (!preview.length) throw new Error("The CSV has no guest rows.");
                      setCsv(preview);
                    } catch (error) {
                      setError((error as Error).message);
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              {csv.length > 0 && (
                <div className="space-y-3">
                  <div className="max-h-64 overflow-auto">
                    <table>
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Guest</th>
                          <th>Validation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csv.map((r) => (
                          <tr key={r.line}>
                            <td>{r.line}</td>
                            <td>{r.guest?.name ?? "Invalid row"}</td>
                            <td>{r.errors.join("; ") || "Ready"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    className="workspace-primary"
                    disabled={
                      csv.some((r) => r.errors.length) || csv.length + data.guests.length > 50
                    }
                    onClick={() => {
                      update({
                        ...data,
                        guests: [
                          ...data.guests,
                          ...csv.map((r) => ({ ...r.guest!, id: crypto.randomUUID() })),
                        ],
                      });
                      setCsv([]);
                      setNotice("All previewed guests imported locally. No rows were discarded.");
                    }}
                  >
                    Import {csv.length} guests
                  </button>
                </div>
              )}
            </div>
            {editGuest && (
              <form
                key={editGuest === "new" ? "new" : editGuest.id}
                className="workspace-card workspace-form space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const current = editGuest === "new" ? null : editGuest;
                  const parsed = demoGuestSchema.safeParse({
                    id: current?.id ?? crypto.randomUUID(),
                    name: f.get("name"),
                    relation: f.get("relation"),
                    language: f.get("language"),
                    events: f.getAll("events"),
                    phonetics: f.get("phonetics"),
                    script: "",
                    approved: false,
                  });
                  if (!parsed.success) {
                    setError(
                      parsed.error.issues
                        .map((i) => `${i.path.join(".")}: ${i.message}`)
                        .join("; "),
                    );
                    return;
                  }
                  if (
                    data.guests.some(
                      (g) =>
                        g.id !== parsed.data.id &&
                        g.name.toLowerCase() === parsed.data.name.toLowerCase() &&
                        g.relation.toLowerCase() === parsed.data.relation.toLowerCase(),
                    )
                  ) {
                    setError("This name and relationship already exist.");
                    return;
                  }
                  const savedGuest =
                    current &&
                    recordingContext(data, current) ===
                      recordingContext(data, { ...parsed.data, script: current.script })
                      ? { ...parsed.data, script: current.script, approved: current.approved }
                      : parsed.data;
                  update({
                    ...data,
                    guests: current
                      ? data.guests.map((g) => (g.id === current.id ? savedGuest : g))
                      : [...data.guests, parsed.data],
                  });
                  setEditGuest(null);
                }}
              >
                <h3 className="text-2xl">{editGuest === "new" ? "Add guest" : "Edit guest"}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    Guest name
                    <input
                      name="name"
                      defaultValue={editGuest === "new" ? "" : editGuest.name}
                      required
                      maxLength={80}
                    />
                  </label>
                  <label>
                    Relationship
                    <input
                      name="relation"
                      list="demo-relations"
                      defaultValue={editGuest === "new" ? "" : editGuest.relation}
                      required
                      maxLength={80}
                    />
                    <datalist id="demo-relations">
                      {relations.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </datalist>
                  </label>
                </div>
                <label>
                  Language
                  <select
                    name="language"
                    defaultValue={editGuest === "new" ? "Hinglish" : editGuest.language}
                  >
                    <option>Hindi</option>
                    <option>Hinglish</option>
                  </select>
                </label>
                <label>
                  Pronunciation note
                  <input
                    name="phonetics"
                    defaultValue={editGuest === "new" ? "" : editGuest.phonetics}
                    maxLength={160}
                  />
                </label>
                <fieldset>
                  <legend className="mb-2 text-sm">Invited events · select at least one</legend>
                  <div className="flex flex-wrap gap-4">
                    {data.events.map((ev) => (
                      <label key={ev.id} className="check">
                        <input
                          type="checkbox"
                          name="events"
                          value={ev.id}
                          defaultChecked={editGuest !== "new" && editGuest.events.includes(ev.id)}
                        />
                        {ev.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex gap-3">
                  <button className="workspace-primary">Save guest</button>
                  <button
                    type="button"
                    className="workspace-secondary"
                    onClick={() => setEditGuest(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.guests.map((g) => (
                <div className="workspace-card space-y-3" key={g.id}>
                  <span className="workspace-badge">{g.language}</span>
                  <h3 className="text-2xl text-maroon">{g.name}</h3>
                  <p className="text-sm">{g.relation}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.events
                      .map((id) => data.events.find((e) => e.id === id)?.name ?? "Missing event")
                      .join(" · ")}
                  </p>
                  <div className="flex gap-2">
                    <button className="workspace-secondary" onClick={() => setEditGuest(g)}>
                      Edit
                    </button>
                    <button
                      className="workspace-secondary"
                      onClick={() => {
                        if (window.confirm(`Remove ${g.name} from this local demo?`))
                          update({ ...data, guests: data.guests.filter((v) => v.id !== g.id) });
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button className="workspace-primary" onClick={() => setStep(2)}>
              Continue to script review
            </button>
          </div>
        )}
        {step === 3 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="workspace-card workspace-form space-y-5">
              <h2 className="text-3xl text-maroon">A personal recording for every guest.</h2>
              <p className="workspace-note">
                Each guest has their own audio or camera take. A new take replaces that guest’s
                previous recording. Switching guests never reuses someone else’s recording.{" "}
                {
                  Object.keys(recordings).filter((id) => data.guests.some((g) => g.id === id))
                    .length
                }{" "}
                guest recordings in this tab.
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                Record or upload your own narration. The app embeds that actual audio in the video;
                it does not clone your voice or make the recording speak different names.
              </p>
              <label>
                Script to read
                <select
                  disabled={recording}
                  value={selected?.id ?? ""}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  {data.guests.map((g) => (
                    <option value={g.id} key={g.id}>
                      {g.name} · {g.relation}
                      {recordings[g.id] ? " · recording saved in tab" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {!selected?.approved && (
                <p className="workspace-note">
                  Review and approve this guest’s script before recording so the spoken words match.{" "}
                  <button className="underline" disabled={recording} onClick={() => setStep(2)}>
                    Review script
                  </button>
                </p>
              )}
              <div className="rounded-xl bg-muted p-4 text-sm leading-7">
                {selected
                  ? selected.script || buildInvitation(data, selected)
                  : "Add a guest first."}
              </div>
              <p className="text-xs text-muted-foreground">
                For genuinely spoken personalisation, read the selected guest’s script. Record a
                separate narration for another guest. Recommended 30–60 seconds; a quick demo can be
                3 seconds or longer.
              </p>
              <div className="rounded-xl bg-maroon p-6 text-center text-cream">
                <Mic className="mx-auto text-gold" size={30} />
                <p className="mt-3 font-display text-5xl" role="timer">
                  0:{String(seconds).padStart(2, "0")}
                </p>
                <p className="my-3 text-xs text-cream/70">
                  {recorder.current?.state === "recording"
                    ? "Recording audio · auto-stops at 60s"
                    : recording
                      ? "Camera is active below"
                      : "Microphone is used only after you press Record"}
                </p>
                <button
                  className="workspace-secondary"
                  disabled={recording && recorder.current?.state !== "recording"}
                  onClick={() =>
                    recorder.current?.state === "recording" ? stopRecording() : void record()
                  }
                >
                  {recorder.current?.state === "recording" ? "Stop recording" : "Record my voice"}
                </button>
              </div>
              <CameraRecorder
                key={selected?.id ?? "none"}
                disabled={recording || !selected}
                onActivity={setRecording}
                onError={setError}
                onRecorded={(take) =>
                  selectAudio({
                    ...take,
                    kind: "video",
                    name: `Personal camera recording for ${selected?.name ?? "guest"}`,
                    source: "recorded",
                  })
                }
              />
              <label>
                Or upload audio · MP3 / WAV / M4A / WebM
                <input
                  type="file"
                  accept="audio/*,.m4a,.mp3,.wav,.webm"
                  disabled={recording}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      if (file.size > 15_000_000)
                        throw new Error("Use audio under 15 MB and 65 seconds.");
                      if (
                        !file.type.startsWith("audio/") &&
                        !/\.(mp3|wav|m4a|webm|ogg)$/i.test(file.name)
                      )
                        throw new Error("Choose an audio file.");
                      selectAudio({ blob: file, name: file.name, source: "uploaded" });
                    } catch (error) {
                      setError((error as Error).message);
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <div className="space-y-5">
              <div className="workspace-card space-y-4">
                <h3 className="text-2xl">Need a quick presentation?</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  Use the bundled example narration from the existing Aarav–Meera sample. This is
                  prerecorded demonstration audio, not generated or cloned speech. It may mention
                  the example couple even if you change the text.
                </p>
                <button
                  className="workspace-secondary"
                  disabled={recording}
                  onClick={async () => {
                    setError("");
                    try {
                      const r = await fetch(exampleAudio);
                      if (!r.ok) throw new Error("Example audio could not load.");
                      selectAudio({
                        blob: await r.blob(),
                        name: "Bundled Aarav–Meera example narration",
                        source: "example",
                      });
                    } catch (error) {
                      setError((error as Error).message);
                    }
                  }}
                >
                  <Play size={16} className="mr-2" />
                  Use example narration
                </button>
              </div>
              <div className="workspace-card workspace-form space-y-4">
                <h3 className="text-2xl">Recording preview & permission</h3>
                {audio ? (
                  <>
                    <p className="text-sm">{audio.name}</p>
                    <span className="workspace-badge">
                      {audio.source === "example"
                        ? "Prerecorded example"
                        : audio.source === "recorded"
                          ? "Your microphone recording"
                          : "Uploaded recording"}
                      {audio.kind === "video" ? " · camera + voice" : ""}
                    </span>
                    {audio.kind === "video" ? (
                      <video
                        controls
                        playsInline
                        className="aspect-video w-full rounded-xl bg-black"
                        src={audioUrl}
                        aria-label="Personal camera recording preview"
                      />
                    ) : (
                      <audio
                        controls
                        className="w-full"
                        src={audioUrl}
                        aria-label="Selected narration preview"
                      />
                    )}
                    <a
                      className="workspace-secondary"
                      href={audioUrl}
                      download={`Nimantran-original-${selected?.name.replace(/[^\p{L}\p{N}_-]/gu, "-") ?? "guest"}.${recordingExtension(audio.blob.type)}`}
                    >
                      Download this guest’s original recording
                    </a>
                    {mediaStale && (
                      <p role="alert" className="text-sm text-destructive">
                        The script or guest details changed after this take. Record a new take to
                        match them.
                      </p>
                    )}
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => {
                          setConsent(e.target.checked);
                          setResult(null);
                        }}
                      />
                      I have permission to use this audio/video in this invitation. I understand it
                      is embedded unchanged, without voice cloning.
                    </label>
                    <button
                      className="workspace-secondary"
                      onClick={() => {
                        if (selected)
                          setRecordings((previous) => {
                            const next = { ...previous };
                            delete next[selected.id];
                            return next;
                          });
                        setResult(null);
                      }}
                    >
                      Remove this guest’s recording & revoke permission
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No recording for this guest. Record audio/video, upload audio, or choose the
                    labelled example.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Guest audio/video recordings stay in this tab’s memory. Nothing is uploaded to
                  Supabase or an AI provider. Refreshing removes it.
                </p>
              </div>
              <button className="workspace-primary" disabled={recording} onClick={() => setStep(4)}>
                Continue to video & download
              </button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-3xl text-maroon">The right words. Your approval.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {approvedSamples} / {data.guests.length} guest scripts approved. Only the selected
                guest needs approval to render. Scripts are built from your exact event details
                using local templates, not an AI API.
              </p>
            </div>
            <div className="workspace-card flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-xl text-sm">
                Create editable drafts first. Review every name, relationship, event and
                pronunciation. Approval permits only this local render; it does not send anything.
              </p>
              <button
                className="workspace-primary"
                disabled={!data.guests.length}
                onClick={() => {
                  try {
                    update({
                      ...data,
                      guests: data.guests.map((g) => ({
                        ...g,
                        script: g.script.trim() ? g.script : buildInvitation(data, g),
                        approved: g.script.trim() ? g.approved : false,
                      })),
                    });
                    setNotice(
                      "Personalised text drafts created locally. Read and approve each script.",
                    );
                  } catch (error) {
                    setError((error as Error).message);
                  }
                }}
              >
                Create personalised scripts
              </button>
            </div>
            {data.guests.map((g) => (
              <div key={g.id} className="workspace-card workspace-form space-y-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <h3 className="text-2xl text-maroon">
                      {g.name} · {g.relation}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {g.language} ·{" "}
                      {g.events.map((id) => data.events.find((e) => e.id === id)?.name).join(", ")}
                    </p>
                  </div>
                  <span className="workspace-badge">
                    {g.approved ? "Approved" : "Needs review"}
                  </span>
                </div>
                <label>
                  Invitation wording for {g.name}
                  <textarea
                    rows={5}
                    value={g.script}
                    maxLength={1200}
                    onChange={(e) =>
                      update({
                        ...data,
                        guests: data.guests.map((v) =>
                          v.id === g.id ? { ...v, script: e.target.value, approved: false } : v,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Pronunciation note for {g.name}
                  <input
                    value={g.phonetics}
                    maxLength={160}
                    onChange={(e) =>
                      update({
                        ...data,
                        guests: data.guests.map((v) =>
                          v.id === g.id ? { ...v, phonetics: e.target.value, approved: false } : v,
                        ),
                      })
                    }
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  Pronunciation notes are for your recording; they do not change existing audio.
                  Re-record corrected names before rendering.
                </p>
                <button
                  className="workspace-secondary"
                  disabled={!g.script.trim()}
                  onClick={() =>
                    update({
                      ...data,
                      guests: data.guests.map((v) =>
                        v.id === g.id ? { ...v, approved: !g.approved } : v,
                      ),
                    })
                  }
                >
                  {g.approved ? `Reopen ${g.name}’s script` : `Approve ${g.name}’s script`}
                </button>
              </div>
            ))}
            <button className="workspace-primary" onClick={() => setStep(3)}>
              Continue to recording
            </button>
          </div>
        )}
        {step === 4 && (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-5">
              <div className="workspace-card workspace-form space-y-5">
                <h2 className="text-3xl text-maroon">Made for someone. Downloaded by you.</h2>
                <label>
                  Invitation recipient
                  <select
                    disabled={busy}
                    value={selected?.id ?? ""}
                    onChange={(e) => setSelectedId(e.target.value)}
                  >
                    {data.guests.map((g) => (
                      <option value={g.id} key={g.id}>
                        {g.name} · {g.relation}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset>
                  <legend className="mb-3 text-sm font-semibold">Invitation design</legend>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        ["maroon", "Maroon & gold", "#4b1427"],
                        ["floral", "Soft floral", "#f8eee6"],
                        ["royal", "Royal blue", "#172a40"],
                        ["minimal", "Warm ivory", "#fcf6e9"],
                      ] as const
                    ).map(([id, label, color]) => (
                      <button
                        type="button"
                        key={id}
                        disabled={busy}
                        aria-pressed={data.template === id}
                        className={`flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left text-sm ${data.template === id ? "ring-2 ring-maroon" : ""}`}
                        onClick={() => update({ ...data, template: id })}
                      >
                        <span
                          className="h-8 w-8 shrink-0 rounded-full border border-gold"
                          style={{ background: color }}
                        />
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="workspace-note">
                  Audio: <strong>{audio?.name ?? "Not selected"}</strong>. Text is personalised for
                  the selected guest. The audio is the unchanged selected recording; it will not
                  automatically speak a new name.
                </div>
                <p className="text-xs text-muted-foreground">
                  Creates a genuine video locally using your browser’s encoder. MP4 is selected when
                  supported; otherwise you get a WebM file that plays in Chrome/Edge. Keep this tab
                  visible. The finished video lasts as long as your recording, with its original
                  sound.
                </p>
                {audio && audioUrl && (
                  <div className="space-y-3 rounded-xl border p-4">
                    <p className="text-sm font-semibold">
                      {audio.kind === "video"
                        ? "Camera video + recorded voice"
                        : "Recorded narration"}{" "}
                      for {selected?.name}
                    </p>
                    {audio.kind === "video" ? (
                      <video
                        controls
                        playsInline
                        src={audioUrl}
                        className="aspect-video w-full rounded-lg bg-black"
                        aria-label="Recording used for final video"
                      />
                    ) : (
                      <audio
                        controls
                        src={audioUrl}
                        className="w-full"
                        aria-label="Recording used for final video"
                      />
                    )}
                    <p className="text-xs">
                      This exact recording will be embedded in the download.
                      {audio.kind === "video"
                        ? " Your camera footage appears inside the invitation frame."
                        : " The invitation design plays with your recorded voice."}
                    </p>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={consent}
                        disabled={busy}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      I have permission to include this recording in the final video.
                    </label>
                  </div>
                )}
                {blockReason && (
                  <div className="space-y-3" role="status">
                    <p className="text-sm text-destructive">{blockReason}</p>
                    <button
                      className="workspace-secondary"
                      onClick={() =>
                        setStep(mediaStale || !audio ? 3 : !selected?.approved ? 2 : 3)
                      }
                    >
                      {mediaStale || !audio
                        ? "Go to this guest’s recording"
                        : !selected?.approved
                          ? "Review this guest’s script"
                          : "Review recording permission"}
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    className="workspace-primary"
                    disabled={busy || !!blockReason}
                    onClick={() => void generate()}
                  >
                    <Play size={16} />
                    {busy ? "Rendering your video…" : "Generate downloadable video"}
                  </button>
                  {busy && (
                    <button
                      className="workspace-secondary"
                      onClick={() => controller.current?.abort()}
                    >
                      Cancel rendering
                    </button>
                  )}
                </div>
                {busy && (
                  <div role="status">
                    <progress className="h-3 w-full accent-maroon" max={1} value={progress} />
                    <p className="mt-2 text-xs">
                      {Math.round(progress * 100)}% · actual browser rendering, no provider queue
                    </p>
                  </div>
                )}
              </div>
              {result && videoUrl && consent && (
                <div className="workspace-card space-y-4">
                  <h3 className="text-2xl">Your generated invitation</h3>
                  <video
                    controls
                    playsInline
                    className="mx-auto max-h-[560px] w-full rounded-xl bg-black"
                    src={videoUrl}
                    aria-label="Generated personal invitation video"
                  />
                  <p className="text-xs">
                    {result.extension.toUpperCase()} · {Math.round(result.duration)}s ·{" "}
                    {(result.blob.size / 1_000_000).toFixed(1)} MB · generated just now in this
                    browser
                  </p>
                  <a
                    className="workspace-primary"
                    href={videoUrl}
                    download={`Nimantran-${selected?.name.replace(/[^\p{L}\p{N}_-]/gu, "-") ?? "invitation"}.${result.extension}`}
                  >
                    <Download size={17} />
                    Download generated video
                  </a>
                  <p className="text-xs text-muted-foreground">
                    Download before leaving this page. Generating another guest’s video replaces
                    this in-memory preview, not your downloaded files.
                  </p>
                </div>
              )}
              <div className="workspace-card space-y-3">
                <h3 className="text-2xl">For the submission</h3>
                <p className="text-sm leading-6">
                  Demonstrate wedding edits, guest selection, local script creation, selected guest
                  approval, actual recording or labelled example audio, then render and download. No
                  sign-in, Supabase, paid provider or WhatsApp is required for this path.
                </p>
                <p className="text-sm leading-6">
                  To automatically speak different guest names in a cloned family voice, the
                  production app still needs ElevenLabs credentials, speaker verification and
                  consent, private storage and a verified generation pipeline. Those services are
                  not being simulated here.
                </p>
              </div>
            </div>
            <aside>
              <div className="workspace-card sticky top-4">
                <p className="mb-3 text-xs text-muted-foreground">
                  Live visual preview ·{" "}
                  {busy ? "recording this canvas" : "not a pre-rendered video"}
                </p>
                <canvas
                  ref={canvas}
                  width={540}
                  height={960}
                  className="aspect-[9/16] w-full rounded-xl"
                  aria-label="Personalised invitation design preview"
                />
                {!selected && <p>Add a guest to preview.</p>}
              </div>
            </aside>
          </div>
        )}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-xs text-muted-foreground">
          <a
            href={
              standalone
                ? "https://github.com/kushalsethia2027-lgtm/shubhnimantran/tree/nimantran-mvp"
                : "/"
            }
            className="inline-flex min-h-11 items-center gap-2"
          >
            <ArrowLeft size={14} />
            {standalone ? "Project source" : "Back to homepage"}
          </a>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck size={15} />
            No external messages or provider charges
          </span>
        </footer>
      </main>
    </div>
  );
}
