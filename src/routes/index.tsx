import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Divider,
  Diya,
  Jaali,
  Mandala,
  Paisley,
  Reveal,
  Toran,
} from "@/components/ornaments";
import { InvitePlayer } from "@/components/InvitePlayer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nimantran — Personal video wedding invitations on WhatsApp" },
      {
        name: "description",
        content:
          "Record once. Nimantran sends every wedding guest a personal video invitation in your own voice, with the right relation and language, on WhatsApp.",
      },
      {
        property: "og:title",
        content: "Nimantran — Personal video wedding invitations",
      },
      {
        property: "og:description",
        content:
          "Every guest gets a personal invitation from you. Even the 300th. Join the waitlist.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const petals = [
  { left: "8%", dur: 18, delay: 0 },
  { left: "24%", dur: 24, delay: 4 },
  { left: "47%", dur: 21, delay: 9 },
  { left: "68%", dur: 26, delay: 2 },
  { left: "86%", dur: 20, delay: 12 },
];

function Petals() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {petals.map((p, i) => (
        <span
          key={i}
          className="animate-petal absolute top-0 block h-2.5 w-4 rounded-[100%_0_100%_0] bg-rose/60"
          style={{ left: p.left, animationDuration: `${p.dur}s`, animationDelay: `-${p.delay}s` }}
        />
      ))}
    </div>
  );
}

