import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Heart,
  Flower2,
  ArrowLeft,
  ShieldCheck,
  LogOut,
  Users,
  Mic,
  FileText,
  CheckCircle2,
  Film,
  Send,
  LayoutDashboard,
  HelpCircle,
} from "lucide-react";
import { api, download } from "@/features/workspace/client";
import {
  approvalGate,
  csvExport,
  plans,
  privacyPromise,
  type Wedding,
  type Workspace,
} from "@/features/workspace/domain";
import { WeddingForm } from "@/features/workspace/WeddingForm";
import { Guests } from "@/features/workspace/Guests";
import { VoiceStudio } from "@/features/workspace/VoiceStudio";
import { Scripts } from "@/features/workspace/Scripts";
export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Your wedding studio · Nimantran" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Application,
});
type Capabilities = {
  database: boolean;
  scripts: boolean;
  voice: boolean;
  rendering: boolean;
  delivery: boolean;
  productionEnabled: boolean;
  support: string | null;
};
const navigation = [
  { id: "dashboard", en: "Dashboard", hi: "डैशबोर्ड", icon: LayoutDashboard },
  { id: "wedding", en: "My wedding", hi: "मेरी शादी", icon: Flower2 },
  { id: "voice", en: "Voice studio", hi: "आवाज़ स्टूडियो", icon: Mic },
  { id: "guests", en: "Guest list", hi: "मेहमान सूची", icon: Users },
  { id: "scripts", en: "Scripts", hi: "निमंत्रण लेख", icon: FileText },
  { id: "samples", en: "Sample approval", hi: "नमूना अनुमोदन", icon: CheckCircle2 },
  { id: "production", en: "Video production", hi: "वीडियो निर्माण", icon: Film },
  { id: "delivery", en: "Delivery & tracking", hi: "भेजना व ट्रैकिंग", icon: Send },
  { id: "privacy", en: "Privacy & consent", hi: "गोपनीयता व सहमति", icon: ShieldCheck },
  { id: "help", en: "Help", hi: "सहायता", icon: HelpCircle },
];
function Application() {
  const [cap, setCap] = useState<Capabilities | null>(null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [data, setData] = useState<Workspace | null>(null);
  const [tab, setTab] = useState("dashboard");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hi, setHi] = useState(false);
  const loadWedding = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const result = await api<Workspace>(`/weddings/${id}`);
      setData(result);
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);
  const loadWeddings = useCallback(
    async (selected?: string) => {
      const list = await api<Wedding[]>("/weddings");
      setWeddings(list);
      const id = selected ?? list[0]?.id;
      if (id) await loadWedding(id);
      else {
        setData(null);
        setCreating(true);
      }
    },
    [loadWedding],
  );
  const signedIn = useCallback(async () => {
    setUser(await api("/me"));
    await loadWeddings();
  }, [loadWeddings]);
  useEffect(() => {
    let active = true;
    const boot = async () => {
      try {
        const status = await api<Capabilities>("/status");
        if (!active) return;
        setCap(status);
        if (status.database) {
          try {
            await signedIn();
          } catch {
            /* No authenticated session; display sign-in. */
          }
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    };
    void boot();
    return () => {
      active = false;
    };
  }, [signedIn]);
  const reload = async () => {
    if (data) await loadWedding(data.wedding.id);
  };
  const nav = (id: string) => {
    setCreating(false);
    setTab(id);
  };
  return (
    <div className="workspace">
      <header className="border-b border-gold/50 bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <a href="/" className="flex items-center gap-2 text-maroon">
            <Flower2 size={25} />
            <span className="font-display text-3xl font-semibold">Nimantran</span>
          </a>
          <div className="flex items-center gap-3">
            <button
              className="workspace-secondary"
              aria-label="Switch navigation language"
              onClick={() => setHi(!hi)}
            >
              {hi ? "English" : "हिन्दी"}
            </button>
            {user && (
              <button
                className="workspace-secondary"
                onClick={async () => {
                  try {
                    await api("/auth/logout", "POST");
                    setUser(null);
                    setData(null);
                    setWeddings([]);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <LogOut size={16} />
                <span className="ml-2">{hi ? "साइन आउट" : "Sign out"}</span>
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <div className="mb-7 flex items-start gap-3">
          <Heart className="mt-1 shrink-0 text-maroon" size={20} />
          <div>
            <p className="label-xs text-maroon/65">
              {hi ? "आपके परिवार का निमंत्रण" : "Your family’s invitation studio"}
            </p>
            <p className="mt-2 font-display text-2xl text-maroon">
              {hi
                ? "हर निमंत्रण में आपके परिवार की आवाज़।"
                : "Every invitation carries your family’s voice."}
            </p>
          </div>
        </div>
        {error && (
          <div role="alert" className="workspace-note mb-5 text-destructive">
            {error}
            <button className="ml-3 underline" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        )}
        {loading && !data ? (
          <p role="status" className="workspace-card">
            Loading your studio…
          </p>
        ) : !user ? (
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <div className="workspace-card space-y-5">
              <h1 className="workspace-title">
                {hi ? "शुभ शुरुआत" : "Begin with a little belonging."}
              </h1>
              <p className="text-sm leading-7 text-muted-foreground">
                Create your wedding, welcome your guests, and review every personal invitation
                before it leaves your family.
              </p>
              <a href="/demo" className="workspace-primary w-full">
                Try without sign-in · generate & download a video
              </a>
              <p className="text-xs text-muted-foreground">
                Local demo with clearly labelled example data. No email code, API key or WhatsApp
                required.
              </p>
              <div className="space-y-4 border-t pt-5">
                {[
                  "Private wedding and guest details",
                  "Speaker consent at every step",
                  "Your approval before production or delivery",
                ].map((text) => (
                  <p key={text} className="flex gap-3 text-sm">
                    <ShieldCheck size={18} className="shrink-0 text-maroon" />
                    {text}
                  </p>
                ))}
              </div>
              <a
                href="/"
                className="inline-flex min-h-11 items-center gap-2 text-sm text-maroon underline"
              >
                <ArrowLeft size={16} />
                Back to Nimantran
              </a>
            </div>
            <SignIn available={!!cap?.database} onSignedIn={signedIn} />
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div className="workspace-form min-w-0 flex-1 sm:max-w-sm">
                <label>
                  {hi ? "मेरी शादियाँ" : "My weddings"}
                  <select
                    value={data?.wedding.id ?? ""}
                    onChange={(e) => {
                      setCreating(false);
                      void loadWedding(e.target.value);
                    }}
                  >
                    {!weddings.length && <option value="">No weddings yet</option>}
                    {weddings.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.bride} & {w.groom}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button className="workspace-primary" onClick={() => setCreating(true)}>
                + {hi ? "शादी बनाएँ" : "Create wedding"}
              </button>
            </div>
            {data && !creating && (
              <nav
                className="workspace-nav mb-6 border-y border-gold/40"
                aria-label="Wedding workspace"
              >
                {navigation.map((n) => (
                  <button
                    key={n.id}
                    aria-current={tab === n.id ? "page" : undefined}
                    onClick={() => nav(n.id)}
                    className="inline-flex items-center gap-2"
                  >
                    <n.icon size={15} />
                    {hi ? n.hi : n.en}
                  </button>
                ))}
              </nav>
            )}
            {loading && data && (
              <p role="status" className="mb-3 text-sm">
                Refreshing saved progress…
              </p>
            )}
            {creating ? (
              <WeddingForm
                onCancel={() => setCreating(false)}
                onSaved={async (id) => {
                  await loadWeddings(id);
                  setCreating(false);
                  setTab("dashboard");
                }}
              />
            ) : data ? (
              <div key={data.wedding.id}>
                {tab === "dashboard" && <Dashboard data={data} navigate={nav} />}
                {tab === "wedding" && (
                  <WeddingForm
                    workspace={data}
                    onCancel={() => nav("dashboard")}
                    onSaved={async (id) => {
                      await loadWeddings(id);
                      nav("dashboard");
                    }}
                  />
                )}
                {tab === "guests" && <Guests data={data} reload={reload} />}
                {tab === "voice" && <VoiceStudio data={data} reload={reload} />}
                {(tab === "scripts" || tab === "samples") && (
                  <Scripts
                    data={data}
                    reload={reload}
                    aiConfigured={!!cap?.scripts}
                    samplesOnly={tab === "samples"}
                  />
                )}
                {(tab === "production" || tab === "delivery") && (
                  <Production data={data} delivery={tab === "delivery"} reload={reload} cap={cap} />
                )}
                {tab === "privacy" && <Privacy data={data} onVoice={() => nav("voice")} />}
                {tab === "help" && <Help cap={cap} />}
              </div>
            ) : (
              <div className="workspace-card">
                <p>No wedding selected. Create a wedding to begin.</p>
              </div>
            )}
          </>
        )}
        <footer className="mt-12 border-t pt-5 text-center text-xs leading-6 text-muted-foreground">
          Built for families. No payments collected.
          <br />
          Your approval comes before every invitation.
        </footer>
      </main>
    </div>
  );
}
function SignIn({
  available,
  onSignedIn,
}: {
  available: boolean;
  onSignedIn: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="workspace-card workspace-form space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          if (sent) {
            await api("/auth/verify", "POST", { email, code });
            await onSignedIn();
          } else {
            await api("/auth/request", "POST", { email });
            setSent(true);
          }
        } catch (ex) {
          setError((ex as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-3xl text-maroon">Your wedding, safely saved.</h2>
      <p className="text-sm text-muted-foreground">
        Sign in or create an account with an email code. No password to remember.
      </p>
      {!available && (
        <p role="status" className="workspace-note">
          Development mode · Account and database access are unavailable until the project owner
          configures Supabase and applies the migrations. No demo account or simulated saves are
          provided.
        </p>
      )}
      <label>
        Email address
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          disabled={sent || !available}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
        />
      </label>
      {sent && (
        <label>
          Code from your email
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            pattern="[0-9]{6,10}"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
      )}
      {sent && (
        <p role="status" className="text-sm">
          Check your email for the code. It expires according to your project’s Auth settings.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <button className="workspace-primary w-full" disabled={busy || !available}>
        {busy ? "Please wait…" : sent ? "Verify & enter studio" : "Email me a sign-in code"}
      </button>
      {sent && (
        <button
          className="workspace-secondary w-full"
          type="button"
          disabled={busy}
          onClick={() => {
            setSent(false);
            setCode("");
          }}
        >
          Change email / request another code
        </button>
      )}
      <p className="text-xs text-muted-foreground">
        Your sign-in session is held in secure, HttpOnly cookies. Never share your code.
      </p>
    </form>
  );
}
function Dashboard({ data, navigate }: { data: Workspace; navigate: (tab: string) => void }) {
  const approved = data.scripts.filter((s) => s.approved_at).length;
  const steps = [
    {
      name: "Wedding & events",
      done: data.events.length > 0,
      tab: "wedding",
      detail: `${data.events.length} events · ${data.wedding.city}`,
    },
    {
      name: "Voice & informed consent",
      done: data.voices.some((v) => v.consent_status === "active" && v.status === "stored"),
      tab: "voice",
      detail: "Record once, review your consent",
    },
    {
      name: "Your guest list",
      done: data.guests.length > 0,
      tab: "guests",
      detail: `${data.guests.length} of ${plans[data.wedding.plan].limit} guests`,
    },
    {
      name: "Personal invitation wording",
      done: approved > 0 && approved === data.guests.length,
      tab: "scripts",
      detail: `${approved} approved scripts`,
    },
    {
      name: "Three representative samples",
      done: approvalGate(data.scripts, data.guests),
      tab: "samples",
      detail: "Different relationships, individually reviewed",
    },
    {
      name: "Production & delivery",
      done: false,
      tab: "production",
      detail: "Unavailable until provider verification and worker activation",
    },
  ];
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-maroon p-6 text-cream sm:p-9">
        <Flower2 className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 text-gold/15" />
        <p className="label-xs text-champagne">A celebration taking shape</p>
        <h1 className="relative mt-3 font-display text-4xl sm:text-5xl">
          {data.wedding.bride} <span className="text-gold">&</span> {data.wedding.groom}
        </h1>
        <p className="mt-3 text-sm text-cream/80">
          {data.wedding.wedding_date} · {data.wedding.city}
        </p>
        <p className="mt-4 inline-block rounded-full border border-gold/50 px-3 py-1 text-xs">
          {plans[data.wedding.plan].name}
        </p>
      </section>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Guests welcomed", data.guests.length],
          ["Wording approved", approved],
          ["Saved voices", data.voices.filter((v) => v.status === "stored").length],
        ].map(([label, value]) => (
          <div key={label} className="workspace-card">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-4xl text-maroon">{value}</p>
          </div>
        ))}
      </div>
      <div className="workspace-card">
        <h2 className="text-3xl text-maroon">One thoughtful step at a time</h2>
        <p className="my-3 text-sm text-muted-foreground">
          Progress is saved in your account. Pick up where you left off.
        </p>
        <div className="divide-y">
          {steps.map((s, i) => (
            <button
              key={s.tab}
              className="flex w-full items-center gap-4 py-4 text-left"
              onClick={() => navigate(s.tab)}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${s.done ? "bg-maroon text-cream" : "border border-gold text-maroon"}`}
              >
                {s.done ? <CheckCircle2 size={18} /> : i + 1}
              </span>
              <span>
                <span className="block text-sm font-semibold">{s.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{s.detail}</span>
              </span>
              <span className="ml-auto text-maroon">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
function Production({
  data,
  delivery,
  reload,
  cap,
}: {
  data: Workspace;
  delivery: boolean;
  reload: () => Promise<void>;
  cap: Capabilities | null;
}) {
  const [error, setError] = useState("");
  const jobs = data.jobs.filter((j) => j.kind === (delivery ? "delivery" : "video"));
  const eligible = data.guests.filter((g) => g.messaging_consent && !g.opted_out).length;
  return (
    <div className="space-y-5">
      <h2 className="workspace-title">
        {delivery ? "Delivery centre & guest tracking" : "Video production"}
      </h2>
      <p className="workspace-note">
        {delivery
          ? "WhatsApp delivery is unavailable until the official Twilio Business template, signed callbacks, durable worker and explicit host-confirmation flow are verified. No messages have been sent by this application."
          : "Billable media generation is unavailable until provider consent verification, Hindi template rendering and the production worker pass sandbox acceptance. No audio or videos have been generated by this application."}
      </p>
      <div className="workspace-card space-y-3">
        <h3 className="text-2xl">
          {delivery ? "Before a single invitation leaves" : "Before production begins"}
        </h3>
        <p className="text-sm">
          {delivery
            ? `${eligible} guests have recorded WhatsApp permission. ${data.guests.length - eligible} need permission or are opted out.`
            : `${data.scripts.filter((s) => s.approved_at).length} of ${data.guests.length} guest scripts approved. Sample gate: ${approvalGate(data.scripts, data.guests) ? "satisfied" : "not yet satisfied"}.`}
        </p>
        <p className="text-sm text-muted-foreground">{privacyPromise}</p>
        {delivery ? (
          <>
            <label className="workspace-form block">
              <span className="text-sm">Illustrative final-message format · no send available</span>
              <textarea
                readOnly
                className="mt-2"
                value={`Namaste [guest name] [relationship], ${data.wedding.bride} aur ${data.wedding.groom} ki shaadi ka aapke liye khaas nimantran: [secure invitation link].`}
              />
            </label>
            <p className="text-xs">
              Scheduling, reminders, RSVP and watch analytics are unavailable. A submitted API
              request is never counted as delivered or read.
            </p>
          </>
        ) : (
          <p className="text-xs">
            Batch target: up to 200 guests within 24 hours after approval, subject to actual
            provider quotas. No guaranteed turnaround.
          </p>
        )}
        <button className="workspace-primary" disabled>
          {delivery ? "Sending unavailable" : "Generation unavailable"}
        </button>
      </div>
      <div className="workspace-card">
        <h3 className="mb-3 text-2xl">Actual job history</h3>
        {!jobs.length ? (
          <p className="text-sm text-muted-foreground">
            No jobs. Progress and delivery statuses appear only from persisted, verified operations.
          </p>
        ) : (
          jobs.map((j) => (
            <div key={j.id} className="my-3 rounded-xl border p-3">
              <p className="text-sm">
                {data.guests.find((g) => g.id === j.guest_id)?.guest_name ?? "Guest"} · {j.status}
              </p>
              {j.error && <p className="mt-1 text-xs text-destructive">{j.error}</p>}
              {j.scheduled_at && <p className="mt-1 text-xs">Scheduled: {j.scheduled_at}</p>}
              {j.status === "queued" && (
                <button
                  className="workspace-secondary mt-2"
                  onClick={async () => {
                    try {
                      await api(`/weddings/${data.wedding.id}/jobs/${j.id}`, "DELETE");
                      await reload();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Cancel queued job
                </button>
              )}
            </div>
          ))
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          className="workspace-secondary mt-4"
          disabled={!jobs.length}
          onClick={() =>
            download(
              "nimantran-job-status.csv",
              csvExport([
                ["guest", "kind", "status", "scheduled_at"],
                ...jobs.map((j) => [
                  data.guests.find((g) => g.id === j.guest_id)?.guest_name ?? "",
                  j.kind,
                  j.status,
                  j.scheduled_at ?? "",
                ]),
              ]),
            )
          }
        >
          Export actual statuses
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Configuration presence only, not live verification: ElevenLabs{" "}
        {cap?.voice ? "configured" : "missing"} · Shotstack{" "}
        {cap?.rendering ? "configured" : "missing"} · Twilio{" "}
        {cap?.delivery ? "configured" : "missing"}.
      </p>
    </div>
  );
}
function Privacy({ data, onVoice }: { data: Workspace; onVoice: () => void }) {
  return (
    <div className="workspace-card space-y-5">
      <h2 className="workspace-title">A voice is a responsibility.</h2>
      <p className="leading-7">{privacyPromise}</p>
      <p className="text-sm leading-7">
        Record only as the actual speaker. Spoken consent and an explicit written confirmation are
        both required. No voice cloning is enabled in this build. Provider-required verification
        must be completed separately. Wedding and guest records are restricted to the signed-in
        owner through database policies.
      </p>
      <h3 className="text-2xl">Revocation & deletion</h3>
      <p className="text-sm leading-7">
        Request deletion in Voice Studio. Consent is revoked before storage cleanup. Failed external
        deletion remains pending or failed; it is never shown as confirmed. Previously delivered
        content may remain with recipients and cannot be recalled.
      </p>
      <p className="text-sm leading-7">
        Proposed retention: raw recordings and generated assets for up to 30 days after the last
        event, guest/contact data for up to 90 days, restricted consent and security audit records
        for up to 1 year. Automatic retention cleanup is not activated; deployment requires a
        scheduled cleanup job and reviewed retention policy.
      </p>
      <p className="text-sm">
        {data.voices.filter((v) => v.consent_status === "active").length} active consent records ·{" "}
        {data.voices.filter((v) => v.consent_status === "revoked").length} revoked.
      </p>
      <button className="workspace-primary" onClick={onVoice}>
        Manage consent & voice deletion
      </button>
      <p className="workspace-note">
        Indian data-protection obligations, notices, speaker verification, cross-border processing,
        retention and grievance handling require legal review before launch. This application does
        not claim legal compliance.
      </p>
    </div>
  );
}
function Help({ cap }: { cap: Capabilities | null }) {
  return (
    <div className="workspace-card space-y-5">
      <h2 className="workspace-title">Here for your family.</h2>
      <p className="text-sm leading-7">
        Start with your wedding and its events. Add guests, record with consent, then save and
        approve wording. For CSV imports, download the template and use exact event names. Import
        previews show every invalid row; no rows are discarded.
      </p>
      <p className="text-sm leading-7">
        Microphone trouble? Use HTTPS and current Chrome, Edge or Safari, allow microphone access,
        and record 30–60 seconds. Email code missing? Check spam and ask the project owner to verify
        Supabase SMTP and its OTP email template.
      </p>
      {cap?.support && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cap.support) ? (
        <a href={`mailto:${cap.support}`} className="workspace-secondary">
          Email support
        </a>
      ) : (
        <p className="workspace-note">
          Support contact has not been configured. The project owner must set SUPPORT_EMAIL before
          launch.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Hindi navigation is available. Full Hindi form translations, team-assisted review,
        administration and RSVP remain outstanding. No checkout or payment processing is included.
      </p>
    </div>
  );
}
