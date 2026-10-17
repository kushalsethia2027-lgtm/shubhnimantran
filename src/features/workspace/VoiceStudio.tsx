import { useEffect, useRef, useState } from "react";
import { api } from "./client";
import { consentText, privacyPromise, type Workspace } from "./domain";
export function VoiceStudio({ data, reload }: { data: Workspace; reload: () => Promise<void> }) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const started = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!blob) {
      setUrl("");
      return;
    }
    const href = URL.createObjectURL(blob);
    setUrl(href);
    return () => URL.revokeObjectURL(href);
  }, [blob]);
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      if (recorder.current?.state === "recording") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  const stop = () => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  };
  const start = async () => {
    setError("");
    setMessage("");
    setBlob(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")
        throw new Error(
          "Recording requires a supported browser and HTTPS (or localhost). Try current Chrome, Edge or Safari.",
        );
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find((v) =>
        MediaRecorder.isTypeSupported(v),
      );
      if (!mime) {
        stream.current.getTracks().forEach((t) => t.stop());
        throw new Error("This browser cannot record a supported audio format.");
      }
      const active = new MediaRecorder(stream.current, { mimeType: mime });
      recorder.current = active;
      chunks.current = [];
      setDuration(0);
      started.current = performance.now();
      active.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      active.onerror = () => {
        setError("Recording failed. Please try again.");
        stop();
      };
      active.onstop = () => {
        if (timer.current) clearInterval(timer.current);
        setRecording(false);
        stream.current?.getTracks().forEach((t) => t.stop());
        const seconds = Math.min(60, Math.round((performance.now() - started.current) / 1000));
        setDuration(seconds);
        setBlob(new Blob(chunks.current, { type: mime }));
      };
      active.start(250);
      setRecording(true);
      timer.current = setInterval(() => {
        const seconds = Math.floor((performance.now() - started.current) / 1000);
        setDuration(Math.min(60, seconds));
        if (seconds >= 60) stop();
      }, 200);
    } catch (e) {
      setError(
        (e as Error).name === "NotAllowedError"
          ? "Microphone permission was denied. Allow access in your browser settings, then retry."
          : (e as Error).message,
      );
    }
  };
  const base = `/weddings/${data.wedding.id}/voices`;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="workspace-title">A familiar voice. A personal invitation.</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Record as the actual speaker, in a quiet room. A recording does not authorise cloning by
          itself.
        </p>
      </div>
      <p className="workspace-note">{privacyPromise}</p>
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
      <div className="workspace-card space-y-4">
        <h3 className="text-2xl">Suggested Hindi / Hinglish recording</h3>
        <p lang="hi" className="leading-8">
          नमस्ते! मैं [अपना नाम] हूँ। मैं अपनी आवाज़ का उपयोग केवल [जोड़े के नाम] की शादी के
          निमंत्रण बनाने के लिए सहमति देता/देती हूँ। हमारे परिवार की इस खुशी में आपका साथ और
          आशीर्वाद बहुत मायने रखता है। आप ज़रूर आइए।
        </p>
        <p className="text-sm text-muted-foreground">
          Speak naturally for 30–60 seconds. Include your name, the couple’s names, and the consent
          statement. The checkbox below is also required.
        </p>
        <div className="rounded-xl bg-maroon p-6 text-center text-cream">
          <p className="font-display text-5xl" role="timer" aria-label={`${duration} seconds`}>
            0:{String(duration).padStart(2, "0")}
          </p>
          <progress className="mt-3 h-2 w-full max-w-sm accent-gold" max={60} value={duration} />
          <p className="my-3 text-xs text-champagne">
            {recording
              ? "Recording · stops at 60 seconds"
              : "30–60 seconds · no voice cloning at this step"}
          </p>
          <button
            className="workspace-secondary"
            type="button"
            disabled={busy}
            onClick={() => (recording ? stop() : void start())}
          >
            {recording ? "Stop recording" : blob ? "Record again" : "Start recording"}
          </button>
        </div>
        {url && (
          <div className="space-y-3">
            <audio controls className="w-full" src={url} aria-label="Your recording preview" />
            <button
              className="workspace-secondary"
              disabled={busy}
              onClick={() => {
                setBlob(null);
                setDuration(0);
              }}
            >
              Discard local recording
            </button>
            {duration < 30 && (
              <p className="text-sm text-destructive">
                This recording is too short. Please record at least 30 seconds.
              </p>
            )}
          </div>
        )}
      </div>
      <form
        className="workspace-card workspace-form space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!blob || duration < 30) return;
          setBusy(true);
          setError("");
          try {
            const form = new FormData(e.currentTarget);
            form.set("recording", blob, "recording");
            form.set("duration", String(duration));
            form.set("consent", "true");
            await api(base, "POST", form);
            setBlob(null);
            setDuration(0);
            setMessage(
              "Recording and consent saved. Provider consent verification is still required before any voice generation.",
            );
            await reload();
          } catch (ex) {
            setError((ex as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3 className="text-2xl">Speaker’s informed consent</h3>
        <label>
          Speaker’s full name
          <input name="speaker" required maxLength={100} />
        </label>
        <label>
          Relationship
          <select name="relationship">
            <option>Dadi</option>
            <option>Papa</option>
            <option>Mummy</option>
            <option>Bride</option>
            <option>Groom</option>
            <option>Other</option>
          </select>
        </label>
        <p className="text-sm leading-6">{consentText}</p>
        <label className="check">
          <input type="checkbox" required disabled={!blob || recording} />I am the actual speaker, I
          understand this explanation, and I agree.
        </label>
        <button
          className="workspace-primary"
          disabled={!blob || duration < 30 || recording || busy}
        >
          {busy ? "Saving securely…" : "Save recording & consent"}
        </button>
        <p className="text-xs text-muted-foreground">
          Consent version 2026-10-v1. Timestamp and wedding association are recorded. Provider
          verification is separate and unavailable until configured.
        </p>
      </form>
      <div className="workspace-card space-y-4">
        <h3 className="text-2xl">Your saved voices</h3>
        {!data.voices.length && (
          <p className="text-sm text-muted-foreground">No saved recordings yet.</p>
        )}
        {data.voices.map((v) => (
          <div className="space-y-3 rounded-xl border p-4" key={v.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {v.speaker} · {v.relationship}
              </p>
              <span className="workspace-badge">
                {v.consent_status} · {v.status}
              </span>
            </div>
            <p className="text-xs">
              {v.duration}s ·{" "}
              {v.provider_verified ? "Provider verified" : "Awaiting provider verification"}
            </p>
            {v.status !== "deleted" && (
              <div className="flex flex-wrap gap-2">
                <button
                  className="workspace-secondary"
                  disabled={busy || v.status !== "stored"}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const result = await api<{ url: string }>(`${base}/${v.id}`);
                      setUrl(result.url);
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Play saved recording
                </button>
                <button
                  className="workspace-secondary"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        "Revoke consent and request deletion? New generations and queued deliveries will be blocked immediately.",
                      )
                    )
                      return;
                    setBusy(true);
                    setError("");
                    try {
                      const result = await api<{ message: string }>(`${base}/${v.id}`, "DELETE");
                      setMessage(result.message);
                      setUrl("");
                      await reload();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Revoke & request deletion
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
