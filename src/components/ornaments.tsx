import { useEffect, useRef, useState, type ReactNode } from "react";

export function Mandala({ className = "" }: { className?: string }) {
  const petals = Array.from({ length: 24 });
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1">
        {[40, 70, 100, 130, 160, 190].map((r) => (
          <circle key={r} cx="200" cy="200" r={r} />
        ))}
        {petals.map((_, i) => (
          <g key={i} transform={`rotate(${(360 / 24) * i} 200 200)`}>
            <path d="M200 20 C218 70 218 110 200 150 C182 110 182 70 200 20 Z" />
            <path d="M200 160 L200 240" />
          </g>
        ))}
        {petals.slice(0, 12).map((_, i) => (
          <g key={`d${i}`} transform={`rotate(${(360 / 12) * i} 200 200)`}>
            <path d="M200 92 l14 18 -14 18 -14 -18 Z" />
          </g>
        ))}
      </g>
    </svg>
  );
}

export function Toran({ className = "" }: { className?: string }) {
  const n = 22;
  return (
    <svg viewBox="0 0 880 60" preserveAspectRatio="none" className={className} aria-hidden>
      <path d="M0 6 Q440 46 880 6" fill="none" stroke="currentColor" strokeWidth="2" />
      {Array.from({ length: n }).map((_, i) => {
        const t = i / (n - 1);
        const x = t * 880;
        const y = 6 + 40 * (1 - Math.pow(2 * t - 1, 2));
        const long = i % 3 === 0;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <line x1="0" y1="0" x2="0" y2={long ? 16 : 9} stroke="currentColor" strokeWidth="1" />
            <circle cx="0" cy={long ? 22 : 14} r={long ? 6 : 4.5} fill="var(--marigold)" />
            <circle cx="0" cy={long ? 22 : 14} r={long ? 2.5 : 2} fill="var(--champagne)" />
          </g>
        );
      })}
    </svg>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold sm:w-28" />
      <svg viewBox="0 0 40 24" className="h-5 w-8 text-gold" aria-hidden>
        <path
          d="M20 2 C26 9 26 15 20 22 C14 15 14 9 20 2 Z M8 12 h6 M26 12 h6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold sm:w-28" />
    </div>
  );
}

export function Paisley({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        d="M4 44 C4 20 18 4 40 4 C30 12 26 18 26 26 C26 34 18 42 4 44 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <path d="M12 38 C14 26 22 16 32 12" fill="none" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}

export function Diya({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M4 20 q12 10 24 0 q-12 4 -24 0 Z" fill="currentColor" />
      <path d="M16 6 c3 4 4 6 4 8 a4 4 0 0 1 -8 0 c0 -2 1 -4 4 -8 Z" fill="var(--marigold)" />
    </svg>
  );
}

export function Jaali({ className = "" }: { className?: string }) {
  return (
    <svg className={className} aria-hidden>
      <defs>
        <pattern id="jaali" width="56" height="56" patternUnits="userSpaceOnUse">
          <path
            d="M28 0 L56 28 L28 56 L0 28 Z M28 14 L42 28 L28 42 L14 28 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#jaali)" />
    </svg>
  );
}

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setInView(true),
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal ${inView ? "is-in" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
