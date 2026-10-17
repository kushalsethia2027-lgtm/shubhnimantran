import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Flower2,
  RefreshCw,
  Users,
  Plane,
  Hotel,
  Settings,
  LayoutDashboard,
  Download,
  Plus,
} from "lucide-react";
import { AuthPanel, PlannerConfiguration } from "./AuthPanel";
import {
  configurationProblem,
  plannerClient,
  workspaces as loadWorkspaces,
  snapshot,
  rpc,
  removeRow,
  readableError,
  type PlannerTable,
} from "./backend";
import {
  emptySnapshot,
  emptyFilters,
  filteredFamilies,
  filteredTravel,
  metrics,
  visibleAssignments,
  pickupStatus,
  missingTravel,
  writable,
  toCsv,
  localDay,
  type Snapshot,
  type Workspace,
  type Base,
  type Filters,
} from "./domain";
import { RecordEditor, type EditorTarget } from "./RecordEditor";
import { download } from "../workspace/client";
const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Families", icon: Users },
  { name: "Arrivals & Departures", icon: Plane },
  { name: "Logistics", icon: Hotel },
  { name: "Settings", icon: Settings },
] as const;
type Tab = (typeof navigation)[number]["name"];
function dateTime(value: string | null) {
  return value
    ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
    : "Not provided";
}
function familyTitle(data: Snapshot, fid: string) {
  return data.families.find((f) => f.id === fid)?.family_name ?? "Removed family";
}
export function Planner() {
  const [problem] = useState(configurationProblem);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [wid, setWid] = useState("");
  const [data, setData] = useState<Snapshot>(emptySnapshot);
  const [tab, setTab] = useState<Tab>("Overview");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [lastSync, setLastSync] = useState("");
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [inviteToken, setInviteToken] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const request = useRef(0);
  const selection = useRef("");
  const invalidateRequests = useCallback(() => {
    request.current++;
  }, []);
  const currentWorkspace = workspaces.find((w) => w.id === wid);
  useEffect(() => {
    if (problem) return;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("invite");
    if (token) {
      setInviteToken(token);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    const client = plannerClient();
    let active = true;
    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setError(readableError(error));
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    const { data: subscription } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setAuthReady(true);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [problem]);
  const refresh = useCallback(async () => {
    if (!user) return;
    const ticket = ++request.current;
    setLoading(true);
    try {
      const list = await loadWorkspaces();
      if (ticket !== request.current) return;
      setWorkspaces(list);
      const selected = list.find((w) => w.id === selection.current) ?? list[0];
      if (!selected) {
        selection.current = "";
        setWid("");
        setData(emptySnapshot());
        setLoaded(true);
        setEditor(null);
        setInviteLink("");
        setLastSync(new Date().toISOString());
        return;
      }
      if (selected.id !== selection.current) {
        selection.current = selected.id;
        setData(emptySnapshot());
        setLoaded(false);
        setEditor(null);
        setInviteLink("");
        setFilters(emptyFilters);
        setWid(selected.id);
        return;
      }
      const next = await snapshot(selected.id, selected.role);
      if (ticket !== request.current) return;
      setData(next);
      setLoaded(true);
      setLastSync(new Date().toISOString());
      setError("");
    } catch (e) {
      if (ticket === request.current) {
        setError(readableError(e));
        throw e;
      }
    } finally {
      if (ticket === request.current) setLoading(false);
    }
  }, [user]);
  useEffect(() => {
    if (!user) {
      request.current++;
      setData(emptySnapshot());
      setWorkspaces([]);
      setWid("");
      setLoaded(false);
      setEditor(null);
      setLastSync("");
      selection.current = "";
      setInviteLink("");
      return;
    }
    void refresh().catch(() => {});
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh().catch(() => {});
    }, 30000);
    const focus = () => {
      void refresh().catch(() => {});
    };
    window.addEventListener("focus", focus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", focus);
      invalidateRequests();
    };
  }, [user, refresh, wid, invalidateRequests]);
  const action = async (fn: () => Promise<unknown>, message: string, refetch = true) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await fn();
      setNotice(message);
      try {
        if (refetch) await refresh();
      } catch {
        setNotice(message + " Refresh failed; use Refresh before continuing.");
      }
    } catch (e) {
      setError(readableError(e));
    } finally {
      setSaving(false);
    }
  };
  const changeWorkspace = (id: string) => {
    selection.current = id;
    request.current++;
    setWid(id);
    setData(emptySnapshot());
    setLoaded(false);
    setEditor(null);
    setFilters(emptyFilters);
    setInviteLink("");
    setNotice("");
  };
  const remove = (table: PlannerTable, row: Base, label: string) => {
    const extra =
      table === "families"
        ? " This also removes its members, travel groups and linked assignments."
        : table === "travel_groups"
          ? " Linked pickup and accommodation assignments will also be removed."
          : "";
    if (window.confirm(`Delete ${label}?${extra} This cannot be undone.`))
      void action(() => removeRow(table, wid, row), "Deleted from the shared database.");
  };
  const exportData = (kind: "families" | "members" | "arrivals" | "assignments") => {
    const families = filteredFamilies(data, filters);
    const ids = new Set(families.map((f) => f.id));
    const travels = filteredTravel(data, filters);
    let rows: Record<string, unknown>[] = [];
    let columns: string[] = [];
    if (kind === "families") {
      rows = families;
      columns = [
        "family_name",
        "side",
        "contact_name",
        "contact_phone",
        "rsvp_status",
        "accommodation_required",
        "notes",
      ];
    }
    if (kind === "members") {
      rows = data.members
        .filter((m) => ids.has(m.family_id))
        .map((m) => ({
          ...m,
          family_name: familyTitle(data, m.family_id),
          side: data.families.find((f) => f.id === m.family_id)?.side,
        }));
      columns = ["full_name", "family_name", "side", "category", "rsvp_status"];
    }
    if (kind === "arrivals") {
      rows = travels.map((t) => ({
        ...t,
        family_name: familyTitle(data, t.family_id),
        side: data.families.find((f) => f.id === t.family_id)?.side,
        pickup_status: pickupStatus(data, t),
      }));
      columns = [
        "family_name",
        "side",
        "transport_mode",
        "origin",
        "destination",
        "operator_name",
        "transport_number",
        "arrival_datetime",
        "departure_datetime",
        "terminal_or_station",
        "passenger_count",
        "luggage_count",
        "pickup_required",
        "pickup_status",
        "notes",
      ];
    }
    if (kind === "assignments") {
      rows = visibleAssignments(data, filters);
      columns = [
        "assignment_type",
        "travel_group_id",
        "status",
        "vehicle",
        "driver_name",
        "driver_phone",
        "pickup_datetime",
        "hotel_name",
        "check_in",
        "check_out",
        "room_count",
        "notes",
      ];
    }
    download(`Nimantran-${kind}.csv`, toCsv(rows, columns));
    setNotice(
      `Exported ${rows.length} authorized ${kind} records with the current filters. CSV files contain private information; share them carefully.`,
    );
  };
  const families = filteredFamilies(data, filters);
  const travels = filteredTravel(data, filters);
  const totals = metrics(data, filters);
  const role = currentWorkspace?.role;
  return (
    <div className="workspace min-h-screen">
      <header className="border-b border-gold/40 bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <a href="/" className="flex items-center gap-2 font-display text-3xl text-maroon">
            <Flower2 />
            Nimantran
          </a>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <a href="/demo/" className="text-maroon underline">
              Invitation creator
            </a>
            {user && (
              <>
                <span>{user.email}</span>
                <button
                  className="workspace-secondary"
                  disabled={saving}
                  onClick={() =>
                    void action(
                      async () => {
                        const { error } = await plannerClient().auth.signOut();
                        if (error) throw error;
                        setRecovery(false);
                      },
                      "Signed out.",
                      false,
                    )
                  }
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-7">
        {problem ? (
          <PlannerConfiguration problem={problem} />
        ) : !authReady ? (
          <p role="status" className="workspace-card">
            Checking sign-in…
          </p>
        ) : !user || recovery ? (
          <>
            <AuthPanel recovery={recovery} onRecovered={() => setRecovery(false)} />
            {inviteToken && (
              <p className="workspace-note mx-auto max-w-lg">
                An invitation is ready. Sign in with the invited email to accept it. After
                confirming a new account by email, reopen your original invitation link.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-maroon/70">
                  Guest & Travel Planner
                </p>
                <h1 className="mt-2 text-4xl text-maroon">Two families. One celebration.</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Private family records, shared arrivals and thoughtful hospitality.
                </p>
              </div>
              <button
                className="workspace-secondary"
                disabled={loading || saving}
                onClick={() => {
                  setShowNew(!showNew);
                  setNotice("");
                }}
              >
                <Plus size={16} />
                New wedding workspace
              </button>
            </div>
            {inviteToken && (
              <section className="workspace-card space-y-3">
                <h2 className="text-2xl">Join your family’s workspace</h2>
                <p className="text-sm">
                  You must be signed in with the verified email the owner invited. The link expires
                  after seven days and can be accepted once.
                </p>
                <div className="flex gap-3">
                  <button
                    className="workspace-primary"
                    disabled={saving}
                    onClick={() =>
                      void action(async () => {
                        const id = await rpc<string>("planner_accept_invite", {
                          token: inviteToken,
                        });
                        setInviteToken("");
                        changeWorkspace(id);
                      }, "Invitation accepted by the database. Refreshing your wedding…")
                    }
                  >
                    Accept planner invitation
                  </button>
                  <button className="workspace-secondary" onClick={() => setInviteToken("")}>
                    Dismiss invitation
                  </button>
                </div>
              </section>
            )}
            {(showNew || (loaded && !workspaces.length)) && (
              <form
                className="workspace-card workspace-form space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const f = new FormData(event.currentTarget);
                  void action(async () => {
                    const id = await rpc<string>("planner_create_workspace", {
                      workspace_name: String(f.get("name")),
                      on_date: String(f.get("date")),
                      at_venue: String(f.get("venue")),
                    });
                    setShowNew(false);
                    changeWorkspace(id);
                  }, "Wedding workspace created.");
                }}
              >
                <h2 className="text-2xl text-maroon">Create a shared wedding workspace</h2>
                <p className="text-sm text-muted-foreground">
                  You become its owner. Invite the two planners securely from Settings. Existing
                  invitation weddings also appear here after migration.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label>
                    Wedding name
                    <input name="name" required maxLength={120} placeholder="Meera & Aarav" />
                  </label>
                  <label>
                    Wedding date
                    <input name="date" type="date" required />
                  </label>
                  <label>
                    Venue
                    <input name="venue" required maxLength={160} />
                  </label>
                </div>
                <button className="workspace-primary" disabled={saving}>
                  Create workspace
                </button>
              </form>
            )}
            {workspaces.length > 0 && (
              <>
                <div className="workspace-card workspace-form flex flex-wrap items-center gap-5">
                  <label className="min-w-56 flex-1">
                    Wedding workspace
                    <select
                      aria-label="Wedding workspace"
                      value={wid}
                      disabled={saving}
                      onChange={(e) => changeWorkspace(e.target.value)}
                    >
                      {workspaces.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} · {w.wedding_date}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="workspace-badge">{role?.replaceAll("_", " ")}</span>
                  <div className="text-xs text-muted-foreground">
                    <p>{currentWorkspace?.venue}</p>
                    <p>
                      Last fetched: {lastSync ? new Date(lastSync).toLocaleTimeString() : "Not yet"}
                    </p>
                    <p>Refreshes every 30 seconds and on return to this tab.</p>
                  </div>
                  <button
                    className="workspace-secondary"
                    disabled={loading || saving}
                    onClick={() => void refresh().catch(() => {})}
                  >
                    <RefreshCw size={16} />
                    {loading ? "Refreshing…" : "Refresh"}
                  </button>
                </div>
                <nav
                  aria-label="Planner sections"
                  className="workspace-nav border-y border-gold/40"
                >
                  {navigation.map(({ name, icon: Icon }) => (
                    <button
                      key={name}
                      aria-current={tab === name ? "page" : undefined}
                      onClick={() => {
                        setTab(name);
                        setEditor(null);
                        setNotice("");
                      }}
                    >
                      <Icon size={16} />
                      {name}
                    </button>
                  ))}
                </nav>
                {tab !== "Settings" && (
                  <section
                    className="workspace-card workspace-form grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
                    aria-label="Planner filters"
                  >
                    <label>
                      Family side
                      <select
                        aria-label="Family side"
                        value={filters.side}
                        onChange={(e) =>
                          setFilters({ ...filters, side: e.target.value as Filters["side"] })
                        }
                      >
                        <option value="all">Both sides</option>
                        <option value="bride">Bride side</option>
                        <option value="groom">Groom side</option>
                      </select>
                    </label>
                    <label>
                      Travel date
                      <input
                        type="date"
                        value={filters.date}
                        onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                      />
                    </label>
                    <label>
                      Search families / guests
                      <input
                        value={filters.search}
                        maxLength={120}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      />
                    </label>
                    <label>
                      Transport mode
                      <select
                        aria-label="Transport mode"
                        value={filters.mode}
                        onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
                      >
                        {["all", "flight", "train", "bus", "car", "other"].map((v) => (
                          <option key={v} value={v}>
                            {v === "all" ? "All modes" : v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Pickup status
                      <select
                        aria-label="Pickup status"
                        value={filters.pickup}
                        onChange={(e) => setFilters({ ...filters, pickup: e.target.value })}
                      >
                        {["all", "needed", "assigned", "completed", "not_needed"].map((v) => (
                          <option key={v} value={v}>
                            {v.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="workspace-secondary"
                      onClick={() => setFilters(emptyFilters)}
                    >
                      Clear filters
                    </button>
                    <p className="text-xs text-muted-foreground sm:col-span-1 lg:col-span-4">
                      Date, mode and pickup filters apply to travel and linked logistics.
                      Family/member totals reflect the selected side and search. Times shown in{" "}
                      {Intl.DateTimeFormat().resolvedOptions().timeZone}.
                    </p>
                  </section>
                )}
                {loading && !loaded ? (
                  <p role="status" className="workspace-card">
                    Loading private planning data…
                  </p>
                ) : (
                  loaded &&
                  role && (
                    <>
                      {editor && (
                        <RecordEditor
                          key={
                            editor.kind +
                            (editor.row?.id ?? "new") +
                            (editor.familyId ?? "") +
                            (editor.travelId ?? "")
                          }
                          target={editor}
                          wid={wid}
                          families={
                            editor.kind === "assignment"
                              ? data.families
                              : data.families.filter((f) => writable(role, f.side))
                          }
                          travels={data.travels}
                          defaultSide={role === "groom_planner" ? "groom" : "bride"}
                          onCancel={() => setEditor(null)}
                          onSaved={async () => {
                            setEditor(null);
                            setNotice("Saved to the shared database.");
                            try {
                              await refresh();
                            } catch {
                              setNotice(
                                "Saved, but refresh failed. Use Refresh to see the latest data.",
                              );
                            }
                          }}
                        />
                      )}
                      {tab === "Overview" && (
                        <>
                          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {[
                              ["Bride-side families", totals.brideFamilies],
                              ["Groom-side families", totals.groomFamilies],
                              ["Invited members", totals.invited],
                              ["Confirmed guests", totals.confirmed],
                              ["Pending RSVPs", totals.pending],
                              ["Declined guests", totals.declined],
                              [
                                filters.date
                                  ? "Arriving groups on selected date"
                                  : "Arriving groups today",
                                totals.arrivals,
                              ],
                              ["Pickups still needed", totals.pickupNeeded],
                              ["Pickups unassigned", totals.pickupUnassigned],
                              [
                                "Confirmed guests needing accommodation",
                                totals.accommodationGuests,
                              ],
                              ["Rooms explicitly assigned", totals.assignedRooms],
                              ["Travel passengers (separate count)", totals.passengers],
                            ].map(([label, value]) => (
                              <div className="workspace-card" key={label}>
                                <p className="text-xs text-muted-foreground">{label}</p>
                                <p className="mt-3 font-display text-4xl text-maroon">{value}</p>
                              </div>
                            ))}
                          </section>
                          <p className="workspace-note">
                            Invited and RSVP totals count individual members once. Family RSVP notes
                            and travel passenger counts do not change those totals. Accommodation
                            needs count confirmed members of families marked “needs accommodation”;
                            assigned rooms are a separate count, with no assumed occupancy.
                          </p>
                          {!data.families.length && (
                            <Empty
                              text="Start with a family, then add each person and their travel groups."
                              action="Add first family"
                              onClick={() => {
                                setTab("Families");
                                setEditor({ kind: "family" });
                              }}
                            />
                          )}
                          <div className="workspace-card space-y-3">
                            <h2 className="text-2xl text-maroon">Planning checks</h2>
                            <p>
                              {
                                data.families.filter(
                                  (f) => !data.members.some((m) => m.family_id === f.id),
                                ).length
                              }{" "}
                              families have no individual members recorded.
                            </p>
                            <p>
                              {
                                data.families.filter(
                                  (f) =>
                                    data.members.some(
                                      (m) => m.family_id === f.id && m.rsvp_status === "confirmed",
                                    ) && !data.travels.some((t) => t.family_id === f.id),
                                ).length
                              }{" "}
                              families with confirmed guests have no travel group recorded.
                            </p>
                            <p>
                              {data.travels.filter((t) => missingTravel(t).length > 0).length}{" "}
                              travel groups have missing details.
                            </p>
                          </div>
                        </>
                      )}
                      {tab === "Families" && (
                        <>
                          <div className="flex flex-wrap gap-3">
                            <button
                              className="workspace-primary"
                              disabled={saving}
                              onClick={() => setEditor({ kind: "family" })}
                            >
                              <Plus size={16} />
                              Add family
                            </button>
                            <ExportButton onClick={() => exportData("families")}>
                              Export families
                            </ExportButton>
                            <ExportButton onClick={() => exportData("members")}>
                              Export guests
                            </ExportButton>
                          </div>
                          {!families.length && (
                            <Empty text="No families match these filters. Add a family on your side or clear the filters." />
                          )}
                          {families.map((f) => {
                            const members = data.members.filter((m) => m.family_id === f.id);
                            const edit = writable(role, f.side);
                            return (
                              <section key={f.id} className="workspace-card space-y-5">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                  <div>
                                    <span className="workspace-badge">{f.side} side</span>
                                    <h2 className="mt-2 text-3xl text-maroon">{f.family_name}</h2>
                                    <p className="mt-1 text-sm">
                                      {f.contact_name || "Contact name not added"}
                                      {f.contact_phone && (
                                        <>
                                          {" "}
                                          ·{" "}
                                          <a
                                            className="underline"
                                            href={"tel:" + f.contact_phone.replace(/[^+\d]/g, "")}
                                          >
                                            {f.contact_phone}
                                          </a>
                                        </>
                                      )}
                                    </p>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      Family RSVP note: {f.rsvp_status} ·{" "}
                                      {f.accommodation_required
                                        ? "Needs accommodation"
                                        : "No accommodation requested"}
                                    </p>
                                  </div>
                                  {edit && (
                                    <div className="flex gap-2">
                                      <button
                                        className="workspace-secondary"
                                        disabled={saving}
                                        onClick={() => setEditor({ kind: "family", row: f })}
                                      >
                                        Edit {f.family_name}
                                      </button>
                                      <button
                                        className="workspace-secondary"
                                        disabled={saving}
                                        onClick={() => remove("families", f, f.family_name)}
                                      >
                                        Delete family
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {f.notes && (
                                  <p className="whitespace-pre-wrap text-sm">{f.notes}</p>
                                )}
                                <p className="text-sm">
                                  Invited {members.length} · Confirmed{" "}
                                  {members.filter((m) => m.rsvp_status === "confirmed").length} ·
                                  Declined{" "}
                                  {members.filter((m) => m.rsvp_status === "declined").length} ·
                                  Pending{" "}
                                  {members.filter((m) => m.rsvp_status === "pending").length}
                                </p>
                                <div className="divide-y rounded-xl border">
                                  {members.map((m) => (
                                    <div
                                      key={m.id}
                                      className="flex flex-wrap items-center justify-between gap-3 p-3"
                                    >
                                      <div>
                                        <p className="font-semibold">{m.full_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {m.category} · {m.rsvp_status}
                                        </p>
                                      </div>
                                      {edit && (
                                        <div className="flex gap-2">
                                          <button
                                            className="workspace-secondary"
                                            disabled={saving}
                                            onClick={() =>
                                              setEditor({ kind: "member", row: m, familyId: f.id })
                                            }
                                          >
                                            Edit {m.full_name}
                                          </button>
                                          <button
                                            className="workspace-secondary"
                                            disabled={saving}
                                            onClick={() => remove("family_members", m, m.full_name)}
                                          >
                                            Remove member
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {!members.length && (
                                    <p className="p-4 text-sm text-muted-foreground">
                                      No members yet. Add each person for accurate guest totals.
                                    </p>
                                  )}
                                </div>
                                {edit ? (
                                  <div className="flex flex-wrap gap-3">
                                    <button
                                      className="workspace-secondary"
                                      disabled={saving}
                                      onClick={() => setEditor({ kind: "member", familyId: f.id })}
                                    >
                                      Add member to {f.family_name}
                                    </button>
                                    <button
                                      className="workspace-secondary"
                                      disabled={saving}
                                      onClick={() => {
                                        setTab("Arrivals & Departures");
                                        setEditor({ kind: "travel", familyId: f.id });
                                      }}
                                    >
                                      Add travel group
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    Only the {f.side} planner or owner can change this family’s
                                    records. Both planners can coordinate its logistics.
                                  </p>
                                )}
                              </section>
                            );
                          })}
                        </>
                      )}
                      {tab === "Arrivals & Departures" && (
                        <>
                          <div className="flex flex-wrap gap-3">
                            <button
                              className="workspace-primary"
                              disabled={
                                saving || !data.families.some((f) => writable(role, f.side))
                              }
                              onClick={() => setEditor({ kind: "travel" })}
                            >
                              Add travel group
                            </button>
                            <ExportButton onClick={() => exportData("arrivals")}>
                              Export arrivals & departures
                            </ExportButton>
                          </div>
                          {!data.families.some((f) => writable(role, f.side)) && (
                            <p className="workspace-note">
                              Add a family on your side before recording travel.
                            </p>
                          )}
                          <Timeline
                            data={data}
                            travels={travels}
                            date={filters.date}
                            role={role}
                            saving={saving}
                            onEdit={setEditor}
                            onDelete={(t) => remove("travel_groups", t, "travel group")}
                          />
                        </>
                      )}
                      {tab === "Logistics" && (
                        <>
                          <div className="flex flex-wrap gap-3">
                            <button
                              className="workspace-primary"
                              disabled={saving}
                              onClick={() =>
                                setEditor({ kind: "assignment", assignmentType: "accommodation" })
                              }
                            >
                              Add accommodation
                            </button>
                            <button
                              className="workspace-secondary"
                              disabled={saving || !data.travels.length}
                              onClick={() =>
                                setEditor({ kind: "assignment", assignmentType: "pickup" })
                              }
                            >
                              Add pickup
                            </button>
                            <ExportButton onClick={() => exportData("assignments")}>
                              Export assignments
                            </ExportButton>
                          </div>
                          <p className="workspace-note">
                            Both planners may coordinate either side. Vehicle, driver and room
                            choices are entered by a planner. Wedding-wide accommodation has no
                            family side and appears only with “Both sides” selected.
                          </p>
                          {travels
                            .filter((t) => t.pickup_required && pickupStatus(data, t) === "needed")
                            .map((t) => (
                              <div
                                className="workspace-card flex flex-wrap items-center justify-between gap-3"
                                key={t.id}
                              >
                                <div>
                                  <h2 className="text-xl text-maroon">
                                    Pickup needed · {familyTitle(data, t.family_id)}
                                  </h2>
                                  <p className="text-sm">
                                    {dateTime(t.arrival_datetime)} · {t.passenger_count} passengers
                                    · {t.terminal_or_station || "Station/terminal missing"}
                                  </p>
                                </div>
                                <button
                                  className="workspace-secondary"
                                  disabled={saving}
                                  onClick={() => {
                                    const existing = data.assignments.find(
                                      (a) =>
                                        a.travel_group_id === t.id &&
                                        a.assignment_type === "pickup",
                                    );
                                    setEditor(
                                      existing
                                        ? { kind: "assignment", row: existing }
                                        : {
                                            kind: "assignment",
                                            travelId: t.id,
                                            assignmentType: "pickup",
                                          },
                                    );
                                  }}
                                >
                                  Arrange pickup
                                </button>
                              </div>
                            ))}
                          {visibleAssignments(data, filters).map((a) => (
                            <section key={a.id} className="workspace-card space-y-3">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <span className="workspace-badge">{a.status}</span>
                                  <h2 className="mt-2 text-2xl text-maroon">
                                    {a.assignment_type === "pickup" ? "Pickup" : "Accommodation"} ·{" "}
                                    {a.travel_group_id
                                      ? familyTitle(
                                          data,
                                          data.travels.find((t) => t.id === a.travel_group_id)
                                            ?.family_id ?? "",
                                        )
                                      : "Wedding-wide"}
                                  </h2>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    className="workspace-secondary"
                                    disabled={saving}
                                    onClick={() => setEditor({ kind: "assignment", row: a })}
                                  >
                                    Edit assignment
                                  </button>
                                  <button
                                    className="workspace-secondary"
                                    disabled={saving}
                                    onClick={() =>
                                      remove("logistics_assignments", a, "logistics assignment")
                                    }
                                  >
                                    Delete assignment
                                  </button>
                                </div>
                              </div>
                              {a.assignment_type === "pickup" ? (
                                <p className="text-sm">
                                  {a.vehicle || "Vehicle not assigned"} ·{" "}
                                  {a.driver_name || "Driver not assigned"} ·{" "}
                                  {a.driver_phone || "No driver phone"} ·{" "}
                                  {dateTime(a.pickup_datetime)}
                                </p>
                              ) : (
                                <p className="text-sm">
                                  {a.hotel_name || "Hotel not assigned"} ·{" "}
                                  {a.check_in || "Check-in missing"} →{" "}
                                  {a.check_out || "Check-out missing"} · {a.room_count} rooms
                                </p>
                              )}
                              {a.notes && <p className="whitespace-pre-wrap text-sm">{a.notes}</p>}
                            </section>
                          ))}
                          {!visibleAssignments(data, filters).length &&
                            !travels.some((t) => t.pickup_required) && (
                              <Empty text="No logistics assignments match these filters. Add a pickup or accommodation when the family is ready." />
                            )}
                        </>
                      )}
                      {tab === "Settings" && (
                        <div className="space-y-5">
                          <section className="workspace-card space-y-4">
                            <h2 className="text-2xl text-maroon">Workspace access</h2>
                            <p className="text-sm">
                              The owner manages membership. Each planner edits their own side; both
                              can view shared records and coordinate logistics.
                            </p>
                            {data.memberships.map((m) => (
                              <div
                                key={m.user_id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                              >
                                <div>
                                  <p>{m.role.replaceAll("_", " ")}</p>
                                  <p className="break-all text-xs text-muted-foreground">
                                    Account ID: {m.user_id}
                                    {m.user_id === user.id ? " (you)" : ""}
                                  </p>
                                </div>
                                {role === "owner" && m.role !== "owner" && (
                                  <button
                                    className="workspace-secondary"
                                    disabled={saving}
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          "Remove this planner’s access immediately? Their family records stay in the workspace.",
                                        )
                                      )
                                        void action(
                                          () =>
                                            rpc("planner_remove_member", {
                                              wid,
                                              member_id: m.user_id,
                                            }),
                                          "Membership removed.",
                                        );
                                    }}
                                  >
                                    Remove access
                                  </button>
                                )}
                              </div>
                            ))}
                          </section>
                          {role === "owner" && (
                            <>
                              <form
                                className="workspace-card workspace-form space-y-4"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  const f = new FormData(event.currentTarget);
                                  setInviteLink("");
                                  void action(async () => {
                                    const token = await rpc<string>("planner_invite", {
                                      wid,
                                      invite_email: String(f.get("email")),
                                      invite_role: String(f.get("role")),
                                    });
                                    setInviteLink(
                                      window.location.origin +
                                        "/planner/#invite=" +
                                        encodeURIComponent(token),
                                    );
                                  }, "Private invitation created. Share it directly with the invited person.");
                                }}
                              >
                                <h2 className="text-2xl text-maroon">Invite a planner</h2>
                                <p className="text-sm text-muted-foreground">
                                  The recipient must verify and sign in with this exact email. The
                                  one-use link expires in seven days. Nimantran does not send the
                                  invitation email for you.
                                </p>
                                <label>
                                  Planner email
                                  <input name="email" type="email" required maxLength={254} />
                                </label>
                                <label>
                                  Planner role
                                  <select name="role">
                                    <option value="bride_planner">Bride planner</option>
                                    <option value="groom_planner">Groom planner</option>
                                  </select>
                                </label>
                                <button className="workspace-primary" disabled={saving}>
                                  Create secure invitation link
                                </button>
                                {inviteLink && (
                                  <label>
                                    Private invitation link
                                    <input
                                      readOnly
                                      value={inviteLink}
                                      onFocus={(e) => e.currentTarget.select()}
                                    />
                                    <span className="text-xs">
                                      Copy and share privately. It will not be shown again after
                                      leaving this page.
                                    </span>
                                  </label>
                                )}
                              </form>
                              <section className="workspace-card space-y-3">
                                <h2 className="text-2xl text-maroon">Invitations</h2>
                                {!data.invitations.length && (
                                  <p className="text-sm">No invitations yet.</p>
                                )}
                                {data.invitations.map((i) => (
                                  <div
                                    key={i.id}
                                    className="flex flex-wrap items-center justify-between gap-3 border-b py-3"
                                  >
                                    <div className="min-w-0">
                                      <p className="break-all text-sm">
                                        {i.email} · {i.role.replaceAll("_", " ")}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {i.accepted_at
                                          ? "Accepted"
                                          : new Date(i.expires_at).getTime() < Date.now()
                                            ? "Expired"
                                            : "Pending"}{" "}
                                        · expires {new Date(i.expires_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                    {!i.accepted_at && (
                                      <button
                                        className="workspace-secondary"
                                        disabled={saving}
                                        onClick={() => {
                                          if (window.confirm("Revoke this invitation?"))
                                            void action(
                                              () =>
                                                rpc("planner_revoke_invite", {
                                                  wid,
                                                  invite_id: i.id,
                                                }),
                                              "Invitation revoked.",
                                            );
                                        }}
                                      >
                                        Revoke invitation
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </section>
                              <section className="workspace-card space-y-3 border-destructive/40">
                                <h2 className="text-2xl text-maroon">Delete planner workspace</h2>
                                <p className="text-sm">
                                  Removes family records, members, travel, assignments and planner
                                  access permanently. Existing invitation creator weddings, guests
                                  and media are preserved.
                                </p>
                                <button
                                  className="workspace-secondary"
                                  disabled={saving}
                                  onClick={() => {
                                    if (
                                      window.prompt(
                                        "Type DELETE to permanently remove this planner workspace.",
                                      ) === "DELETE"
                                    )
                                      void action(async () => {
                                        await rpc("planner_delete_workspace", { wid });
                                        changeWorkspace("");
                                      }, "Planner workspace deleted. Invitation data preserved.");
                                  }}
                                >
                                  Delete planner workspace
                                </button>
                              </section>
                            </>
                          )}
                          <p className="workspace-note">
                            Guest records are stored in your shared Supabase database. This browser
                            stores only your sign-in session in tab session storage. CSV exports
                            contain private guest details; there are no public guest-data links.
                          </p>
                        </div>
                      )}
                    </>
                  )
                )}
              </>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="workspace-card border-destructive/50 text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="workspace-note">
            {notice}
          </p>
        )}
      </main>
    </div>
  );
}
function Empty({ text, action, onClick }: { text: string; action?: string; onClick?: () => void }) {
  return (
    <div className="workspace-card space-y-4 py-10 text-center">
      <p className="text-muted-foreground">{text}</p>
      {action && (
        <button className="workspace-primary" onClick={onClick}>
          {action}
        </button>
      )}
    </div>
  );
}
function ExportButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button className="workspace-secondary" onClick={onClick}>
      <Download size={16} />
      {children}
    </button>
  );
}
function Timeline({
  data,
  travels,
  date,
  role,
  saving,
  onEdit,
  onDelete,
}: {
  data: Snapshot;
  travels: Snapshot["travels"];
  date: string;
  role: Workspace["role"];
  saving: boolean;
  onEdit: (target: EditorTarget) => void;
  onDelete: (t: Snapshot["travels"][number]) => void;
}) {
  const events = travels
    .flatMap((t) =>
      [
        { kind: "Arrival", value: t.arrival_datetime, t },
        { kind: "Departure", value: t.departure_datetime, t },
      ].filter((e) => e.value && (!date || localDay(e.value) === date)),
    )
    .sort((a, b) => a.value!.localeCompare(b.value!));
  const days = Array.from(new Set(events.map((e) => localDay(e.value!))));
  const card = (t: Snapshot["travels"][number], key: string, kind: string, time: string | null) => {
    const f = data.families.find((f) => f.id === t.family_id);
    const gaps = missingTravel(t);
    return (
      <article className="workspace-card space-y-3" key={key}>
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-maroon">
              {kind} · {dateTime(time)}
            </p>
            <h3 className="mt-2 text-2xl text-maroon">
              {f?.family_name} · {t.transport_mode}
            </h3>
            <p className="text-sm">
              {t.origin || "Origin missing"} → {t.destination || "Destination missing"} ·{" "}
              {t.operator_name} {t.transport_number}
            </p>
            <p className="text-xs text-muted-foreground">
              {f?.side} side · {t.terminal_or_station || "Terminal/station missing"}
            </p>
          </div>
          <span className="workspace-badge">
            Pickup: {pickupStatus(data, t).replaceAll("_", " ")}
          </span>
        </div>
        <p className="text-sm">
          {t.passenger_count} passengers · {t.luggage_count} luggage pieces · Arrival:{" "}
          {dateTime(t.arrival_datetime)} · Departure: {dateTime(t.departure_datetime)}
        </p>
        {gaps.length > 0 && <p className="text-xs text-maroon">Missing: {gaps.join(", ")}</p>}
        {t.notes && <p className="whitespace-pre-wrap text-sm">{t.notes}</p>}
        <div className="flex flex-wrap gap-2">
          {f && writable(role, f.side) && (
            <>
              <button
                className="workspace-secondary"
                disabled={saving}
                onClick={() => onEdit({ kind: "travel", row: t, familyId: f.id })}
              >
                Edit travel group
              </button>
              <button className="workspace-secondary" disabled={saving} onClick={() => onDelete(t)}>
                Delete travel group
              </button>
            </>
          )}
          {t.pickup_required && (
            <button
              className="workspace-secondary"
              disabled={saving}
              onClick={() => {
                const existing = data.assignments.find(
                  (a) => a.assignment_type === "pickup" && a.travel_group_id === t.id,
                );
                onEdit(
                  existing
                    ? { kind: "assignment", row: existing }
                    : { kind: "assignment", travelId: t.id, assignmentType: "pickup" },
                );
              }}
            >
              Manage pickup
            </button>
          )}
        </div>
      </article>
    );
  };
  return (
    <div className="space-y-6">
      {days.map((day) => (
        <section key={day} className="space-y-3">
          <h2 className="text-2xl text-maroon">{day}</h2>
          {events
            .filter((e) => localDay(e.value!) === day)
            .map((e) => card(e.t, e.t.id + e.kind, e.kind, e.value))}
        </section>
      ))}
      {travels.filter((t) => !t.arrival_datetime || !t.departure_datetime).length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl text-maroon">Incomplete travel details</h2>
          {travels
            .filter((t) => !t.arrival_datetime || !t.departure_datetime)
            .map((t) => card(t, t.id, "Travel group", t.arrival_datetime ?? t.departure_datetime))}
        </section>
      )}
      {!travels.length && (
        <Empty text="No travel groups match these filters. Each family can have several groups arriving separately." />
      )}
    </div>
  );
}