function GoldButton({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`foil-fill inline-flex min-h-12 items-center justify-center rounded-full px-7 text-sm font-semibold tracking-wide text-maroon shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] transition hover:brightness-110 active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  );
}

function scrollToForm() {
  document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function PhoneMock() {
  return (
    <div className="relative mx-auto w-[248px] sm:w-[280px]">
      <div className="absolute -inset-8 rounded-full bg-marigold/20 blur-3xl" aria-hidden />
      <div className="animate-floaty relative">
        <div className="arch border border-gold/70 bg-gradient-to-b from-champagne/25 to-transparent p-2.5">
          <div className="arch overflow-hidden bg-[#0b1410] p-3">
            <div className="flex items-center gap-2 pb-3">
              <span className="h-6 w-6 rounded-full bg-gold/70" />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-cream">Priya · Wedding</p>
                <p className="text-[10px] text-cream/50">online</p>
              </div>
            </div>
            <div className="rounded-xl rounded-tl-sm bg-[#14241c] p-2">
              <div className="relative grid h-32 place-items-center rounded-lg bg-gradient-to-br from-burgundy to-maroon">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-champagne/90">
                  <span className="ml-1 block h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent border-l-maroon" />
                </span>
                <span className="absolute bottom-1.5 right-2 rounded bg-black/45 px-1.5 py-0.5 text-[10px] text-cream">
                  0:42
                </span>
              </div>
              <p className="pt-2 text-[11px] leading-snug text-cream/90">
                Sharma Uncle, aapke liye ek khaas nimantran
              </p>
            </div>
            <div className="h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

const problems = [
  "You can't call 300 people.",
  "A forwarded card feels cold.",
  "Someone will still say: “humein toh bulaya hi nahi.”",
];

const steps = [
  {
    t: "Record",
    d: "Record a 30–60 second message from you, your parents, or dadi.",
  },
  {
    t: "Upload",
    d: "Add your guest list with relations, such as Mama ji, Chachi, college friend.",
  },
  {
    t: "Send",
    d: "We create a personal video for every guest and send it on WhatsApp. You track who has watched.",
  },
];

const samples = [
  {
    name: "Sharma Uncle",
    rel: "Father's friend",
    lang: "Hindi",
    line: "Sharma uncle, namaste! Hum sab aapko Priya ki shaadi mein bulana chahte hain. Aapka aashirwad zaroori hai.",
  },
  {
    name: "Mausi ji",
    rel: "Mother's sister",
    lang: "Hinglish",
    line: "Mausi ji, aapke bina mehndi ki raunak kaisi? Zaroor aaiye.",
  },
  {
    name: "Chacha ji",
    rel: "Father's brother",
    lang: "Punjabi-style Hinglish",
    line: "Chacha ji, sade ghar di khushi tuhade bina adhoori hai. Zaroor aana.",
  },
];

const features = [
  ["Sounds like your family", "Your own voice, not a template."],
  ["Right respect, right relation", "The correct salutation for every single guest."],
  ["Your language", "Hindi, Punjabi, Gujarati, Marathi, Tamil and more."],
  [
    "Your voice, your control",
    "A voice is used only with the speaker's consent, and deleted after the wedding on request.",
  ],
];

const plans = [
  { name: "Chhota Parivaar", price: "₹999", guests: "Up to 50 guests", pop: false },
  { name: "Bada Parivaar", price: "₹2,499", guests: "Up to 150 guests", pop: true },
  { name: "Grand Baraat", price: "₹5,499", guests: "Up to 400 guests", pop: false },
];

const faqs = [
  [
    "Is this a real recording of my voice?",
    "Yes. You record once, and we personalise that message for each guest with their name and relation. Voice is used only with the speaker's consent.",
  ],
  [
    "How long does it take?",
    "Most families get their full set of videos within 48 hours of sharing the recording and guest list.",
  ],
  [
    "How do guests receive it?",
    "On WhatsApp, as a video message from your family. No app, no link to install.",
  ],
  [
    "Which languages do you support?",
    "Hindi, Hinglish, Punjabi, Gujarati, Marathi, Tamil, Telugu, Bengali and more on request.",
  ],
  [
    "What if a guest's relation is unusual?",
    "You can write the exact term you use, like Bade Papa or Pinky Bua, and we will use it.",
  ],
];

function Landing() {
  const [open, setOpen] = useState<number | null>(0);
  const [form, setForm] = useState({ name: "", phone: "", date: "" });
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-cream text-ink">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-gold/40 bg-cream/95 backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <p className="foil font-display text-2xl leading-none font-semibold">Nimantran</p>
            <p className="deva text-[11px] text-maroon/70">निमंत्रण</p>
          </div>
          <button
            onClick={scrollToForm}
            className="shrink-0 rounded-full border border-gold bg-maroon px-4 py-2.5 text-xs font-semibold tracking-wide text-champagne transition hover:shadow-[0_0_18px_-2px_var(--gold)]"
          >
            Join waitlist
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-maroon pb-20 pt-4">
        <Mandala className="pointer-events-none absolute -top-24 left-1/2 w-[680px] -translate-x-1/2 text-champagne/10" />
        <Petals />
        <Toran className="relative h-12 w-full text-gold" />
        <div className="relative mx-auto max-w-5xl px-5 pt-6 text-center">
          <Reveal>
            <p className="label-xs text-champagne/70">Personal video wedding invitations</p>
            <h1 className="mx-auto mt-4 max-w-3xl font-display text-[2.6rem] leading-[1.05] font-semibold text-cream sm:text-6xl">
              Every guest gets a <em className="foil not-italic italic">personal</em> invitation from
              you. Even the <em className="foil not-italic italic">300th</em>.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-cream/80">
              Record once. Nimantran sends each guest a video that says their name, their relation to
              you, and your family's blessings, in your language, on WhatsApp.
            </p>
            <div className="mt-7">
              <GoldButton onClick={scrollToForm}>Join the waitlist</GoldButton>
              <p className="mt-3 text-xs tracking-wide text-champagne/70">
                First 100 families get 30% off.
              </p>
            </div>
          </Reveal>
          <Reveal delay={150} className="mt-12">
            <PhoneMock />
          </Reveal>
        </div>
      </section>

      {/* Problem */}
      <section className="relative -mt-6 rounded-t-[2.5rem] bg-cream px-5 pb-16 pt-14">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
          {problems.map((p, i) => (
            <Reveal key={p} delay={i * 120}>
              <div className="card-ornate relative h-full overflow-hidden p-6">
                <Paisley className="absolute -right-2 -top-2 h-12 w-12 rotate-180 text-gold/40" />
                <Paisley className="absolute -bottom-2 -left-2 h-12 w-12 text-gold/40" />
                <p className="font-display text-xl leading-snug text-maroon">{p}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-cream px-5 pb-20">
        <Divider className="pb-10" />
        <div className="mx-auto max-w-4xl text-center">
          <p className="label-xs text-maroon/60">How it works</p>
          <h2 className="mt-3 font-display text-4xl text-maroon">Three steps, one recording</h2>
        </div>
        <div className="relative mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
          <div
            className="absolute left-0 right-0 top-8 hidden border-t border-dashed border-gold sm:block"
            aria-hidden
          />
          {steps.map((s, i) => (
            <Reveal key={s.t} delay={i * 140}>
              <div className="relative text-center">
                <span className="relative z-10 mx-auto grid h-16 w-16 place-items-center rounded-full border border-gold bg-cream">
                  <Diya className="h-7 w-7 text-gold" />
                </span>
                <p className="mt-4 font-display text-2xl text-maroon">
                  {i + 1}. {s.t}
                </p>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {s.d}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Samples */}
      <section className="relative overflow-hidden bg-peacock px-5 py-20">
        <Jaali className="pointer-events-none absolute inset-0 h-full w-full text-champagne/10" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="label-xs text-champagne/70">Hear how it sounds</p>
          <h2 className="mt-3 font-display text-4xl text-cream">
            Written the way your family <em className="foil not-italic italic">speaks</em>
          </h2>
        </div>
        <Reveal className="relative mt-10">
          <InvitePlayer />
        </Reveal>
        <div className="relative mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
          {samples.map((s, i) => (
            <Reveal key={s.name} delay={i * 130}>
              <div className="h-full rounded-2xl rounded-tl-sm border border-gold/50 bg-cream/95 p-5">
                <p className="font-display text-xl text-maroon">{s.name}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-gold/60 px-2 py-0.5 text-[10px] tracking-wide text-maroon/80">
                    {s.rel}
                  </span>
                  <span className="rounded-full bg-marigold/20 px-2 py-0.5 text-[10px] tracking-wide text-maroon/80">
                    {s.lang}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink/80">“{s.line}”</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="relative mt-6 text-center text-xs text-champagne/70">
          Sample lines. Yours are written for your family.
        </p>
      </section>

      {/* Features */}
      <section className="bg-cream px-5 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="label-xs text-maroon/60">Why families choose us</p>
          <h2 className="mt-3 font-display text-4xl text-maroon">
            Personal, not <em className="italic">forwarded</em>
          </h2>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
          {features.map(([t, d], i) => (
            <Reveal key={t} delay={i * 110}>
              <div className="card-ornate relative h-full overflow-hidden p-6">
                <Paisley className="absolute -right-2 -top-2 h-12 w-12 rotate-180 text-gold/35" />
                <p className="font-display text-2xl text-maroon">{t}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="relative overflow-hidden bg-maroon pb-20">
        <Toran className="h-12 w-full text-gold" />
        <div className="mx-auto max-w-5xl px-5 pt-8 text-center">
          <p className="label-xs text-champagne/70">Pricing</p>
          <h2 className="mt-3 font-display text-4xl text-cream">Choose your parivaar</h2>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-5 px-5 sm:grid-cols-3">
          {plans.map((p, i) => (
            <Reveal key={p.name} delay={i * 120}>
              <div
                className={`arch relative h-full border p-6 pt-10 text-center ${
                  p.pop
                    ? "border-gold bg-burgundy shadow-[0_0_44px_-10px_var(--gold)]"
                    : "border-gold/60 bg-cream"
                }`}
              >
                {p.pop && (
                  <span className="foil-fill absolute left-1/2 top-3 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide text-maroon">
                    Most popular
                  </span>
                )}
                <p
                  className={`font-display text-2xl ${p.pop ? "text-champagne" : "text-maroon"}`}
                >
                  {p.name}
                </p>
                <p
                  className={`mt-3 font-display text-4xl ${p.pop ? "foil" : "text-maroon"}`}
                >
                  {p.price}
                </p>
                <p className={`mt-2 text-sm ${p.pop ? "text-cream/80" : "text-muted-foreground"}`}>
                  {p.guests}
                </p>
                <GoldButton onClick={scrollToForm} className="mt-6 w-full">
                  Join the waitlist
                </GoldButton>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-md px-5 text-center text-sm text-cream/80">
          Optional add-ons: RSVP tracking (₹499), pre-wedding reminder video (₹999).
        </p>
        <p className="mx-auto mt-2 max-w-md px-5 text-center text-xs text-champagne/70">
          Founding families get 30% off. Prices are indicative until launch.
        </p>
      </section>

      {/* FAQ */}
      <section className="bg-cream px-5 py-20">
        <Divider className="pb-10" />
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center font-display text-4xl text-maroon">Questions families ask</h2>
          <div className="mt-8 divide-y divide-gold/40 border-y border-gold/40">
            {faqs.map(([q, a], i) => (
              <div key={q}>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left"
                >
                  <span className="font-display text-lg text-maroon">{q}</span>
                  <span className="shrink-0 text-xl text-gold">{open === i ? "−" : "+"}</span>
                </button>
                {open === i && (
                  <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section
        id="waitlist"
        className="relative overflow-hidden bg-maroon px-5 py-20 pb-32 sm:pb-20"
      >
        <Mandala className="pointer-events-none absolute -bottom-40 left-1/2 w-[620px] -translate-x-1/2 text-champagne/10" />
        <div className="relative mx-auto max-w-md text-center">
          <p className="deva text-champagne/80">शुभ विवाह</p>
          <h2 className="mt-2 font-display text-4xl text-cream">
            Join the <em className="foil not-italic italic">waitlist</em>
          </h2>
          <p className="mt-3 text-sm text-cream/80">
            First 100 families get 30% off. We will message you on WhatsApp when we open.
          </p>
          {sent ? (
            <div className="card-ornate mt-8 p-8">
              <p className="font-display text-2xl text-maroon">Dhanyavaad, {form.name || "ji"}!</p>
              <p className="mt-2 text-sm text-muted-foreground">
                You're on the list. We'll reach out on WhatsApp soon.
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="card-ornate mt-8 space-y-3 p-6 text-left"
            >
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                className="min-h-12 w-full rounded-full border border-gold/60 bg-cream px-5 text-sm outline-none focus:ring-2 focus:ring-gold"
              />
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="WhatsApp number"
                className="min-h-12 w-full rounded-full border border-gold/60 bg-cream px-5 text-sm outline-none focus:ring-2 focus:ring-gold"
              />
              <input
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                placeholder="Wedding month (optional)"
                className="min-h-12 w-full rounded-full border border-gold/60 bg-cream px-5 text-sm outline-none focus:ring-2 focus:ring-gold"
              />
              <GoldButton className="w-full">Join the waitlist</GoldButton>
            </form>
          )}
        </div>
      </section>

      <footer className="bg-cream px-5 py-10 text-center">
        <p className="foil font-display text-2xl">Nimantran</p>
        <p className="deva mt-1 text-xs text-maroon/70">निमंत्रण</p>
        <nav className="mt-3 flex items-center justify-center gap-5 text-xs">
          <Link to="/" className="text-muted-foreground transition hover:text-maroon">
            Home
          </Link>
          <Link to="/product" className="text-muted-foreground transition hover:text-maroon">
            How it works
          </Link>
        </nav>
        <p className="mt-3 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Nimantran. Made for Indian weddings.
        </p>
      </footer>

      {/* Sticky mobile CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/50 bg-cream/95 p-3 backdrop-blur sm:hidden">
        <GoldButton onClick={scrollToForm} className="w-full">
          Join the waitlist
        </GoldButton>
      </div>
    </div>
  );
}
