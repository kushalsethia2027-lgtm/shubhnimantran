// Deterministic, original video graphics and soundtrack. Uses only synthetic test captures.
// First capture the UI with WALKTHROUGH_CAPTURE_DIR; see docs/PRODUCT-WALKTHROUGH.md.
import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
const captureDir = process.env.WALKTHROUGH_CAPTURE_DIR ?? "/tmp/nimantran-tour-captures";
const out = resolve("src/assets/nimantran-walkthrough.mp4");
const poster = resolve("src/assets/nimantran-walkthrough-poster.jpg");
const scenes = [
  {
    file: "01-wedding",
    number: "01",
    title: "Start with your\ncelebration.",
    detail: "Add the couple’s names,\nevents, dates and venues.",
    caption: "One wedding. All the details that matter.",
    target: [0.64, 0.43],
  },
  {
    file: "02-record",
    number: "02",
    title: "Make it sound\nlike family.",
    detail: "Read your guest’s script.\nRecord your voice or video.",
    caption: "Use a real recording, with the speaker’s permission.",
    target: [0.29, 0.58],
  },
  {
    file: "03-download",
    number: "03",
    title: "An invitation\nworth keeping.",
    detail: "Preview your creation,\nthen download the video.",
    caption: "Your message becomes a personal video invitation.",
    target: [0.42, 0.57],
  },
  {
    file: "04-families",
    number: "04",
    title: "Bring both\nfamilies together.",
    detail: "Add family members.\nTrack each person’s RSVP.",
    caption: "Bride-side and groom-side planners share one workspace.",
    target: [0.58, 0.49],
  },
  {
    file: "05-arrivals",
    number: "05",
    title: "Know who’s\narriving when.",
    detail: "See separate travel groups,\narrival times and pickup needs.",
    caption: "Different trains. Different flights. One clear plan.",
    target: [0.62, 0.42],
  },
  {
    file: "06-logistics",
    number: "06",
    title: "A thoughtful\nwelcome, planned.",
    detail: "Coordinate pickups,\nvehicles, hotels and rooms.",
    caption: "Planners choose the details. Nothing is auto-assigned.",
    target: [0.48, 0.55],
  },
];
const images = await Promise.all(
  scenes.map(
    async (s) =>
      "data:image/png;base64," +
      (await readFile(join(captureDir, s.file + ".png"))).toString("base64"),
  ),
);
// Original gentle instrumental: synthesized chord pads and bell notes, no external music.
const duration = 42,
  rate = 44100;
