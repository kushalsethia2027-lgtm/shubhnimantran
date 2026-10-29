import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { User } from "@supabase/supabase-js";
import {
  ArrowUpRight,
  ArrowRight,
  MapPin,
  Search,
  SlidersHorizontal,
  Heart,
  Ticket,
  Plus,
  X,
  Menu,
  ChevronDown,
  CalendarDays,
  Users,
  Check,
  ShieldCheck,
  Star,
  Map as MapIcon,
  List,
  LogOut,
  Copy,
  Sparkles,
  Utensils,
  Coffee,
  Flag,
  RefreshCw,
  Clock,
  ArrowLeft,
} from "lucide-react";
import {
  categories,
  categoryFor,
  filterScenes,
  inr,
  when,
  type Scene,
  type Booking,
  type Review,
} from "./domain";
import * as api from "./backend";
import { CategoryIcon } from "./CategoryIcon";
import { eventTimes } from "./auth-config";
import { SceneMap } from "./SceneMap";
import { Ticket as Invitation } from "./Ticket";
import "./social.css";
type View = "home" | "explore" | "host" | "tickets" | "saved" | "referrals" | "profile";
type Profile = { display_name: string; bio: string };
const initialFilters = {
  search: "",
  category: "",
  area: "",
  price: 50000,
  age: "",
  date: "",
  vibe: "",
  solo: false,
  sober: false,
  period: "",
  language: "",
  openOnly: false,
  minRating: 0,
  sort: "soonest",
  time: "",
};
function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => {
      d?.close();
    };
  }, []);
  return (
    <dialog
      data-clarity-mask="true"
      ref={ref}
      className={`social-modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <span>{title}</span>
        <button className="icon-btn" aria-label="Close dialog" onClick={onClose}>
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function CategoryArt({ category, className = "" }: { category: string; className?: string }) {
  const c = categoryFor(category);
  return (
    <div
      role="img"
      aria-label={`${c.name}: Bollywood-inspired category artwork, not an event photograph`}
      className={`category-art ${c.id} ${className}`}
    />
  );
}
function SceneArt({ event }: { event: Scene }) {
  const c = categoryFor(event.category);
  return (
    <div className={`scene-art photo-art ${c.id}`}>
      <CategoryArt category={c.id} />
      <div className="poster-caption">
        <span>{c.sub}</span>
        <strong>{c.ticket}</strong>
      </div>
    </div>
  );
}
export function SocialApp() {
  const [view, setView] = useState<View>("home");
  const [menu, setMenu] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [map, setMap] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeTarget, setNoticeTarget] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [selected, setSelected] = useState<Scene | null>(null);
  const [auth, setAuth] = useState(false);
  const [request, setRequest] = useState(false);
  const [intro, setIntro] = useState("");
  const [eventReviews, setEventReviews] = useState<Review[]>([]);
  const [guestList, setGuestList] = useState<(Booking & { introduction: string; bio: string })[]>(
    [],
  );
  const [manage, setManage] = useState<Scene | null>(null);
  const [ticket, setTicket] = useState<{ event: Scene; booking?: Booking } | null>(null);
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState<Scene | null>(null);
  const [reporting, setReporting] = useState<Scene | null>(null);
  const [info, setInfo] = useState("");
  const [editing, setEditing] = useState<Scene | null>(null);
  const [hostFormKey, setHostFormKey] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      const dialogs = document.querySelectorAll<HTMLDialogElement>("dialog[open]");
      setNoticeTarget(dialogs.item(dialogs.length - 1) ?? document.body);
    }, 0);
    return () => clearTimeout(timer);
  }, [notice, selected, manage, ticket, auth, reviewing, reporting, editing]);

  const active = scenes.filter((e) => e.status === "published" && new Date(e.ends_at) > new Date());
  const visible = filterScenes(active, filters);
  const own = scenes.filter((e) => e.host_id === user?.id);
  useEffect(() => {
    setSelected((old) => (old && !old.sample ? (scenes.find((e) => e.id === old.id) ?? old) : old));
  }, [scenes]);
  useEffect(() => {
    if (!ticket?.booking) return;
    const latest = myBookings.find((b) => b.id === ticket.booking?.id);
    if (!latest || !["confirmed", "checked_in"].includes(latest.status)) {
      setTicket(null);
      setNotice("Your booking status changed. Check My plans before attending.");
    }
  }, [myBookings, ticket]);

  const openedFromLink = useRef(false);
  useEffect(() => {
    if (openedFromLink.current || !scenes.length) return;
    const id = new URLSearchParams(location.search).get("event");
    const found = scenes.find((e) => e.id === id);
    if (found) {
      setSelected(found);
      setView("explore");
      openedFromLink.current = true;
    }
  }, [scenes]);

  function nav(v: View) {
    setView(v);
    setMenu(false);
    setSelected(null);
    setNotice("");
    const url = new URL(window.location.href);
    url.searchParams.delete("event");
    window.history.replaceState(null, "", url);
    window.location.hash = v === "home" ? "" : v;
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function refresh() {
    setLoading(true);
    setProblem("");
    try {
      if (!api.configured()) return;
      setScenes(await api.events());
    } catch (e) {
      setProblem(api.errorText(e));
    } finally {
      setLoading(false);
    }
  }
  async function personal() {
    try {
      const c = api.db();
      const { data } = await c.auth.getUser();
      setUser(data.user);
      if (!data.user) {
        setMyBookings([]);
        setSaved([]);
        setProfile(null);
        return;
      }
      const [p, b, s, v] = await Promise.all([
        c.from("social_profiles").select("display_name,bio").eq("id", data.user.id).maybeSingle(),
        api.bookings(),
        c.from("social_saved").select("event_id"),
        c.from("social_venues").select("event_id,address"),
      ]);
      if (p.error) throw p.error;
      if (s.error) throw s.error;
      if (v.error) throw v.error;
      setProfile(p.data);
      setMyBookings(b);
      setSaved((s.data ?? []).map((x) => x.event_id));
      setAddresses(Object.fromEntries((v.data ?? []).map((x) => [x.event_id, x.address])));
    } catch (e) {
      setProblem(api.errorText(e));
    }
  }
  useEffect(() => {
    const sync = () => {
      const h = window.location.hash.slice(1);
      if (["home", "explore", "host", "tickets", "saved", "referrals", "profile"].includes(h))
        setView(h as View);
    };
    sync();
    window.addEventListener("hashchange", sync);
    void refresh();
    if (api.configured()) {
      let c;
      try {
        c = api.db();
      } catch (e) {
        setProblem(api.errorText(e));
        return () => window.removeEventListener("hashchange", sync);
      }
      const { data } = c.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setTimeout(() => void personal(), 0);
      });
      void personal();
      return () => {
        data.subscription.unsubscribe();
        window.removeEventListener("hashchange", sync);
      };
    }
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (
      window.location.pathname.replace(/\/$/, "") === "/auth" ||
      query.has("code") ||
      query.has("error") ||
      hash.has("error")
    ) {
      void (async () => {
        try {
          await api.completeGoogle();
          location.replace("/#profile");
        } catch (e) {
          setProblem(api.errorText(e));
          setAuth(true);
        }
      })();
    }
  }, []);
  useEffect(() => {
    if (!selected || selected.sample) {
      setEventReviews([]);
      return;
    }
    void api
      .reviews(selected.id)
      .then(setEventReviews)
      .catch((e) => setProblem(api.errorText(e)));
  }, [selected]);
  useEffect(() => {
    if (!api.configured()) return;
    const focus = () => {
      void refresh();
      if (user) void personal();
    };
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [user]);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setNotice(api.errorText(e));
    } finally {
      setBusy(false);
    }
  }
  function requireProfile() {
    if (!user) {
      setAuth(true);
      return false;
    }
    if (!profile) {
      nav("profile");
      setNotice("Complete your adult profile first. Your date of birth stays private.");
      return false;
    }
    return true;
  }
  async function save(e: Scene) {
    if (e.sample) {
      setNotice("This listing is unavailable. Please choose a published gathering.");
      return;
    }
    if (!requireProfile()) return;
    await act(async () => {
      const c = api.db();
      const q = saved.includes(e.id)
        ? c.from("social_saved").delete().eq("user_id", user!.id).eq("event_id", e.id)
        : c.from("social_saved").insert({ user_id: user!.id, event_id: e.id });
      const { error } = await q;
      if (error) throw error;
      await personal();
      setNotice(saved.includes(e.id) ? "Removed from your saved scenes." : "Saved to your scenes.");
    });
  }
  function open(e: Scene) {
    setSelected(e);
    setRequest(false);
    setIntro("");
    setNotice("");
  }
  async function manageEvent(e: Scene) {
    setManage(e);
    setGuestList([]);
    await act(async () => {
      setGuestList((await api.guests(e.id)) as typeof guestList);
    });
  }
  async function bookingAction(b: Booking, action: string, code?: string) {
    await act(async () => {
      await api.rpc("social_booking_action", {
        p_booking: b.id,
        p_action: action,
        ...(code ? { p_code: code } : {}),
      });
      await refresh();
      await personal();
      if (manage) setGuestList((await api.guests(manage.id)) as typeof guestList);
      setNotice(
        action === "approve"
          ? "Guest confirmed."
          : action === "checkin"
            ? "Guest checked in."
            : "Booking updated.",
      );
    });
  }
  const card = (e: Scene) => (
    <article className="event-card" key={e.id}>
      <button className="card-image" onClick={() => open(e)} aria-label={`View ${e.title}`}>
        <SceneArt event={e} />
        <span className="card-tag">
          {e.alcohol_free ? "SOBER SCENE" : "25+ · ALCOHOL AT VENUE"}
        </span>
      </button>
      <button
        className={`save-event ${saved.includes(e.id) ? "is-saved" : ""}`}
        aria-label={`${saved.includes(e.id) ? "Unsave" : "Save"} ${e.title}`}
        onClick={() => void save(e)}
      >
        <Heart size={18} fill={saved.includes(e.id) ? "currentColor" : "none"} />
      </button>
      <div className="card-copy">
        <p className="card-date">
          {when(e.starts_at)} <span>↗</span>
        </p>
        <button className="card-title" onClick={() => open(e)}>
          {e.title}
        </button>
        <p className="card-area">
          <MapPin size={13} />
          {e.neighbourhood}, {e.city}
        </p>
        <div className="card-bottom">
          <span>
            {`${e.confirmed_count} confirmed`} <span className="tiny-dot">·</span> {e.min_age}
            {e.max_age ? `–${e.max_age}` : "+"}
          </span>
          <strong>{inr(e.price)}</strong>
        </div>
      </div>
    </article>
  );
  return (
    <div className="social-app">
      <header className="s-header">
        <a
          href="/#"
          className="s-brand"
          onClick={(e) => {
            e.preventDefault();
            nav("home");
          }}
        >
          nimantran<span>✳︎</span>
          <small>A GOOD TIME IS CALLING</small>
        </a>
        <nav className={menu ? "nav-open" : ""} aria-label="Main navigation">
          <button className={view === "explore" ? "active" : ""} onClick={() => nav("explore")}>
            Find your scene
          </button>
          <button className={view === "host" ? "active" : ""} onClick={() => nav("host")}>
            Be the host
          </button>
          <button onClick={() => nav("referrals")}>
            Bring your +1 <span className="new-pill">SOON</span>
          </button>
        </nav>
        <div className="header-actions">
          <button
            className="city-badge"
            aria-label="Choose your city"
            onClick={() => {
              nav("explore");
              setShowFilters(true);
            }}
          >
            <MapPin size={15} /> {filters.area || "Delhi NCR"} <ChevronDown size={12} />
          </button>
          <button className="account-btn" onClick={() => (user ? nav("tickets") : setAuth(true))}>
            {user ? (
              <>
                <Ticket size={16} />
                My plans
              </>
            ) : (
              "Sign in"
            )}
            <ArrowUpRight size={15} />
          </button>
          <button
            className="icon-btn mobile-menu"
            aria-label="Toggle navigation"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {notice &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="global-notice" role="status">
            <span>{notice}</span>
            <button aria-label="Dismiss notification" onClick={() => setNotice("")}>
              <X size={17} />
            </button>
          </div>,
          noticeTarget ?? document.body,
        )}
      {view === "home" && (
        <>
          <section className="s-hero">
            <div className="hero-left">
              <p className="eyebrow">
                <span className="live-dot" /> GOOD PEOPLE. GOOD SCENES ONLY.
              </p>
              <h1>
                Go out.
                <br />
                Find <em>your</em>
                <br />
                <span className="scene-underline">
                  people.
                  <svg viewBox="0 0 480 30" aria-hidden="true">
                    <path d="M3 18 Q240 -5 475 12 M30 27 Q270 9 447 21" />
                  </svg>
                </span>
                <span className="hero-spark">✳︎</span>
              </h1>
              <p className="hero-description">
                Thoda filmy. Thoda spontaneous. Very you.
                <br />
                Discover hosted gatherings for adults who are ready to turn “kuch plan karein?” into
                actual plans.
              </p>
              <div className="hero-ctas">
                <button className="s-btn primary" onClick={() => nav("explore")}>
                  Find my scene <ArrowUpRight size={21} />
                </button>
                <button className="s-btn outline" onClick={() => nav("host")}>
                  Host a gathering <Plus size={19} />
                </button>
              </div>
              <div className="hero-foot">
                <span className="little-faces">
                  <i>☺</i>
                  <i>✿</i>
                  <i>☻</i>
                </span>
                <span>
                  Come solo. Bring your curiosity.
                  <br />
                  <strong>Your next story starts here.</strong>
                </span>
              </div>
            </div>
            <div className="hero-right">
              <div className="hero-photo">
                <img
                  src="/social/rooftop.jpg"
                  alt="Illustration of adults sharing a warm rooftop gathering"
                />
                <span className="photo-caption">THE BEST PLANS START WITH A HELLO.</span>
              </div>
              <div className="hero-label">
                <span>
                  YOUR CITY
                  <br />
                  AFTER HOURS
                </span>
                <ArrowUpRight size={32} />
              </div>
              <div className="hero-sticker">
                less scrolling
                <br />
                <strong>more stories.</strong>
                <span>✦</span>
              </div>
              <div className="hero-mini-ticket">
                <span>YOUR INVITATION TO</span>
                <strong>
                  a really
                  <br />
                  good time.
                </strong>
                <div>
                  ADMIT ONE · BE YOURSELF <span>✳︎</span>
                </div>
              </div>
              <span className="photo-disclosure">NIMANTRAN ORIGINAL ARTWORK</span>
            </div>
          </section>
          <div className="s-marquee" aria-hidden="true">
            <span>NEW FACES</span>✳︎<span>GOOD ENERGY</span>✳︎<span>GOOD COMPANY</span>✳︎
            <span>YOUR KIND OF PLANS</span>✳︎<span>NEW FACES</span>✳︎<span>GOOD ENERGY</span>
          </div>
          <section className="s-section categories-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">SAME CITY. SO MANY SCENES.</p>
                <h2>
                  What’s your <em>vibe?</em>
                </h2>
              </div>
              <p>
                Pick an interest.
                <br />
                Find a reason to step out.
              </p>
            </div>
            <div className="category-grid">
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={`category-card ${c.id}`}
                  onClick={() => {
                    setFilters({ ...initialFilters, category: c.id });
                    nav("explore");
                  }}
                >
                  <CategoryArt category={c.id} />
                  <span>
                    <strong>{c.name}</strong>
                    <small>{c.sub}</small>
                  </span>
                  <ArrowUpRight size={21} />
                </button>
              ))}
            </div>
          </section>
          <section className="s-section lineup">
            <div className="section-heading">
              <div>
                <p className="eyebrow">APNI VIBE KE LOG</p>
                <h2>
                  Your next <em>“I’m in.”</em>
                </h2>
              </div>
              <button className="text-arrow" onClick={() => nav("explore")}>
                Explore the line-up <ArrowRight size={18} />
              </button>
            </div>
            {active.length ? (
              <div className="event-grid">{active.slice(0, 3).map(card)}</div>
            ) : (
              <div className="launch-invitation">
                <span>✦</span>
                <div>
                  <h3>Make the first move.</h3>
                  <p>
                    The guest list starts with a good host. Bring your board-game night, supper club
                    or music gathering to Nimantran.
                  </p>
                </div>
                <button className="s-btn primary" onClick={() => nav("host")}>
                  Create a gathering <Plus size={18} />
                </button>
              </div>
            )}
          </section>
          <section className="story-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">STARRING: YOU, ACTUALLY MAKING PLANS</p>
                <h2>
                  Picture abhi
                  <br />
                  <em>shuru hui hai.</em>
                </h2>
              </div>
              <p>
                A shared interest is a pretty good
                <br />
                place to start a conversation.
              </p>
            </div>
            <div className="story-grid">
              {[
                [
                  "01",
                  "Entry solo.\nEvening shared.",
                  "Gatherings that welcome you, even when you’re coming on your own.",
                  "☻",
                ],
                [
                  "02",
                  "Apni vibe\nke log.",
                  "A board game, a shared table, a favourite chorus. Find your common ground.",
                  "✳︎",
                ],
                [
                  "03",
                  "Chai se\ndance floor tak.",
                  "A quiet conversation or a lively evening. Choose your kind of energy.",
                  "◒",
                ],
                [
                  "04",
                  "Aapka Nimantran\naa gaya.",
                  "Confirmed plans come with a ticket that dresses for the occasion.",
                  "↗",
                ],
              ].map(([n, t, d, icon]) => (
                <article key={n}>
                  <div>
                    <span>SCENE {n}</span>
                    <span>{icon}</span>
                  </div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="s-section ticket-section">
            <div>
              <p className="eyebrow">LESS TRANSACTION. MORE INVITATION.</p>
              <h2>
                A ticket with
                <br />
                <em>
                  main-character
                  <br />
                  energy.
                </em>
              </h2>
              <p className="section-body">
                A little filmy souvenir for your next good story. Every confirmed booking gets a
                Nimantran styled for its scene.
              </p>
              <button className="text-arrow" onClick={() => nav("explore")}>
                Find your next invitation <ArrowUpRight size={19} />
              </button>
              <small>Your invitation is issued when your host confirms your booking.</small>
            </div>
            <div className="ticket-showcase">
              <div
                className="ticket-theme dance"
                style={{ "--ticket-color": "#b63360" } as React.CSSProperties}
              >
                <div className="ticket-top">
                  <span>nimantran ✦</span>
                  <Ticket size={27} />
                </div>
                <p className="eyebrow">AAJ KI MEHFIL</p>
                <h3>
                  Your name.
                  <br />
                  Your scene.
                  <br />
                  Your Nimantran.
                </h3>
                <p className="ticket-promise">
                  Styled for the occasion.
                  <br />
                  Made just for your confirmed plan.
                </p>
                <div className="ticket-perf" />
                <div className="ticket-bottom">
                  <span>GOOD COMPANY. GREAT STORIES.</span>
                </div>
              </div>
              <div className="ticket-side-label">YOU’RE ON THE LIST. ✳︎</div>
            </div>
          </section>
          <section className="host-banner">
            <span className="big-star">✳︎</span>
            <div>
              <p className="eyebrow">GOT A PLAN? MAKE IT A SCENE.</p>
              <h2>
                Your table.
                <br />
                Your people. <em>Your call.</em>
              </h2>
              <p>
                Create a gathering, tell guests what to expect, and review introductions before
                approving anyone.
              </p>
              <button className="s-btn cream" onClick={() => nav("host")}>
                Let’s host something <ArrowUpRight size={20} />
              </button>
            </div>
            <div className="host-doodle">
              GOOD
              <br />
              HOSTS.
              <br />
              <em>GREAT</em>
              <br />
              STORIES.
            </div>
          </section>
          <section className="s-section how-section">
            <p className="eyebrow">THREE STEPS. ONE GOOD EVENING.</p>
            <div>
              {[
                ["01", "Find your scene", "Browse by interest, neighbourhood, budget and energy."],
                ["02", "Say a little hello", "Introduce yourself. Your host reviews your request."],
                [
                  "03",
                  "Make an entrance",
                  "When confirmed, open your ticket and show up as yourself.",
                ],
              ].map(([n, t, b]) => (
                <article key={n}>
                  <span>{n}</span>
                  <h3>{t}</h3>
                  <p>{b}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
      {view === "explore" && (
        <main className="s-section explore-page">
          <div className="explore-heading">
            <div>
              <p className="eyebrow">GOOD COMPANY · ADULTS ONLY</p>
              <h1>
                Find your <em>scene.</em>
              </h1>
              <p>A little less “maybe.” A little more “see you there.”</p>
            </div>
            <div className="view-switch">
              <button aria-pressed={!map} onClick={() => setMap(false)}>
                <List size={17} />
                List
              </button>
              <button aria-pressed={map} onClick={() => setMap(true)}>
                <MapIcon size={17} />
                Map
              </button>
            </div>
          </div>
          <div className="search-bar">
            <Search size={21} />
            <input
              aria-label="Search events"
              placeholder="A neighbourhood, a game, a little karaoke…"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            <button onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}>
              <SlidersHorizontal size={17} />
              Filters
            </button>
          </div>
          <div className="category-chips">
            <button
              className={!filters.category ? "chosen" : ""}
              onClick={() => setFilters({ ...filters, category: "" })}
            >
              ✳︎ All scenes
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                className={filters.category === c.id ? "chosen" : ""}
                onClick={() => setFilters({ ...filters, category: c.id })}
              >
                <CategoryIcon category={c.id} size={13} /> {c.name}
              </button>
            ))}
          </div>
          <div className="quick-filters">
            <label>
              <input
                type="checkbox"
                checked={filters.solo}
                onChange={(e) => setFilters({ ...filters, solo: e.target.checked })}
              />
              Solo-friendly
            </label>
            <label>
              <input
                type="checkbox"
                checked={filters.sober}
                onChange={(e) => setFilters({ ...filters, sober: e.target.checked })}
              />
              Sober scenes
            </label>
            <button className="s-link" onClick={() => setFilters(initialFilters)}>
              Reset filters
            </button>
          </div>
          {showFilters && (
            <div className="filter-panel">
              <label>
                City
                <select
                  aria-label="City"
                  value={filters.area}
                  onChange={(e) => setFilters({ ...filters, area: e.target.value })}
                >
                  <option>Gurgaon</option>
                  <option value="">All Delhi NCR</option>
                  <option>Delhi</option>
                  <option>Noida</option>
                  <option>Faridabad</option>
                  <option>Ghaziabad</option>
                </select>
              </label>
              <label>
                Date (IST)
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilters({ ...filters, date: e.target.value, period: "" })}
                />
              </label>
              <label>
                Maximum price
                <select
                  aria-label="Maximum price"
                  value={filters.price}
                  onChange={(e) => setFilters({ ...filters, price: Number(e.target.value) })}
                >
                  <option value={50000}>Any budget</option>
                  <option value={0}>Free</option>
                  <option value={500}>Up to ₹500</option>
                  <option value={1000}>Up to ₹1,000</option>
                  <option value={2000}>Up to ₹2,000</option>
                </select>
              </label>
              <label>
                Your age
                <input
                  type="number"
                  min={18}
                  max={100}
                  placeholder="18+"
                  value={filters.age}
                  onChange={(e) => setFilters({ ...filters, age: e.target.value })}
                />
              </label>
              <label>
                Time of day
                <select
                  aria-label="Time of day"
                  value={filters.time}
                  onChange={(e) => setFilters({ ...filters, time: e.target.value })}
                >
                  <option value="">Any time</option>
                  <option value="day">Daytime · 6am–6pm</option>
                  <option value="night">Evening & late night</option>
                </select>
              </label>
              <label>
                Language
                <select
                  aria-label="Language"
                  value={filters.language}
                  onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                >
                  <option value="">Any language</option>
                  <option>Hindi</option>
                  <option>English</option>
                  <option>Punjabi</option>
                </select>
              </label>
              <label>
                Host rating
                <select
                  aria-label="Host rating"
                  value={filters.minRating}
                  onChange={(e) => setFilters({ ...filters, minRating: Number(e.target.value) })}
                >
                  <option value={0}>All hosts, including new</option>
                  <option value={4}>4 stars and above</option>
                  <option value={4.5}>4.5 stars and above</option>
                </select>
              </label>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={filters.openOnly}
                  onChange={(e) => setFilters({ ...filters, openOnly: e.target.checked })}
                />
                Places available
              </label>
              <label>
                Atmosphere
                <select
                  aria-label="Atmosphere"
                  value={filters.vibe}
                  onChange={(e) => setFilters({ ...filters, vibe: e.target.value })}
                >
                  <option value="">Any energy</option>
                  {["Conversational", "Relaxed", "Playful", "High energy"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <div className="discovery-toolbar">
            <div className="period-chips">
              {[
                ["", "Any day"],
                ["today", "Today"],
                ["weekend", "This weekend"],
                ["week", "Next 7 days"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={filters.period === id}
                  onClick={() => setFilters({ ...filters, period: id!, date: "" })}
                >
                  {label}
                </button>
              ))}
            </div>
            <label>
              Sort by
              <select
                aria-label="Sort by"
                value={filters.sort}
                onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
              >
                <option value="soonest">Soonest first</option>
                <option value="price">Lowest price</option>
                <option value="popular">Most confirmed guests</option>
                <option value="rating">Host rating</option>
              </select>
            </label>
          </div>
          <div className="results-heading">
            <span>{loading ? "Finding scenes…" : `${visible.length} gatherings`}</span>
            <div>
              <button
                className="icon-btn"
                aria-label="Refresh events"
                onClick={() => void refresh()}
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
          {problem && (
            <details className="setup-details">
              <summary>Connection information</summary>
              <p>{problem}</p>
            </details>
          )}
          {map ? (
            <div className="map-layout">
              <div className="map-list">
                {visible.length ? (
                  visible.map(card)
                ) : (
                  <div className="empty-state">
                    <MapPin size={30} />
                    <h3>No gatherings in these filters yet.</h3>
                    <p>Try another area or host a gathering.</p>
                    <button className="s-btn outline" onClick={() => nav("host")}>
                      Be the host
                    </button>
                  </div>
                )}
              </div>
              <SceneMap events={visible} onSelect={open} />
            </div>
          ) : !visible.length ? (
            <div className="empty-state">
              <Search size={36} />
              <h2>
                {active.length ? "Find a different scene." : "Your next good plan starts here."}
              </h2>
              <p>
                {active.length
                  ? "Try another category, date or budget."
                  : "No upcoming gatherings are listed yet. Host one and bring your people together."}
              </p>
              <button
                className="s-btn outline"
                onClick={() => (active.length ? setFilters(initialFilters) : nav("host"))}
              >
                {active.length ? "Clear filters" : "Host a gathering"}
              </button>
            </div>
          ) : (
            <div className="event-grid">{visible.map(card)}</div>
          )}
        </main>
      )}
      {view === "host" && (
        <main className="s-section host-page">
          <div className="explore-heading">
            <div>
              <p className="eyebrow">BRING PEOPLE TOGETHER · GOOD COMPANY</p>
              <h1>
                Be the <em>reason.</em>
              </h1>
              <p>A good host makes room for a good story.</p>
            </div>
            <span className="host-page-star">✳︎</span>
          </div>
          {user && profile && (
            <div className="host-dashboard">
              <div>
                <strong>{own.length}</strong>
                <span>Your listings</span>
              </div>
              <div>
                <strong>{own[0]?.host_events ?? 0}</strong>
                <span>Completed gatherings</span>
              </div>
              <div>
                <strong>{own.reduce((n, e) => n + Number(e.confirmed_count), 0)}</strong>
                <span>Confirmed places</span>
              </div>
            </div>
          )}
          {own.length > 0 && (
            <section className="your-events">
              <h2>Your gatherings</h2>
              {own.map((e) => (
                <div key={e.id}>
                  <span>
                    <strong>{e.title}</strong>
                    <small>
                      {when(e.starts_at)} · {e.status} · {e.confirmed_count}/{e.capacity} confirmed
                    </small>
                  </span>
                  <button className="s-btn outline small" onClick={() => void manageEvent(e)}>
                    Manage guests <ArrowUpRight size={15} />
                  </button>
                  {e.status === "published" && new Date(e.starts_at) > new Date() && (
                    <button
                      className="s-link"
                      onClick={() => {
                        if (
                          confirm("Cancel this event and all its pending and confirmed bookings?")
                        )
                          void act(async () => {
                            await api.rpc("social_cancel_event", { p_event: e.id });
                            await refresh();
                            setNotice("Event and affected bookings cancelled.");
                          });
                      }}
                    >
                      Cancel event
                    </button>
                  )}
                  {e.status === "published" && new Date(e.starts_at) > new Date() && (
                    <button className="s-link" onClick={() => setEditing(e)}>
                      Edit details
                    </button>
                  )}
                </div>
              ))}
            </section>
          )}
          <div className="host-form-layout">
            <HostForm
              key={hostFormKey}
              disabled={busy}
              signedIn={Boolean(user && profile)}
              onSignIn={() => {
                if (user) nav("profile");
                else setAuth(true);
              }}
              onPublish={(data) =>
                act(async () => {
                  const id = await api.rpc<string>("social_publish", { p_data: data });
                  await refresh();
                  const list = await api.events();
                  setScenes(list);
                  const e = list.find((x) => x.id === id);
                  if (e) open(e);
                  sessionStorage.removeItem("nimantran-host-draft");
                  setHostFormKey((k) => k + 1);
                  setNotice(
                    "Your gathering is published. Guests can introduce themselves and request to join.",
                  );
                })
              }
            />
            <aside className="host-aside">
              <span>✿</span>
              <h3>
                Your guest list.
                <br />
                Your call.
              </h3>
              <p>
                Every guest writes an introduction. Read their profile and approve the people you
                want to welcome.
              </p>
              <hr />
              <h4>A thoughtful host makes it clear.</h4>
              <p>
                Describe the plan, inclusions, venue access and cancellation terms. Keep exact
                private addresses off public listings.
              </p>
              <div className="preview-note">
                Paid checkout isn’t connected yet. Free events can complete request → approval →
                ticket → check-in.
              </div>
            </aside>
          </div>
        </main>
      )}
      {["tickets", "saved", "profile", "referrals"].includes(view) && (
        <main data-clarity-mask="true" className="s-section account-page">
          <div className="account-nav">
            <button onClick={() => nav("tickets")} className={view === "tickets" ? "active" : ""}>
              <Ticket size={17} />
              My plans
            </button>
            <button onClick={() => nav("saved")} className={view === "saved" ? "active" : ""}>
              <Heart size={17} />
              Saved scenes
            </button>
            <button onClick={() => nav("profile")} className={view === "profile" ? "active" : ""}>
              <Users size={17} />
              My profile
            </button>
            <button
              onClick={() => nav("referrals")}
              className={view === "referrals" ? "active" : ""}
            >
              <Plus size={17} />
              Bring your +1
            </button>
          </div>
          {view === "referrals" ? (
            <div className="referral-card">
              <span>+1</span>
              <p className="eyebrow">GOOD PLANS ARE BETTER SHARED</p>
              <h1>
                Bring your people.
                <br />
                <em>Find some more.</em>
              </h1>
              <p>
                We’re planning ₹250 in future booking credit for you and a new friend after their
                first qualifying attended event.
              </p>
              <strong>Coming soon. Rewards are not active and no credit has been issued.</strong>
              <p>
                Minimum spend, expiry and campaign limits will be published before launch. Booking
                credit will not be cash.
              </p>
              <button
                className="s-btn primary"
                onClick={() =>
                  void act(async () => {
                    const url = user ? `${location.origin}/?ref=${user.id}` : location.origin + "/";
                    await navigator.clipboard.writeText(url);
                    setNotice("Invitation link copied. Sharing does not currently earn rewards.");
                  })
                }
              >
                <Copy size={17} />
                Copy an invitation link
              </button>
            </div>
          ) : !user ? (
            <div className="empty-state">
              <Ticket size={40} />
              <h1>Your next scene starts here.</h1>
              <p>Sign in to manage your profile, saved gatherings and bookings.</p>
              <button className="s-btn primary" onClick={() => setAuth(true)}>
                {busy ? "Opening Google…" : "Continue with Google"} <ArrowUpRight size={18} />
              </button>
            </div>
          ) : view === "profile" ? (
            <>
              <p className="eyebrow">COME AS YOURSELF</p>
              <h1>
                A little <em>hello.</em>
              </h1>
              <ProfileForm
                profile={profile}
                onSave={(data) =>
                  act(async () => {
                    await api.rpc("social_profile", data);
                    await personal();
                    const resume = sessionStorage.getItem("nimantran-auth-return");
                    sessionStorage.removeItem("nimantran-auth-return");
                    if (resume === "host") nav("host");
                    setNotice("Your profile is saved.");
                  })
                }
              />
              <button
                className="s-link"
                onClick={() =>
                  void act(async () => {
                    await api.db().auth.signOut();
                    setUser(null);
                    setProfile(null);
                    setMyBookings([]);
                    setSaved([]);
                    setAddresses({});
                    setNotice("Signed out.");
                  })
                }
              >
                <LogOut size={17} />
                Sign out
              </button>
            </>
          ) : view === "saved" ? (
            <>
              <h1>
                Your saved <em>scenes.</em>
              </h1>
              <div className="event-grid">
                {scenes.filter((e) => saved.includes(e.id)).map(card)}
              </div>
              {!saved.length && (
                <div className="empty-state">
                  <Heart size={35} />
                  <p>Something catch your eye? Save a live gathering and find it here.</p>
                  <button className="s-btn outline" onClick={() => nav("explore")}>
                    Find a scene
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="eyebrow">YOUR SOCIAL CALENDAR</p>
              <h1>
                Plans worth <em>keeping.</em>
              </h1>
              <button className="s-link" onClick={() => void act(personal)}>
                <RefreshCw size={16} />
                Refresh bookings
              </button>
              {!myBookings.length && (
                <div className="empty-state">
                  <Ticket size={40} />
                  <h2>Your calendar has room for a story.</h2>
                  <p>Browse a live gathering and send your host an introduction.</p>
                  <button className="s-btn primary" onClick={() => nav("explore")}>
                    Find your scene
                  </button>
                </div>
              )}
              {myBookings.map((b) => {
                const e = scenes.find((x) => x.id === b.event_id);
                return (
                  <article className="booking-row" key={b.id}>
                    <div>
                      <span className={`status-label ${b.status}`}>
                        {b.status.replace("_", " ")}
                      </span>
                      <h3>{e?.title ?? "Event unavailable"}</h3>
                      <p>{e ? when(e.starts_at) : "Refresh to check this event."}</p>
                      {b.status === "requested" && (
                        <p>
                          Your host is reviewing your introduction. This is not a confirmed ticket.
                        </p>
                      )}
                      {e && addresses[e.id] && ["confirmed", "checked_in"].includes(b.status) && (
                        <p data-clarity-mask="true">
                          <MapPin size={15} />
                          {addresses[e.id]}
                        </p>
                      )}
                    </div>
                    <div>
                      {e && ["confirmed", "checked_in"].includes(b.status) && (
                        <button
                          className="s-btn primary small"
                          onClick={() => setTicket({ event: e, booking: b })}
                        >
                          Open my Nimantran <Ticket size={16} />
                        </button>
                      )}
                      {e && b.status === "checked_in" && new Date(e.ends_at) < new Date() && (
                        <button className="s-btn outline small" onClick={() => setReviewing(e)}>
                          Leave a review
                        </button>
                      )}
                      {e &&
                        ["requested", "confirmed", "awaiting_payment"].includes(b.status) &&
                        new Date(e.starts_at) > new Date() && (
                          <button
                            className="s-link"
                            onClick={() => {
                              if (confirm("Cancel this request or booking?"))
                                void bookingAction(b, "cancel");
                            }}
                          >
                            Cancel booking
                          </button>
                        )}
                    </div>
                  </article>
                );
              })}
            </>
          )}
        </main>
      )}
      <footer className="s-footer">
        <div>
          <a
            className="s-brand"
            href="/#"
            onClick={(e) => {
              e.preventDefault();
              nav("home");
            }}
          >
            nimantran<span>✳︎</span>
          </a>
          <p>Your city. Your people. Your next story.</p>
          <small>Delhi NCR. Adults 18+ only.</small>
        </div>
        <div>
          <button onClick={() => nav("explore")}>Find your scene</button>
          <button onClick={() => nav("host")}>Host a gathering</button>
          <button onClick={() => setInfo("Community guidelines")}>Community guidelines</button>
          <button onClick={() => setInfo("Privacy & booking terms")}>
            Privacy & booking terms
          </button>
        </div>
        <div className="footer-note">
          THODA FILMY.
          <br />
          VERY HUMAN.<span>Made for meeting, not endless scrolling.</span>
        </div>
      </footer>
      {auth && (
        <Modal title="Your next scene starts here" onClose={() => setAuth(false)}>
          <div className="auth-content">
            <span className="auth-star">✳︎</span>
            <h2>
              Come as <em>yourself.</em>
            </h2>
            <p>Sign in with Google to introduce yourself, host a gathering or manage your plans.</p>
            <button
              className="s-btn primary"
              disabled={busy}
              onClick={() => void act(() => api.google(view))}
            >
              {busy ? "Opening Google…" : "Continue with Google"} <ArrowUpRight size={18} />
            </button>
            <p className="fineprint">
              Adults 18+ only. You’ll confirm your date of birth before requesting a place. Google
              sign-in does not verify your age.
            </p>
            {!api.configured() && (
              <div className="preview-note">
                Sign-in is temporarily unavailable. Please try again once account setup is complete.
              </div>
            )}
            {problem && <p className="form-error">{problem}</p>}
          </div>
        </Modal>
      )}
      {selected && (
        <Modal title="YOUR NEXT SCENE" onClose={() => setSelected(null)} wide>
          <div className="detail-layout">
            <div>
              <SceneArt event={selected} />
              <div className="detail-body">
                <p className="eyebrow">
                  {categoryFor(selected.category).name} · {selected.city}
                </p>
                <h2>{selected.title}</h2>
                <p>{selected.description}</p>
                <div className="detail-facts">
                  <span>
                    <CalendarDays size={18} />
                    {when(selected.starts_at)} IST
                  </span>
                  <span>
                    <MapPin size={18} />
                    {selected.neighbourhood}, {selected.city}
                  </span>
                  <span>
                    <Users size={18} />
                    {selected.min_age}
                    {selected.max_age ? `–${selected.max_age}` : "+"} · {selected.capacity} places ·{" "}
                    {selected.atmosphere}
                  </span>
                  <span>
                    <Coffee size={18} />
                    {selected.alcohol_free
                      ? "Sober scene · no alcohol"
                      : "Alcohol available · age 25+ platform policy"}
                  </span>
                </div>
                <p className="fineprint">
                  Category artwork sets the mood. Check the host’s description for actual activities
                  and performers.
                </p>
                <h3>Know before you go</h3>
                <dl className="inclusions">
                  {[
                    ["Food", selected.food],
                    ["Drinks", selected.drinks],
                    ["Also included", selected.includes],
                    ["Extra costs", selected.extra_costs],
                    ["Bring along", selected.bring],
                    ["Language", selected.language],
                    ["Access", selected.accessibility],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v || "Ask the host before booking"}</dd>
                    </div>
                  ))}
                </dl>
                <h3>The house rules</h3>
                <p>{selected.rules}</p>
                <h3>Cancellations</h3>
                <p>{selected.cancellation}</p>
                <div className="host-profile">
                  <div className="host-avatar">{selected.host_name.charAt(0)}</div>
                  <div>
                    <strong>Hosted by {selected.host_name}</strong>
                    <p>
                      {`${selected.host_events} completed gatherings · ${selected.review_count ? `${selected.rating} / 5 from ${selected.review_count} reviews` : "New host · no reviews yet"}`}
                    </p>
                  </div>
                </div>
                <h3>Stories from the scene</h3>
                {!eventReviews.length ? (
                  <p>
                    No attendee reviews yet. Reviews require checked-in attendance and a completed
                    event.
                  </p>
                ) : (
                  eventReviews.map((r) => (
                    <article className="review" key={r.id}>
                      <strong>
                        {r.guest_name} · {r.rating}/5
                      </strong>
                      <p>{r.body}</p>
                      {r.host_reply && <blockquote>Host reply: {r.host_reply}</blockquote>}
                      {selected.host_id === user?.id && !r.host_reply && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const data = new FormData(e.currentTarget);
                            void act(async () => {
                              await api.rpc("social_reply", {
                                p_review: r.id,
                                p_body: data.get("reply"),
                              });
                              setEventReviews(await api.reviews(selected.id));
                              setNotice("Reply posted.");
                            });
                          }}
                        >
                          <input
                            name="reply"
                            required
                            minLength={2}
                            maxLength={1000}
                            placeholder="Reply as the host"
                            aria-label="Host reply"
                          />
                          <button className="s-link" disabled={busy}>
                            Post reply
                          </button>
                        </form>
                      )}
                    </article>
                  ))
                )}
                {!selected.sample && (
                  <button className="s-link" onClick={() => setReporting(selected)}>
                    <Flag size={15} />
                    Report this event
                  </button>
                )}
              </div>
            </div>
            <aside className="booking-panel">
              <p className="eyebrow">YOUR PLACE AT THE GATHERING</p>
              {!selected.sample && (
                <button
                  className="s-link"
                  onClick={() =>
                    void act(async () => {
                      await navigator.clipboard.writeText(
                        `${location.origin}/?event=${selected.id}`,
                      );
                      setNotice("Event link copied. Exact private addresses are not included.");
                    })
                  }
                >
                  <Copy size={14} />
                  Share this scene
                </button>
              )}
              <strong className="detail-price">{inr(selected.price)}</strong>
              <p>{selected.price ? "per person · see all inclusions" : "Entry is free"}</p>
              <div className="booking-count">
                <Users size={18} />
                {`${selected.confirmed_count} confirmed`} ·{" "}
                {Math.max(0, selected.capacity - selected.confirmed_count)} places left
              </div>
              {selected.host_id === user?.id ? (
                <button className="s-btn primary" onClick={() => void manageEvent(selected)}>
                  Manage your guests
                </button>
              ) : myBookings.some((b) => b.event_id === selected.id) ? (
                <button
                  className="s-btn outline"
                  onClick={() => {
                    setSelected(null);
                    nav("tickets");
                  }}
                >
                  View your request
                </button>
              ) : new Date(selected.starts_at) <= new Date() ? (
                <p>This event has started. Requests are closed.</p>
              ) : selected.status !== "published" ? (
                <p>This event has been cancelled.</p>
              ) : selected.confirmed_count >= selected.capacity ? (
                <p>This gathering is full.</p>
              ) : request ? (
                <form
                  className="request-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act(async () => {
                      await api.rpc("social_request", { p_event: selected.id, p_intro: intro });
                      await personal();
                      setRequest(false);
                      setNotice(
                        "Introduction sent. Your place is not confirmed until the host approves.",
                      );
                    });
                  }}
                >
                  <label>
                    Say a little hello
                    <textarea
                      value={intro}
                      onChange={(e) => setIntro(e.target.value)}
                      minLength={20}
                      maxLength={1000}
                      required
                      placeholder="What brings you here? Tell your host a little about yourself."
                    />
                  </label>
                  <label className="check-field">
                    <input type="checkbox" required />I meet the event’s age rules and agree to its
                    house rules and cancellation terms.
                  </label>
                  <button className="s-btn primary" disabled={busy}>
                    Send join request <ArrowUpRight size={17} />
                  </button>
                </form>
              ) : (
                <button
                  className="s-btn primary"
                  disabled={busy}
                  onClick={() => {
                    if (requireProfile()) setRequest(true);
                  }}
                >
                  Request to join <ArrowUpRight size={18} />
                </button>
              )}
              {selected.price > 0 && !selected.sample && (
                <p className="fineprint">
                  Paid checkout is not enabled yet. You can send an introduction, but paid places
                  cannot currently be confirmed.
                </p>
              )}
              <p className="fineprint">
                <ShieldCheck size={15} /> Host approval is required. Exact private venue details are
                available only after confirmation.
              </p>
              <p className="fineprint">
                Hosts organise their own gatherings. A listing or profile does not guarantee safety.
              </p>
            </aside>
          </div>
        </Modal>
      )}
      {ticket && (
        <Modal title="AAPKA NIMANTRAN" onClose={() => setTicket(null)}>
          <Invitation
            event={ticket.event}
            {...(ticket.booking ? { booking: ticket.booking } : {})}
          />
          <p className="fineprint">
            {ticket.booking
              ? "Keep your code private. View the exact venue in My plans."
              : "A ticket is issued only after booking confirmation."}
          </p>
        </Modal>
      )}
      {manage && (
        <Modal title={`GUEST LIST · ${manage.title}`} onClose={() => setManage(null)} wide>
          <div className="manage-content">
            <p>
              Read introductions before approving guests. A free place is confirmed only after your
              approval. Paid checkout is unavailable.
            </p>
            <button className="s-link" onClick={() => void manageEvent(manage)}>
              <RefreshCw size={15} />
              Refresh guest list
            </button>
            {!guestList.length && (
              <div className="empty-state">
                <Users size={35} />
                <p>No requests yet. Share your gathering and check back here.</p>
              </div>
            )}
            {guestList.map((b) => (
              <article className="guest-row" key={b.id}>
                <div>
                  <strong>{b.guest_name}</strong>
                  <span className="status-label">{b.status}</span>
                  <p>{b.introduction}</p>
                  <small>{b.bio}</small>
                </div>
                <div>
                  {b.status === "requested" && (
                    <>
                      <button
                        className="s-btn primary small"
                        disabled={busy}
                        onClick={() => void bookingAction(b, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        className="s-btn outline small"
                        disabled={busy}
                        onClick={() => void bookingAction(b, "decline")}
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {b.status === "confirmed" && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const code = new FormData(e.currentTarget).get("code") as string;
                        void bookingAction(b, "checkin", code);
                      }}
                    >
                      <label>
                        Guest’s check-in code
                        <input name="code" required placeholder="Paste code from their ticket" />
                      </label>
                      <button className="s-btn outline small" disabled={busy}>
                        Check in
                      </button>
                    </form>
                  )}
                </div>
              </article>
            ))}
          </div>
        </Modal>
      )}
      {reviewing && (
        <Modal title="HOW WAS YOUR SCENE?" onClose={() => setReviewing(null)}>
          <form
            className="s-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void act(async () => {
                await api.rpc("social_review", {
                  p_event: reviewing.id,
                  p_rating: Number(f.get("rating")),
                  p_body: f.get("body"),
                });
                setReviewing(null);
                setNotice("Your attendance-backed review is posted.");
                await refresh();
              });
            }}
          >
            <label>
              Your rating
              <select name="rating" required>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} / 5
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tell future guests what to expect
              <textarea name="body" minLength={10} maxLength={1500} required />
            </label>
            <button className="s-btn primary" disabled={busy}>
              Post review
            </button>
          </form>
        </Modal>
      )}
      {reporting && (
        <Modal title="REPORT AN ISSUE" onClose={() => setReporting(null)}>
          <form
            className="s-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!requireProfile()) return;
              const f = new FormData(e.currentTarget);
              void act(async () => {
                await api.rpc("social_report", { p_event: reporting.id, p_body: f.get("body") });
                setReporting(null);
                setNotice(
                  "Your report was saved for operator review. This is not an emergency service.",
                );
              });
            }}
          >
            <p>
              Reports are private to you and the platform operator. For immediate danger, contact
              local emergency services.
            </p>
            <label>
              What happened?
              <textarea name="body" required minLength={10} maxLength={2000} />
            </label>
            <button className="s-btn primary" disabled={busy}>
              Submit report
            </button>
          </form>
        </Modal>
      )}
      {editing && (
        <Modal title="EDIT YOUR GATHERING" onClose={() => setEditing(null)}>
          <form
            className="s-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void act(async () => {
                await api.rpc("social_edit_event", {
                  p_event: editing.id,
                  p_revision: editing.revision,
                  p_data: Object.fromEntries(f),
                });
                setEditing(null);
                await refresh();
                setNotice("Your gathering details are updated.");
              });
            }}
          >
            <p className="fineprint">
              Details can be edited only before any active guest requests. Date, price and venue
              changes require cancelling and relisting.
            </p>
            {(
              [
                "title",
                "description",
                "food",
                "drinks",
                "includes",
                "extra_costs",
                "bring",
                "rules",
                "cancellation",
              ] as const
            ).map((key) => (
              <label key={key}>
                {key.replace("_", " ")}
                <textarea
                  name={key}
                  defaultValue={editing[key]}
                  required={key !== "bring"}
                  minLength={
                    key === "description" ? 30 : key === "rules" || key === "cancellation" ? 10 : 2
                  }
                  maxLength={key === "description" ? 3000 : key === "title" ? 100 : 1000}
                />
              </label>
            ))}
            <button className="s-btn primary" disabled={busy}>
              Save changes
            </button>
          </form>
        </Modal>
      )}
      {info && (
        <Modal title={info} onClose={() => setInfo("")}>
          <div className="policy-content">
            {info === "Community guidelines" ? (
              <>
                <h2>A good scene starts with respect.</h2>
                <p>
                  Nimantran is for adults 18+. Respect consent, boundaries and venue rules. Ask
                  before photographing people. Harassment, discrimination, illegal activity and
                  misleading listings are not welcome.
                </p>
                <p>
                  Hosts must describe the event accurately and have permission to use their venue.
                  Alcohol availability must meet local law and venue permissions; the platform uses
                  a minimum age of 25 for listings that are not alcohol-free.
                </p>
                <p>
                  Check each event’s inclusions and eligibility. Report an issue through the event
                  page. Reports are stored for operator review, but response times are not
                  guaranteed. This is not an emergency service.
                </p>
              </>
            ) : (
              <>
                <h2>Your plans, with clear expectations.</h2>
                <p>
                  Google sign-in establishes your account. Your profile name and introduction are
                  shared with hosts when you request to join. Your date of birth stays private and
                  is used for age eligibility; it is self-declared, not identity verification.
                </p>
                <p>
                  Exact private venue addresses and ticket codes are limited to authorised hosts and
                  confirmed guests. Public event pins show approximate neighbourhoods. Do not post
                  phone numbers, identity documents or sensitive personal details in profiles or
                  introductions.
                </p>
                <p>
                  Paid checkout and referral rewards are not active. No payment is taken by this
                  release. Free bookings require host approval and follow the event’s stated
                  cancellation terms. Save your ticket after confirmation.
                </p>
                <p>
                  Microsoft Clarity analytics is installed. Account, booking and ticket areas are
                  masked in the app. Map view loads tiles from OpenStreetMap. Account deletion and
                  privacy requests currently require contacting the operator through the channel
                  where you joined; dedicated support contact and final commercial terms are
                  required before public launch.
                </p>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
function ProfileForm({
  profile,
  onSave,
}: {
  profile: Profile | null;
  onSave: (d: Record<string, unknown>) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  return (
    <form
      className="s-form profile-form"
      data-clarity-mask="true"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const stored = await api.db().from("social_accounts").select("dob").maybeSingle();
        if (stored.error) {
          setFormError(api.errorText(stored.error));
          return;
        }
        setSaving(true);
        try {
          const ref =
            new URLSearchParams(location.search).get("ref") ??
            sessionStorage.getItem("nimantran-referrer");
          await onSave({
            p_name: f.get("name"),
            p_bio: f.get("bio"),
            p_dob: stored.data?.dob ?? f.get("dob"),
            p_referral:
              ref && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(ref)
                ? ref
                : null,
          });
        } finally {
          setSaving(false);
        }
      }}
    >
      {formError && (
        <p role="alert" className="form-error">
          {formError}
        </p>
      )}
      <label>
        Your display name
        <input
          name="name"
          defaultValue={profile?.display_name ?? ""}
          required
          minLength={2}
          maxLength={60}
        />
      </label>
      <label>
        A little about you
        <textarea
          name="bio"
          defaultValue={profile?.bio ?? ""}
          maxLength={600}
          placeholder="Your interests, your favourite kind of evening…"
        />
      </label>
      {!profile && (
        <label>
          Date of birth · private
          <input
            name="dob"
            type="date"
            required
            min="1900-01-01"
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18))
              .toISOString()
              .slice(0, 10)}
          />
          <small>
            Used for age eligibility. You must be 18+. Your date of birth cannot be edited here
            after saving.
          </small>
        </label>
      )}
      <label className="check-field">
        <input type="checkbox" required />I am 18 or older and agree to respectful participation.
      </label>
      <button className="s-btn primary" disabled={saving}>
        {saving ? "Saving…" : "Save my profile"}
        <Check size={17} />
      </button>
    </form>
  );
}
function HostForm({
  onPublish,
  onSignIn,
  signedIn,
  disabled,
}: {
  onPublish: (d: Record<string, unknown>) => Promise<void>;
  onSignIn: () => void;
  signedIn: boolean;
  disabled: boolean;
}) {
  const [category, setCategory] = useState("games");
  const [sober, setSober] = useState(true);
  const [step, setStep] = useState(1);
  const [place, setPlace] = useState({ lat: 28.47, lng: 77.08 });
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("nimantran-host-draft");
      if (!raw) return;
      const draft = JSON.parse(raw) as Record<string, string>;
      if (draft["starts_at"] && !draft["event_date"]) {
        draft["event_date"] = draft["starts_at"].slice(0, 10);
        draft["start_time"] = draft["starts_at"].slice(11, 16);
        draft["end_time"] = draft["ends_at"]?.slice(11, 16) ?? "";
      }
      if (draft["category"]) setCategory(draft["category"]);
      if (draft["lat"] && draft["lng"])
        setPlace({ lat: Number(draft["lat"]), lng: Number(draft["lng"]) });
      if (draft["alcohol_free"]) setSober(draft["alcohol_free"] === "true");
      for (const [name, value] of Object.entries(draft)) {
        const input = form.current?.elements.namedItem(name);
        if (input instanceof HTMLInputElement) {
          if (input.type === "checkbox") input.checked = value === "on";
          else input.value = value;
        } else if (input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement)
          input.value = value;
      }
    } catch {
      sessionStorage.removeItem("nimantran-host-draft");
    }
  }, []);
  function saveDraft() {
    if (!form.current) return;
    try {
      sessionStorage.setItem(
        "nimantran-host-draft",
        JSON.stringify({
          ...Object.fromEntries(new FormData(form.current)),
          alcohol_free: sober.toString(),
        }),
      );
    } catch {
      /* A private-browsing storage restriction must not block editing. */
    }
  }

  const field = (
    name: string,
    label: string,
    options: {
      type?: string;
      min?: number;
      max?: number;
      value?: string;
      placeholder?: string;
      optional?: boolean;
      textarea?: boolean;
    } = {},
  ) => (
    <label>
      {label}
      {options.textarea ? (
        <textarea
          aria-label={label}
          name={name}
          required={!options.optional}
          minLength={name === "description" ? 30 : 2}
          maxLength={name === "description" ? 3000 : 1500}
          placeholder={options.placeholder}
          defaultValue={options.value}
        />
      ) : (
        <input
          aria-label={label}
          name={name}
          type={options.type ?? "text"}
          step={
            options.type === "number" && (name === "lat" || name === "lng") ? "0.01" : undefined
          }
          required={!options.optional}
          min={options.min}
          max={options.max}
          defaultValue={options.value}
          placeholder={options.placeholder}
        />
      )}
    </label>
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!signedIn) {
      onSignIn();
      return;
    }
    const f = new FormData(e.currentTarget);
    const data = Object.fromEntries(f);
    let timing;
    try {
      timing = eventTimes(
        String(data["event_date"]),
        String(data["start_time"]),
        String(data["end_time"]),
      );
    } catch (error) {
      form.current
        ?.querySelector<HTMLInputElement>('[name="end_time"]')
        ?.setCustomValidity(api.errorText(error));
      form.current?.reportValidity();
      return;
    }
    await onPublish({
      ...data,
      category,
      ...timing,
      alcohol_free: sober,
      solo: f.get("solo") === "on",
    });
  }
  return (
    <form
      ref={form}
      data-clarity-mask="true"
      className="s-form host-form"
      onSubmit={(e) => void submit(e)}
      onChange={() => {
        saveDraft();
        form.current?.querySelector<HTMLInputElement>('[name="end_time"]')?.setCustomValidity("");
      }}
    >
      <div className="form-steps">
        {[1, 2, 3].map((n) => (
          <button
            type="button"
            key={n}
            aria-current={step === n ? "step" : undefined}
            onClick={() => setStep(n)}
          >
            <span>0{n}</span>
            {["The idea", "The details", "The welcome"][n - 1]}
          </button>
        ))}
      </div>
      <p className="fineprint">
        Switch sections freely. All three sections must be complete to publish.
      </p>
      <fieldset hidden={step !== 1}>
        <legend>The idea</legend>
        {field("title", "Give your gathering a name", {
          placeholder: "A Sunday well played",
          min: 5,
          max: 100,
        })}
        <label>
          Find its scene
          <select name="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name} · {c.sub}
              </option>
            ))}
          </select>
        </label>
        {field("description", "What’s the plan, and who would enjoy it?", {
          textarea: true,
          placeholder:
            "Describe the activities, the welcome, and what a guest can expect. Minimum 30 characters.",
        })}
        <label>
          Energy
          <select name="atmosphere">
            {["Conversational", "Relaxed", "Playful", "High energy"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label className="check-field">
          <input type="checkbox" name="solo" defaultChecked />I welcome people coming solo.
        </label>
        <button type="button" className="s-btn primary" onClick={() => setStep(2)}>
          Next: the details <ArrowRight size={17} />
        </button>
      </fieldset>
      <fieldset hidden={step !== 2}>
        <legend>The details</legend>
        {field("event_date", "Event date", { type: "date" })}
        <div className="form-pair">
          {field("start_time", "Start time · IST", { type: "time" })}
          {field("end_time", "End time · IST", { type: "time" })}
        </div>
        <p className="fineprint">
          One date, two times. An end time earlier than the start means the gathering ends the next
          morning.
        </p>
        <div className="form-pair">
          <label>
            City
            <select name="city">
              {["Gurgaon", "Delhi", "Noida", "Faridabad", "Ghaziabad"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          {field("neighbourhood", "Neighbourhood", { placeholder: "Sector 29" })}
        </div>
        {field("address", "Exact venue address · confirmed guests only", {
          textarea: true,
          placeholder: "Venue name, street, landmark and arrival instructions.",
        })}
        <div className="host-location">
          <label>
            Approximate map area
            <select
              defaultValue=""
              onChange={(e) => {
                const point = e.target.value.split(",").map(Number);
                if (point[0] && point[1]) setPlace({ lat: point[0], lng: point[1] });
              }}
            >
              <option value="" disabled>
                Choose a neighbourhood or tap the map
              </option>
              <option value="28.47,77.06">Sector 29, Gurgaon</option>
              <option value="28.50,77.09">Cyber City, Gurgaon</option>
              <option value="28.45,77.10">Golf Course Road, Gurgaon</option>
              <option value="28.41,77.05">Sohna Road, Gurgaon</option>
              <option value="28.63,77.22">Central Delhi</option>
              <option value="28.57,77.32">Noida</option>
              <option value="28.41,77.31">Faridabad</option>
              <option value="28.67,77.44">Ghaziabad</option>
            </select>
          </label>
          <SceneMap events={[]} onSelect={() => {}} place={place} onPlace={setPlace} />
          <input type="hidden" name="lat" value={place.lat} />
          <input type="hidden" name="lng" value={place.lng} />
          <p className="fineprint">
            Choose the public neighbourhood, not a private doorway. Tap the map to place an
            approximate pin. Your exact address stays private.
          </p>
        </div>
        <div className="form-pair">
          {field("price", "Ticket price · INR", { type: "number", min: 0, max: 50000, value: "0" })}
          {field("capacity", "Guest capacity", { type: "number", min: 2, max: 200, value: "12" })}
        </div>
        <label className="check-field">
          <input type="checkbox" checked={sober} onChange={(e) => setSober(e.target.checked)} />
          Sober scene · no alcohol available
        </label>
        <div className="form-pair">
          {field("min_age", sober ? "Minimum age · 18+" : "Minimum age · 25+ platform policy", {
            type: "number",
            min: sober ? 18 : 25,
            max: 100,
            value: sober ? "18" : "25",
          })}
          {field("max_age", "Maximum age · optional", {
            type: "number",
            min: 18,
            max: 100,
            optional: true,
          })}
        </div>
        {field("language", "Languages spoken", { value: "English & Hindi" })}
        {field("accessibility", "Venue accessibility", {
          placeholder: "Describe stairs, seating, toilets and any limitations.",
          value: "Contact the host for access details.",
        })}
        <button type="button" className="s-btn primary" onClick={() => setStep(3)}>
          Next: the welcome <ArrowRight size={17} />
        </button>
      </fieldset>
      <fieldset hidden={step !== 3}>
        <legend>The welcome</legend>
        {field("food", "Food included", {
          placeholder: "Vegetarian snacks, a full meal, or explicitly “Not included”.",
          value: "Not included",
        })}
        {field("drinks", "Drinks included", {
          placeholder: "Water and one soft drink per guest, for example.",
          value: "Not included",
        })}
        {field("includes", "Other inclusions", {
          placeholder: "Hosted games and equipment, art materials, etc.",
          value: "Entry to the gathering",
        })}
        {field("extra_costs", "What costs extra?", {
          placeholder: "Additional café orders paid separately, or “Nothing”.",
          value: "Personal purchases are extra",
        })}
        <details className="host-extra-details">
          <summary>House rules, cancellations & what to bring</summary>{" "}
          {field("bring", "What should guests bring?", { optional: true })}
          {field("rules", "House rules", {
            textarea: true,
            placeholder: "Respect boundaries, ask before photos, venue rules…",
            value: "Respect personal boundaries. Ask before taking photos. Follow venue rules.",
          })}
          {field("cancellation", "Cancellation terms", {
            textarea: true,
            placeholder: "Explain the deadline and how you will handle cancellations.",
            value: "You may cancel your booking before the event starts.",
          })}
        </details>
        <label className="check-field">
          <input type="checkbox" required />I have permission to host at this venue, will follow
          applicable law and age restrictions, and have described all inclusions accurately.
        </label>
        {!sober && (
          <label className="check-field">
            <input type="checkbox" required />
            The venue has the required permissions for alcohol. I am responsible for checking local
            legal eligibility, not just the platform’s age filter.
          </label>
        )}
        <p className="preview-note">
          Free events can be booked after approval. Paid listings may collect introductions, but
          paid approvals and checkout remain unavailable.
        </p>
        {signedIn ? (
          <button
            className="s-btn primary"
            disabled={disabled}
            onClick={() => {
              const invalid = form.current?.querySelector<HTMLElement>(":invalid");
              if (invalid) {
                const fs = invalid.closest("fieldset");
                const index = [...form.current!.querySelectorAll("fieldset")].indexOf(
                  fs as HTMLFieldSetElement,
                );
                if (index >= 0) setStep(index + 1);
                invalid.closest("details")?.setAttribute("open", "");
              }
            }}
          >
            {disabled ? "Publishing…" : "Publish my gathering"}
            <ArrowUpRight size={18} />
          </button>
        ) : (
          <button type="button" className="s-btn primary" onClick={onSignIn}>
            Sign in & complete your profile <ArrowUpRight size={18} />
          </button>
        )}
      </fieldset>
    </form>
  );
}
