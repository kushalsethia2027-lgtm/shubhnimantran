import { useState } from "react";
import { Users, Plane, Hotel, ArrowRight, CheckCircle2 } from "lucide-react";
const tabs = ["Overview", "Families", "Arrivals", "Logistics"] as const;
export function PlannerPreview() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  return (
    <section
      id="guest-travel-planner"
      className="bg-cream px-5 py-16 sm:py-24"
      aria-labelledby="planner-feature-title"
    >
      <div className="mx-auto max-w-5xl">
        <div className="grid items-start gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="label-xs text-maroon/60">Introducing Guest & Travel Planner</p>
            <h2
              id="planner-feature-title"
              className="mt-4 font-display text-4xl leading-tight text-maroon sm:text-5xl"
            >
              Two families.
              <br />
              <em>One beautiful plan.</em>
            </h2>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              From “who’s coming?” to “who’s picking them up?” Keep both sides of the wedding in
              step, with one shared dashboard for guests, arrivals and hospitality.
            </p>
            <ul className="mt-6 space-y-4 text-sm text-ink">
              {[
                "Separate bride-side and groom-side planners",
                "Guest RSVPs, family lists and travel groups",
                "Shared pickups, hotels and room assignments",
              ].map((text) => (
                <li key={text} className="flex gap-3">
                  <CheckCircle2 className="shrink-0 text-maroon" size={18} />
                  {text}
                </li>
              ))}
            </ul>
            <a
              href="/planner/"
              className="foil-fill mt-7 inline-flex min-h-12 items-center gap-3 rounded-full px-6 text-sm font-semibold text-maroon"
            >
              Open Guest & Travel Planner <ArrowRight size={17} />
            </a>
            <p className="mt-3 text-xs text-muted-foreground">
              Sign in with Google. Each family keeps control of its own records.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gold/60 bg-white shadow-[0_20px_70px_-30px_rgba(75,20,39,.25)]">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-maroon px-5 py-4 text-cream">
              <div>
                <p className="font-display text-2xl">Meera & Aarav</p>
                <p className="mt-1 text-[11px] text-champagne/80">
                  Guest & Travel Planner · Jaipur
                </p>
              </div>
              <span className="rounded-full border border-gold/60 px-3 py-1 text-[10px] uppercase tracking-wider">
                Example preview
              </span>
            </div>
            <div
              role="tablist"
              aria-label="Planner dashboard preview"
              className="flex flex-wrap gap-1 border-b border-gold/30 bg-cream p-2"
            >
              {tabs.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  id={"preview-tab-" + name}
                  aria-selected={tab === name}
                  aria-controls={"preview-panel-" + name}
                  onClick={() => setTab(name)}
                  className={
                    "rounded-lg px-3 py-2 text-xs " +
                    (tab === name ? "bg-maroon text-cream" : "text-maroon hover:bg-gold/15")
                  }
                >
                  {name}
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              id={"preview-panel-" + tab}
              aria-labelledby={"preview-tab-" + tab}
              className="min-h-[310px] space-y-4 p-4 sm:p-5"
            >
              {tab === "Overview" && (
                <>
                  <p className="text-sm font-semibold text-maroon">
                    A warm welcome, down to every detail.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ["Families", "18"],
                      ["Confirmed guests", "86"],
                      ["Arriving today", "4 groups"],
                      ["Pickups to arrange", "2"],
                    ].map(([name, value]) => (
                      <div key={name} className="rounded-xl border border-gold/30 bg-cream/60 p-4">
                        <p className="text-[11px] text-muted-foreground">{name}</p>
                        <p className="mt-2 font-display text-3xl text-maroon">{value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users size={16} />
                    Bride and groom sides, together in one view.
                  </p>
                </>
              )}
              {tab === "Families" && (
                <>
                  <p className="text-sm font-semibold text-maroon">
                    Every person, thoughtfully counted.
                  </p>
                  {[
                    ["Sethia family", "Bride side", "6 confirmed · 2 pending"],
                    ["Jain family", "Groom side", "5 confirmed · 1 pending"],
                    ["College friends", "Bride side", "8 confirmed"],
                  ].map(([name, side, rsvp]) => (
                    <div
                      key={name}
                      className="flex flex-wrap justify-between gap-2 rounded-xl border border-gold/30 p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-maroon">{name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{side}</p>
                      </div>
                      <p className="text-xs text-maroon">{rsvp}</p>
                    </div>
                  ))}
                </>
              )}
              {tab === "Arrivals" && (
                <>
                  <p className="flex items-center gap-2 text-sm font-semibold text-maroon">
                    <Plane size={17} />9 February · Arrivals
                  </p>
                  {[
                    ["10:30 AM", "Sethia family", "Train · Delhi → Jaipur", "Pickup needed"],
                    ["12:45 PM", "Jain family", "Flight · Mumbai → Jaipur", "Pickup assigned"],
                  ].map(([time, name, route, status]) => (
                    <div key={name} className="rounded-xl border border-gold/30 p-4">
                      <p className="text-[11px] text-maroon">{time}</p>
                      <p className="mt-1 text-sm font-semibold">{name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{route}</p>
                      <span className="mt-3 inline-block rounded-full bg-gold/20 px-3 py-1 text-[10px] text-maroon">
                        {status}
                      </span>
                    </div>
                  ))}
                </>
              )}
              {tab === "Logistics" && (
                <>
                  <p className="flex items-center gap-2 text-sm font-semibold text-maroon">
                    <Hotel size={17} />
                    Hospitality, without the last-minute scramble.
                  </p>
                  <div className="rounded-xl border border-gold/30 p-5">
                    <p className="text-xs text-muted-foreground">Pickup · Jain family</p>
                    <p className="mt-2 font-semibold text-maroon">Family van · 1:00 PM</p>
                    <span className="mt-3 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-800">
                      Assigned by planner
                    </span>
                  </div>
                  <div className="rounded-xl border border-gold/30 p-5">
                    <p className="text-xs text-muted-foreground">Accommodation</p>
                    <p className="mt-2 font-semibold text-maroon">Family guest house · 4 rooms</p>
                    <p className="mt-2 text-xs text-muted-foreground">9–11 February · confirmed</p>
                  </div>
                </>
              )}
            </div>
            <p className="border-t border-gold/30 bg-cream/50 px-5 py-3 text-[11px] leading-5 text-muted-foreground">
              Illustrative sample data. Switch tabs to explore the preview. Your private dashboard
              shows your own saved records after sign-in.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
