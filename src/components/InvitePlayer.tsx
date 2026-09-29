import { useEffect, useState } from "react";
import { Mandala, Toran, Diya } from "./ornaments";

const SCRIPT =
  "Shubh Nimantran. Aarav weds Meera. Ravivaar, chaudah February, do hazaar sattaais, Udaipur. Chacha ji, aapke bina rasam adhoori hai. Zaroor aaiyega.";

function speak() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(SCRIPT);
  const voices = synth.getVoices();
  const v =
    voices.find((x) => x.lang === "hi-IN") ?? voices.find((x) => x.lang === "en-IN") ?? null;
  if (v) u.voice = v;
  u.lang = v?.lang ?? "hi-IN";
  u.rate = 0.9;
  synth.speak(u);
}

/** Animated sample invitation with spoken audio (browser voice, no credits). */
export function InvitePlayer() {
  const [playing, setPlaying] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const toggle = () => {
    if (playing) {
      window.speechSynthesis?.cancel();
      setPlaying(false);
    } else {
      setRun((r) => r + 1);
      setPlaying(true);
      speak();
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <div className="arch relative overflow-hidden border border-gold/60 bg-maroon shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]">
        <div
          key={run}
          className={`relative aspect-[9/16] ${playing ? "" : "[&_*]:[animation-play-state:paused]"}`}
        >
          <Mandala className="player-spin absolute -top-10 left-1/2 h-72 w-72 -translate-x-1/2 text-gold/25" />
          <Toran className="absolute top-0 left-0 h-8 w-full text-gold" />
          <Diya className="player-flicker absolute bottom-16 left-6 h-8 w-8 text-gold" />
          <span className="player-flicker absolute right-6 bottom-16 inline-block" style={{ animationDelay: "0.7s" }}>
            <Diya className="h-8 w-8 text-gold" />
          </span>

          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <p className="player-rise label-xs text-champagne/80" style={{ animationDelay: "0.2s" }}>
              Shubh Nimantran
            </p>
            <p className="player-rise foil mt-3 font-display text-3xl leading-tight font-semibold" style={{ animationDelay: "0.9s" }}>
              Aarav weds Meera
            </p>
            <p className="player-rise deva mt-4 text-lg text-cream/90" style={{ animationDelay: "1.6s" }}>
              रविवार, १४ फ़रवरी २०२७
            </p>
            <p className="player-rise mt-2 text-sm text-champagne/90" style={{ animationDelay: "2.3s" }}>
              Sunday, 14 February 2027 · Udaipur
            </p>
            <p className="player-rise mt-5 max-w-[210px] text-xs leading-relaxed text-cream/70 italic" style={{ animationDelay: "3s" }}>
              “Chacha ji, aapke bina rasam adhoori hai — zaroor aaiyega.”
            </p>
          </div>

          <div className="absolute right-0 bottom-0 left-0 h-1 bg-cream/15">
            <div className="player-progress h-full bg-gold" />
          </div>
        </div>

        {!playing && (
          <button
            type="button"
            onClick={toggle}
            aria-label="Play sample invitation with sound"
            className="absolute inset-0 flex items-center justify-center bg-maroon/30"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-gold bg-maroon/90 text-champagne">
              <svg viewBox="0 0 16 16" className="ml-1 h-6 w-6" fill="currentColor" aria-hidden>
                <path d="M4 2.5v11l9-5.5z" />
              </svg>
            </span>
          </button>
        )}
        {playing && (
          <button
            type="button"
            onClick={toggle}
            aria-label="Pause sample invitation"
            className="absolute right-3 bottom-4 flex h-10 w-10 items-center justify-center rounded-full border border-gold/70 bg-maroon/80 text-champagne"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
              <rect x="3" y="2" width="3.5" height="12" rx="1" />
              <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
            </svg>
          </button>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-champagne/70">
        Tap play to hear the sample — yours is recorded in your own voice.
      </p>
    </div>
  );
}
