import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
export type CameraTake = { blob: Blob; audioBlob: Blob };
export function CameraRecorder({
  disabled,
  onActivity,
  onRecorded,
  onError,
}: {
  disabled: boolean;
  onActivity: (value: boolean) => void;
  onRecorded: (take: CameraTake) => void;
  onError: (message: string) => void;
}) {
  const [status, setStatus] = useState<"idle" | "starting" | "preview" | "recording" | "saving">(
    "idle",
  );
  const [seconds, setSeconds] = useState(0);
  const live = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorders = useRef<MediaRecorder[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const discarded = useRef(false);
  const mounted = useRef(true);
  const closeStream = () => {
    if (timer.current) clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    if (live.current) live.current.srcObject = null;
    stream.current = null;
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      discarded.current = true;
      if (timer.current) clearInterval(timer.current);
      for (const r of recorders.current) if (r.state !== "inactive") r.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(() => {
    if (status === "preview" && live.current && stream.current) {
      live.current.srcObject = stream.current;
      void live.current.play().catch(() => {});
    }
  }, [status]);
  const stop = () => {
    if (status !== "recording") return;
    setStatus("saving");
    if (timer.current) clearInterval(timer.current);
    recorders.current.forEach((r) => {
      if (r.state !== "inactive") r.stop();
    });
  };
  const cancel = () => {
    discarded.current = true;
    for (const r of recorders.current) if (r.state !== "inactive") r.stop();
    closeStream();
    setStatus("idle");
    onActivity(false);
  };
  const enable = async () => {
    onError("");
    setStatus("starting");
    onActivity(true);
    discarded.current = false;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")
        throw new Error("Camera recording requires current Chrome/Edge on localhost or HTTPS.");
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: true,
      });
      if (!mounted.current || discarded.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      setStatus("preview");
    } catch (e) {
      closeStream();
      setStatus("idle");
      onActivity(false);
      onError(
        (e as Error).name === "NotAllowedError"
          ? "Camera/microphone permission was denied. Allow both in browser settings, or use audio-only recording."
          : (e as Error).message,
      );
    }
  };
  const start = () => {
    const media = stream.current;
    if (!media) return;
    try {
      const videoMime = [
        "video/mp4;codecs=avc1.42001E,mp4a.40.2",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      const audioMime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      if (!videoMime || !audioMime)
        throw new Error("Camera encoding is not supported. Try current Chrome or Edge.");
      const videoRecorder = new MediaRecorder(media, {
        mimeType: videoMime,
        videoBitsPerSecond: 2_000_000,
      });
      const audioRecorder = new MediaRecorder(new MediaStream(media.getAudioTracks()), {
        mimeType: audioMime,
      });
      recorders.current = [videoRecorder, audioRecorder];
      // Keep a separate audio track for reliable browser decoding when composing the
      // branded invitation. The original camera clip also contains its own audio.
      const capture = (recorder: MediaRecorder, type: string) =>
        new Promise<Blob>((resolve, reject) => {
          const chunks: Blob[] = [];
          recorder.ondataavailable = (e) => {
            if (e.data.size) chunks.push(e.data);
          };
          recorder.onstop = () => resolve(new Blob(chunks, { type }));
          recorder.onerror = () => reject(new Error("Camera recording failed. Please re-record."));
        });
      const finished = Promise.all([
        capture(videoRecorder, videoMime),
        capture(audioRecorder, audioMime),
      ]);
      const began = performance.now();
      setSeconds(0);
      discarded.current = false;
      void finished
        .then(([blob, audioBlob]) => {
          const duration = (performance.now() - began) / 1000;
          closeStream();
          if (!mounted.current) return;
          setStatus("idle");
          onActivity(false);
          if (discarded.current) return;
          if (duration < 3 || !blob.size || !audioBlob.size) {
            onError(
              "Record at least 3 seconds. A complete personal invitation is usually 30–60 seconds.",
            );
            return;
          }
          onRecorded({ blob, audioBlob });
        })
        .catch((e) => {
          discarded.current = true;
          for (const r of recorders.current) if (r.state !== "inactive") r.stop();
          closeStream();
          if (mounted.current) {
            setStatus("idle");
            onActivity(false);
            onError((e as Error).message);
          }
        });
      videoRecorder.start(250);
      audioRecorder.start(250);
      setStatus("recording");
      timer.current = setInterval(() => {
        const elapsed = Math.floor((performance.now() - began) / 1000);
        setSeconds(Math.min(elapsed, 60));
        if (elapsed >= 60) {
          setStatus("saving");
          if (timer.current) clearInterval(timer.current);
          recorders.current.forEach((r) => {
            if (r.state !== "inactive") r.stop();
          });
        }
      }, 200);
    } catch (e) {
      cancel();
      onError((e as Error).message);
    }
  };
  return (
    <div className="rounded-xl border border-gold/60 bg-card p-4 text-ink">
      <h3 className="flex items-center gap-2 text-2xl text-maroon">
        <Camera size={21} />
        Record a personal video
      </h3>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">
        Speak the selected guest’s script on camera. Your face and real voice will appear together
        in their invitation. Camera and microphone stay local.
      </p>
      {status === "idle" ? (
        <button
          type="button"
          className="workspace-secondary mt-3"
          disabled={disabled}
          onClick={() => void enable()}
        >
          Enable camera & microphone
        </button>
      ) : (
        <div className="mt-3 space-y-3">
          {status !== "starting" && (
            <video
              ref={live}
              autoPlay
              muted
              playsInline
              className="aspect-video w-full rounded-lg bg-black object-contain"
              aria-label="Live camera preview"
            />
          )}
          <p
            role="timer"
            aria-label="Video recording duration"
            className="text-center font-display text-3xl"
          >
            0:{String(seconds).padStart(2, "0")}
          </p>
          <div className="flex flex-wrap gap-2">
            {status === "preview" && (
              <button className="workspace-primary" onClick={start}>
                Start video recording
              </button>
            )}
            {status === "recording" && (
              <button className="workspace-primary" onClick={stop}>
                Stop video recording
              </button>
            )}
            {status === "starting" && (
              <p role="status" className="text-sm">
                Waiting for camera permission…
              </p>
            )}
            {status === "saving" && (
              <p role="status" className="text-sm">
                Preparing your camera recording…
              </p>
            )}
            <button type="button" className="workspace-secondary" onClick={cancel}>
              Cancel camera
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