const samples = duration * rate;
const wav = Buffer.alloc(44 + samples * 4);
wav.write("RIFF", 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 4, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(samples * 4, 40);
const chords = [
  [220, 261.63, 329.63],
  [174.61, 220, 261.63],
  [130.81, 196, 261.63],
  [196, 246.94, 293.66],
  [220, 261.63, 329.63],
  [174.61, 220, 261.63],
];
for (let i = 0; i < samples; i++) {
  const t = i / rate,
    index = Math.min(5, Math.floor(t / 7)),
    local = t % 7;
  const chord = chords[index];
  const fade = Math.min(t / 2, (42 - t) / 2, 1);
  const envelope = Math.sin((Math.PI * local) / 7) ** 0.5;
  let v = chord.reduce((n, f) => n + Math.sin(2 * Math.PI * f * t) * 0.018, 0) * envelope;
  const phase = t % 0.875,
    note = chord[Math.floor(t / 0.875) % 3] * 2;
  v +=
    (Math.sin(2 * Math.PI * note * phase) + 0.25 * Math.sin(2 * Math.PI * note * 2 * phase)) *
    0.04 *
    Math.exp(-phase * 5) *
    Math.min(phase * 60, 1);
  const sample = Math.round(Math.max(-1, Math.min(1, v * fade)) * 32767);
  wav.writeInt16LE(sample, 44 + i * 4);
  wav.writeInt16LE(sample, 46 + i * 4);
}
await writeFile("/tmp/nimantran-tour-music.wav", wav);
const ffmpeg = spawn(
  "ffmpeg",
  [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "image2pipe",
    "-vcodec",
    "mjpeg",
    "-framerate",
    "24",
    "-i",
    "pipe:0",
    "-i",
    "/tmp/nimantran-tour-music.wav",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "21",
    "-pix_fmt",
    "yuv420p",
    "-af",
    "volume=4",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    "-t",
    "42",
    out,
  ],
  { stdio: ["pipe", "inherit", "inherit"] },
);
let encoderError;
ffmpeg.on("error", (e) => {
  encoderError = e;
});
const encoded = once(ffmpeg, "close");
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.setContent(
    '<html><body style="margin:0"><canvas id="tour" width="1280" height="800"></canvas></body></html>',
  );
  await page.evaluate(
    async ({ images, scenes }) => {
      const loaded = await Promise.all(
        images.map(
          (src) =>
            new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.src = src;
            }),
        ),
      );
      const c = document.querySelector("canvas"),
        ctx = c.getContext("2d");
      const round = (x, y, w, h, r, fill) => {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.fillStyle = fill;
        ctx.fill();
      };
      const text = (value, x, y, size, color, font = "Arial", spacing = 1.28) => {
        ctx.fillStyle = color;
        ctx.font = `${size}px ${font}`;
        for (const line of value.split("\n")) {
          ctx.fillText(line, x, y);
          y += size * spacing;
        }
      };
      window.tourFrame = (t) => {
        const index = Math.min(5, Math.floor(t / 7)),
          local = t - index * 7,
          scene = scenes[index];
        const ease = Math.min(local / 1.2, 1);
        const appear = 1 - (1 - ease) ** 3;
        ctx.fillStyle = "#fbf2df";
        ctx.fillRect(0, 0, 1280, 800);
        ctx.strokeStyle = "#dfc890";
        ctx.lineWidth = 1;
        ctx.strokeRect(20, 20, 1240, 760);
        text("NIMANTRAN", 45, 65, 20, "#64182e", "Georgia");
        text("THE WEDDING, BEAUTIFULLY TOGETHER", 220, 63, 11, "#94764d");
        round(996, 40, 238, 32, 16, "#efe2c5");
        text("SAMPLE DATA · GUIDED TOUR", 1017, 61, 10, "#714f34");
        ctx.save();
        ctx.globalAlpha = appear;
        const shift = 14 * (1 - appear);
        // Real app screenshot in a browser frame with a restrained slow camera move.
        ctx.shadowColor = "#4b142733";
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 12;
        round(43, 110 + shift, 829, 622, 16, "#fff");
        ctx.shadowColor = "transparent";
        round(43, 110 + shift, 829, 35, 16, "#4b1427");
        ctx.fillStyle = "#4b1427";
        ctx.fillRect(43, 128 + shift, 829, 17);
        ["#dc937d", "#e3bd68", "#a2be97"].forEach((color, i) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(61 + i * 16, 127 + shift, 4, 0, 7);
          ctx.fill();
        });
        text(
          "ni-man-tran.app" + (index < 3 ? "/demo/" : "/planner/"),
          129,
          131 + shift,
          10,
          "#f8ead0",
        );
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(43, 145 + shift, 829, 587, 4);
        ctx.clip();
        const scale = 1 + 0.018 * Math.sin((Math.PI * local) / 7),
          w = 829 * scale,
          h = 587 * scale;
        const imageHeight = (w * loaded[index].height) / loaded[index].width;
        ctx.fillStyle = "#fcf6e9";
        ctx.fillRect(43, 145 + shift, 829, 587);
        ctx.drawImage(
          loaded[index],
          43 - (w - 829) / 2,
          145 + shift + (587 - imageHeight) / 2,
          w,
          imageHeight,
        );
        ctx.restore();
        // Animated focus cursor points at a relevant area without faking a live save.
        const progress = Math.min(Math.max((local - 1) / 2, 0), 1),
          smooth = progress * progress * (3 - 2 * progress);
        const tx = 43 + scene.target[0] * 829,
          ty = 145 + scene.target[1] * 587;
        const x = 90 + (tx - 90) * smooth,
          y = 665 + (ty - 665) * smooth;
        if (local > 1 && local < 5.7) {
          ctx.save();
          ctx.translate(x, y);
          ctx.fillStyle = "#fff";
          ctx.strokeStyle = "#4b1427";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(2, 24);
          ctx.lineTo(8, 18);
          ctx.lineTo(14, 29);
          ctx.lineTo(20, 26);
          ctx.lineTo(14, 16);
          ctx.lineTo(23, 15);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          if (local > 3 && local < 4.4) {
            ctx.strokeStyle = "#bb903d";
            ctx.globalAlpha = 1 - (local - 3) / 1.4;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(tx, ty, 12 + (local - 3) * 25, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = appear;
          }
        }
        round(908, 127, 60, 34, 17, "#4b1427");
        text(scene.number, 927, 151, 18, "#f6e7c5", "Georgia");
        text(scene.title, 908, 218 + shift, 37, "#4b1427", "Georgia", 1.18);
        text(scene.detail, 908, 340 + shift, 17, "#6e6056", "Arial", 1.6);
        ctx.strokeStyle = "#d7bb7d";
        ctx.beginPath();
        ctx.moveTo(908, 428);
        ctx.lineTo(1220, 428);
        ctx.stroke();
        // Caption wraps to preserve reading width.
        let lines = [],
          line = "";
        ctx.font = "18px Arial";
        for (const word of scene.caption.split(" ")) {
          if (ctx.measureText(line + " " + word).width > 300 && line) {
            lines.push(line);
            line = word;
          } else line += (line ? " " : "") + word;
        }
        lines.push(line);
        text(lines.join("\n"), 908, 469 + shift, 18, "#4b1427", "Arial", 1.5);
        text(
          index < 3 ? "YOUR VOICE. YOUR INVITATION." : "TWO FAMILIES. ONE SHARED PLAN.",
          908,
          643,
          10,
          "#9b7c48",
        );
        text("Explore it yourself at", 908, 680, 12, "#7f7162");
        text("ni-man-tran.app", 908, 707, 23, "#4b1427", "Georgia");
        ctx.restore();
        // Six chapter markers make the whole journey understandable without narration.
        for (let j = 0; j < 6; j++) {
          round(45 + j * 139, 752, 126, 4, 2, "#e4d5b4");
          const fill = j < index ? 1 : j === index ? local / 7 : 0;
          if (fill > 0) round(45 + j * 139, 752, 126 * fill, 4, 2, "#a87c2b");
        }
        text(String(Math.floor(t)).padStart(2, "0") + " / 42 seconds", 1110, 758, 11, "#8a7254");
        return c.toDataURL("image/jpeg", 0.91).split(",")[1];
      };
    },
    { images, scenes },
  );
  for (let frame = 0; frame < 42 * 24; frame++) {
    const jpg = Buffer.from(await page.evaluate((t) => window.tourFrame(t), frame / 24), "base64");
    if (frame === 72) await writeFile(poster, jpg);
    if (!ffmpeg.stdin.write(jpg)) await once(ffmpeg.stdin, "drain");
    if (frame % 168 === 0) console.log("Rendered chapter", Math.floor(frame / 168) + 1, "of 6");
  }
  ffmpeg.stdin.end();
  const [code] = await encoded;
  if (encoderError) throw encoderError;
  if (code !== 0) throw new Error("ffmpeg failed: " + code);
  console.log("Wrote", out, "and", poster);
} finally {
  await browser.close();
  if (ffmpeg.exitCode === null) ffmpeg.kill();
}
