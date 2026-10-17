import type { DemoData, DemoGuest } from "./model";
export const palettes = {
  maroon: { bg: "#4b1427", ink: "#fff6e5", gold: "#d7b56d" },
  floral: { bg: "#f8eee6", ink: "#67283d", gold: "#aa7e45" },
  royal: { bg: "#172a40", ink: "#fff5df", gold: "#d9b76b" },
  minimal: { bg: "#fcf6e9", ink: "#44332b", gold: "#8b6a3d" },
};
export function linesFor(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const result: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (ctx.measureText(`${line} ${word}`).width > width && line) {
      result.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) result.push(line);
  return result;
}
function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  max: number,
  size: number,
  family = "Georgia, serif",
) {
  let s = size;
  while (s > 16) {
    ctx.font = `${s}px ${family}`;
    if (ctx.measureText(text).width <= max) break;
    s -= 2;
  }
  return s;
}
export function drawInvitation(
  canvas: HTMLCanvasElement,
  data: DemoData,
  guest: DemoGuest,
  progress = 0,
  camera?: HTMLVideoElement,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const p = palettes[data.template];
  const W = 540,
    H = 960;
  canvas.width = W;
  canvas.height = H;
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, W - 44, H - 44);
  ctx.lineWidth = 0.6;
  ctx.strokeRect(31, 31, W - 62, H - 62);
  // Restrained rangoli-inspired geometry, drawn locally without remote imagery.
  ctx.save();
  ctx.translate(270, 110);
  ctx.strokeStyle = p.gold;
  ctx.globalAlpha = 0.7;
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.beginPath();
    ctx.ellipse(0, 22, 9, 26, 0, 0, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.restore();
  ctx.textAlign = "center";
  ctx.fillStyle = p.gold;
  ctx.font = "14px Arial, sans-serif";
  ctx.fillText("N I M A N T R A N", 270, 198);
  ctx.fillStyle = p.ink;
  fit(ctx, data.bride, 420, 58);
  ctx.fillText(data.bride, 270, 278);
  ctx.fillStyle = p.gold;
  ctx.font = "italic 31px Georgia, serif";
  ctx.fillText("&", 270, 321);
  ctx.fillStyle = p.ink;
  fit(ctx, data.groom, 420, 58);
  ctx.fillText(data.groom, 270, 382);
  ctx.strokeStyle = p.gold;
  ctx.beginPath();
  ctx.moveTo(164, 412);
  ctx.lineTo(376, 412);
  ctx.stroke();
  ctx.fillStyle = p.gold;
  ctx.font = "18px Arial, sans-serif";
  ctx.fillText("A PERSONAL INVITATION FOR", 270, 454);
  ctx.fillStyle = p.ink;
  fit(ctx, guest.name, 420, 38);
  ctx.fillText(guest.name, 270, 505);
  ctx.fillStyle = p.gold;
  fit(ctx, guest.relation, 420, 24, "Arial, sans-serif");
  ctx.fillText(guest.relation, 270, 541);
  const events = data.events.filter((e) => guest.events.includes(e.id));
  ctx.fillStyle = p.ink;
  if (camera && camera.readyState >= 2) {
    const x = 65,
      y = 566,
      w = 410,
      h = 234;
    ctx.fillStyle = "#0e0c0b";
    ctx.fillRect(x, y, w, h);
    const scale = Math.min(w / camera.videoWidth, h / camera.videoHeight);
    const width = camera.videoWidth * scale,
      height = camera.videoHeight * scale;
    ctx.drawImage(camera, x + (w - width) / 2, y + (h - height) / 2, width, height);
    ctx.strokeStyle = p.gold;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    const event = events[Math.min(events.length - 1, Math.floor(progress * events.length))];
    if (event) {
      ctx.fillStyle = p.ink;
      ctx.font = "19px Arial, 'Nirmala UI', sans-serif";
      let y = 834;
      for (const line of linesFor(ctx, `${event.name} · ${event.date}`, 420).slice(0, 2)) {
        ctx.fillText(line, 270, y);
        y += 24;
      }
      ctx.font = "16px Arial, 'Nirmala UI', sans-serif";
      for (const line of linesFor(ctx, event.venue, 420).slice(0, 2)) {
        ctx.fillText(line, 270, y);
        y += 21;
      }
    }
  } else if (progress < 0.35) {
    ctx.font = "25px Georgia, serif";
    ctx.fillText("Your presence is our blessing", 270, 610);
    ctx.font = "18px Arial, sans-serif";
    let y = 642;
    const pages = Math.max(1, Math.ceil(events.length / 2));
    const index = Math.min(pages - 1, Math.floor((progress / 0.35) * pages));
    for (const e of events.slice(index * 2, index * 2 + 2)) {
      for (const line of linesFor(ctx, `${e.name} · ${e.date}`, 420).slice(0, 2)) {
        ctx.fillText(line, 270, y);
        y += 27;
      }
      for (const line of linesFor(ctx, e.venue, 420).slice(0, 2)) {
        ctx.fillText(line, 270, y);
        y += 24;
      }
      y += 12;
    }
  } else {
    ctx.font = "21px Arial, 'Nirmala UI', sans-serif";
    const lines = linesFor(ctx, guest.script, 416);
    const pages = Math.max(1, Math.ceil(lines.length / 9));
    const index = Math.min(pages - 1, Math.floor(((progress - 0.35) / 0.65) * pages));
    let y = 603;
    for (const line of lines.slice(index * 9, index * 9 + 9)) {
      ctx.fillText(line, 270, y);
      y += 29;
    }
  }
  ctx.fillStyle = p.gold;
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("With love, from our family to yours", 270, 911);
}
export type RenderResult = { blob: Blob; extension: "mp4" | "webm"; duration: number };
export async function renderInvitation({
  canvas,
  data,
  guest,
  audio,
  cameraClip,
  signal,
  onProgress,
}: {
  canvas: HTMLCanvasElement;
  data: DemoData;
  guest: DemoGuest;
  audio: ArrayBuffer;
  cameraClip?: Blob;
  signal: AbortSignal;
  onProgress: (value: number) => void;
}): Promise<RenderResult> {
  if (typeof MediaRecorder === "undefined" || !canvas.captureStream)
    throw new Error("Video export requires a current desktop Chrome or Edge browser.");
  const context = new AudioContext();
  let stream: MediaStream | undefined;
  let recorder: MediaRecorder | undefined;
  let frame = 0;
  let source: AudioBufferSourceNode | undefined;
  let camera: HTMLVideoElement | undefined;
  let cameraUrl: string | undefined;
  try {
    // Resume inside the user-initiated click before decoding to satisfy autoplay rules.
    await context.resume();
    const buffer = await context.decodeAudioData(audio.slice(0));
    if (buffer.duration < 1 || buffer.duration > 65)
      throw new Error("Use an audio recording between 1 and 65 seconds.");
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    if (cameraClip) {
      camera = document.createElement("video");
      camera.muted = true;
      camera.playsInline = true;
      camera.preload = "auto";
      cameraUrl = URL.createObjectURL(cameraClip);
      const clip = camera;
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => finish(new Error("Camera recording could not be loaded. Re-record and retry.")),
          15000,
        );
        const abort = () => finish(new DOMException("Rendering cancelled.", "AbortError"));
        const finish = (error?: Error) => {
          clearTimeout(timeout);
          signal.removeEventListener("abort", abort);
          clip.onloadeddata = null;
          clip.onerror = null;
          if (error) reject(error);
          else resolve();
        };
        clip.onloadeddata = () => finish();
        clip.onerror = () => finish(new Error("This browser cannot decode the camera recording."));
        signal.addEventListener("abort", abort, { once: true });
        clip.src = cameraUrl!;
        clip.load();
      });
      if (signal.aborted) throw new DOMException("Rendering cancelled.", "AbortError");
    }
    const duration = buffer.duration;
    const destination = context.createMediaStreamDestination();
    source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(destination);
    drawInvitation(canvas, data, guest, 0, camera);
    const videoStream = canvas.captureStream(24);
    stream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...destination.stream.getAudioTracks(),
    ]);
    const choices = [
      "video/mp4;codecs=avc1.42001E,mp4a.40.2",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    for (const type of choices) {
      if (!MediaRecorder.isTypeSupported(type)) continue;
      try {
        recorder = new MediaRecorder(stream, {
          mimeType: type,
          videoBitsPerSecond: 1_800_000,
          audioBitsPerSecond: 128_000,
        });
        break;
      } catch {
        /* Try the next supported codec, never substitute a pre-rendered video. */
      }
    }
    if (!recorder)
      throw new Error(
        "This browser cannot encode a downloadable video. Try current Chrome or Edge.",
      );
    const active = recorder;
    const chunks: Blob[] = [];
    if (camera) await camera.play();
    if (signal.aborted) throw new DOMException("Rendering cancelled.", "AbortError");
    const result = new Promise<RenderResult>((resolve, reject) => {
      let done = false;
      const abort = () => {
        if (done) return;
        done = true;
        cancelAnimationFrame(frame);
        if (active.state !== "inactive") active.stop();
        reject(new DOMException("Rendering cancelled. No video was saved.", "AbortError"));
      };
      signal.addEventListener("abort", abort, { once: true });
      active.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      active.onerror = () => {
        if (done) return;
        done = true;
        signal.removeEventListener("abort", abort);
        reject(new Error("Browser video encoding failed. Your draft is preserved."));
      };
      active.onstop = () => {
        signal.removeEventListener("abort", abort);
        if (done) return;
        done = true;
        const blob = new Blob(chunks, { type: active.mimeType });
        if (!blob.size) {
          reject(new Error("The browser returned an empty video. Please retry."));
          return;
        }
        onProgress(1);
        resolve({ blob, extension: active.mimeType.includes("mp4") ? "mp4" : "webm", duration });
      };
    });
    active.start(250);
    source.start();
    const started = performance.now();
    const tick = () => {
      if (signal.aborted) return;
      const progress = Math.min((performance.now() - started) / (duration * 1000), 1);
      drawInvitation(canvas, data, guest, progress, camera);
      onProgress(progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else if (active.state !== "inactive") active.stop();
    };
    frame = requestAnimationFrame(tick);
    return await result;
  } finally {
    cancelAnimationFrame(frame);
    try {
      source?.stop();
    } catch {
      /* Already stopped. */
    }
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stream?.getTracks().forEach((track) => track.stop());
    if (camera) {
      camera.pause();
      camera.removeAttribute("src");
      camera.load();
    }
    if (cameraUrl) URL.revokeObjectURL(cameraUrl);
    await context.close();
  }
}
