import { useState } from "react";
import { Mandala, Toran, Diya } from "./ornaments";

/**
 * Animated "video-style" sample invitation player.
 * Pure CSS/SVG animation — no video file, no credits, always plays.
 */
export function InvitePlayer() {
  const [playing, setPlaying] = useState(true);

  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      {/* Phone frame */}
      <div className="arch relative overflow-hidden border border-gold/60 bg-maroon shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]">
        <div
          className={`relative aspect-[9/16] ${playing ? "" : "[&_*]:[animation-play-state:paused]"}`}
        >
          {/* Rotating mandala backdrop */}
          <Mandala className="player-spin absolute -top-10 left-1/2 h-72 w-72 -translate-x-1/2 text-gold/25" />
          <Toran className="absolute top-0 left-0 h-8 w-full text-gold" />

          {/* Diyas */}
          <Diya className="player-flicker absolute bottom-16 left-6 h-8 w-8 text-gold" />
          <Diya
            className="player-flicker absolute right-6 bottom-16 h-8 w-8 text-gold"
            style={{ animationDelay: "0.7s" }}
          />

          {/* Invitation text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <p className="player-rise label-xs text-champagne/80" style={{ animationDelay: "0.2s" }}>
              Shubh Nimantran
            </p>
            <p
              className="player-rise foil mt-3 font-display text-3xl leading-tight font-semibold"
              style={{ animationDelay: "0.9s" }}
            >
              Aarav weds Meera
            </p>
            <p
              className="player-rise deva mt-4 text-lg text-cream/90"
              style={{ animationDelay: "1.6s" }}
            >
              रविवार, १४ फ़रवरी २०२७
            </p>
            <p
              className="player-rise mt-2 text-sm text-champagne/90"
              style={{ animationDelay: "2.3s" }}
            >
              Sunday, 14 February 2027 · Udaipur
            </p>
            <p
              className="player-rise mt-5 max-w-[210px] text-xs leading-relaxed text-cream/70 italic"
              style={{ animationDelay: "3s" }}
            >
              “Chacha ji, aapke bina rasam adhoori hai — zaroor aaiyega.”
            </p>
          </div>

          {/* WhatsApp-style progress bar */}
          <div className="absolute right-0 bottom-0 left-0 h-1 bg-cream/15">
            <div className="player-progress h-full bg-gold" />
          </div>
        </div>

        {/* Play / pause */}
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause sample invitation" : "Play sample invitation"}
          className="absolute right-3 bottom-4 flex h-10 w-10 items-center justify-center rounded-full border border-gold/70 bg-maroon/80 text-champagne backdrop-blur transition hover:bg-maroon"
        >
          {playing ? (
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
              <rect x="3" y="2" width="3.5" height="12" rx="1" />
              <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M4 2.5v11l9-5.5z" />
            </svg>
          )}
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-champagne/70">
        Sample invitation — yours is recorded in your own voice.
      </p>
    </div>
  );
}
