import { createFileRoute, Link } from "@tanstack/react-router";
import { Divider, Mandala, Reveal, Toran } from "@/components/ornaments";

export const Route = createFileRoute("/product")({
  head: () => ({
    meta: [
      { title: "How Nimantran works" },
      {
        name: "description",
        content:
          "Record once with consent, upload your guest list, preview samples, and send personal WhatsApp invitations with a watched tracker.",
      },
      { property: "og:title", content: "How Nimantran works" },
      {
        property: "og:description",
        content:
          "Four steps: record, guest list, preview, send and track — personal video invitations in your family's own voice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

const steps = [
  {
    n: "1",
    title: "Record",
    body: "A 30–60 second message, with consent from the speaker.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
      </svg>
    ),
  },
  {
    n: "2",
    title: "Guest list",
    body: "Upload with relation, language and events.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
        <path d="M8 6h13M8 12h13M8 18h13" />
        <circle cx="3.5" cy="6" r="1" fill="currentColor" />
        <circle cx="3.5" cy="12" r="1" fill="currentColor" />
        <circle cx="3.5" cy="18" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    n: "3",
    title: "Preview",
    body: "Check 3 samples and fix pronunciations.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),
  },
  {
    n: "4",
    title: "Send and track",
    body: "WhatsApp delivery with a watched tracker.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7Z" />
      </svg>
    ),
  },
];

const roadmap = [
  {
    label: "Launch",
    items: [
      "Voice recording and consent",
      "Guest list upload",
      "AI scripts by relation and language",
      "Sample preview",
      "WhatsApp delivery",
    ],
  },
  {
    label: "Next",
    items: ["Delivery and watched tracker", "Regional dialect packs", "RSVP with reminders"],
  },
  {
    label: "Later",
    items: ["Multi-event invites", "Family co-editing", "Printed QR add-on"],
  },
];

function ProductPage() {
  return (
    <div className="bg-cream text-foreground">
      {/* Hero band */}
      <section className="relative overflow-hidden bg-maroon px-5 pt-10 pb-16 text-center text-cream">
        <Mandala className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 text-gold/20" />
        <div className="relative">
          <Toran className="mx-auto h-8 w-full max-w-md text-gold/80" />
          <p className="label-xs mt-6 tracking-[0.3em] text-champagne uppercase">Nimantran</p>
          <h1 className="foil mt-2 font-display text-4xl leading-tight sm:text-5xl">
            The job Nimantran does
          </h1>
          <blockquote className="mx-auto mt-8 max-w-2xl font-display text-2xl leading-snug text-gold sm:text-3xl">
            “When I can’t personally invite hundreds of guests, I want every guest, especially the
            elders, to feel personally invited, so nobody feels disrespected.”
          </blockquote>
          <Divider className="mt-10" />
        </div>
      </section>

      {/* Four steps */}
      <section className="px-5 py-16">
        <Reveal>
          <h2 className="text-center font-display text-3xl text-maroon">Four steps, one personal invitation</h2>
        </Reveal>
        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-4">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 80}>
              <div className="card-ornate h-full rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-gold">{s.icon}</span>
                  <span className="font-display text-2xl text-gold/60">{s.n}</span>
                </div>
                <h3 className="mt-3 font-display text-lg text-maroon">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Roadmap */}
      <section className="relative overflow-hidden px-5 py-16">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <h2 className="text-center font-display text-3xl text-maroon">What we’re building</h2>
          </Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {roadmap.map((col, i) => (
              <Reveal key={col.label} delay={i * 100}>
                <div className="h-full rounded-xl border border-gold bg-cream p-5">
                  <p className="label-xs tracking-[0.25em] text-gold uppercase">{col.label}</p>
                  <ul className="mt-3 space-y-2 text-sm text-foreground/90">
                    {col.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Promise strip */}
      <section className="bg-maroon px-5 py-10 text-center">
        <p className="mx-auto max-w-2xl font-display text-lg text-champagne sm:text-xl">
          Your family’s voice is used only with the speaker’s consent, only for your invitations,
          and deleted after the wedding on request.
        </p>
      </section>

      {/* Closing CTA */}
      <section className="px-5 py-16 text-center">
        <Link
          to="/"
          className="foil-fill inline-flex min-h-12 items-center justify-center rounded-full px-8 text-sm font-semibold tracking-wide text-maroon shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] transition hover:brightness-110 active:scale-[0.98]"
        >
          Join the waitlist
        </Link>
        <p className="deva mt-4 text-xs text-maroon/70">शुभ निमंत्रण</p>
      </section>
    </div>
  );
}
