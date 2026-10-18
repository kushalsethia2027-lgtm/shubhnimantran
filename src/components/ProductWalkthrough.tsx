import { useRef, useState } from "react";
import walkthroughVideo from "@/assets/nimantran-walkthrough.mp4";
import walkthroughPoster from "@/assets/nimantran-walkthrough-poster.jpg";
import walkthroughCaptions from "@/assets/nimantran-walkthrough.vtt?url";
const chapters = [
  ["Wedding details", 0],
  ["Record a message", 7],
  ["Preview & download", 14],
  ["Families & RSVPs", 21],
  ["Arrivals", 28],
  ["Pickups & hotels", 35],
] as const;
export function ProductWalkthrough() {
  const player = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  return (
    <div className="relative mx-auto max-w-5xl space-y-4">
      <video
        ref={player}
        controls
        playsInline
        preload="metadata"
        poster={walkthroughPoster}
        src={walkthroughVideo}
        className="aspect-[16/10] w-full rounded-2xl border border-gold/60 bg-maroon shadow-xl"
        aria-label="Nimantran product walkthrough: invitations, guests and travel planning"
        onTimeUpdate={() =>
          setActive(Math.min(5, Math.floor((player.current?.currentTime ?? 0) / 7)))
        }
        onError={() =>
          setError(
            "The walkthrough could not load. Please reload the page or download the video below.",
          )
        }
      >
        <track kind="captions" src={walkthroughCaptions} srcLang="en" label="English guide" />
        Your browser does not support video playback.
      </video>
      <div
        aria-label="Walkthrough chapters"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
      >
        {chapters.map(([name, time], i) => (
          <button
            type="button"
            key={name}
            aria-pressed={active === i}
            className={
              "min-h-14 rounded-xl border px-3 py-2 text-left text-xs transition " +
              (active === i
                ? "border-gold bg-champagne text-maroon"
                : "border-gold/50 bg-white/5 text-cream hover:bg-white/10")
            }
            onClick={async () => {
              const video = player.current;
              if (!video) return;
              setError("");
              video.currentTime = time;
              setActive(i);
              try {
                await video.play();
              } catch {
                setError("Press Play on the video to continue from the selected chapter.");
              }
            }}
          >
            <span className="mb-1 block text-[10px] opacity-60">
              0:{String(time).padStart(2, "0")}
            </span>
            {name}
          </button>
        ))}
      </div>
      <p className="text-center text-xs leading-6 text-champagne/80">
        42-second guided walkthrough · music and on-screen guidance · illustrative sample data.
        <br />
        Choose a chapter to jump to the part you want to explore.
      </p>
      {error && (
        <p role="status" className="text-center text-sm text-cream">
          {error}{" "}
          <a
            className="underline"
            href={walkthroughVideo}
            download="Nimantran-product-walkthrough.mp4"
          >
            Download walkthrough
          </a>
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <a
          className="rounded-full border border-gold/70 px-5 py-3 text-xs font-semibold text-champagne"
          href="/demo/"
        >
          Create an invitation
        </a>
        <a
          className="foil-fill rounded-full px-5 py-3 text-xs font-semibold text-maroon"
          href="/planner/"
        >
          Open Guest & Travel Planner
        </a>
      </div>
    </div>
  );
}
