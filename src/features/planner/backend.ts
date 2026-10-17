import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Snapshot, Workspace, Role, Base } from "./domain";
let singleton: SupabaseClient | undefined;
export function configurationProblem(): string | null {
  const url = import.meta.env["VITE_SUPABASE_URL"];
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key)
    return "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, apply the planner migration, then rebuild this site.";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(parsed.hostname))
      return "Use an HTTPS Supabase project URL.";
    let publicKey = key.startsWith("sb_publishable_");
    if (!publicKey && key.split(".").length === 3) {
      const payload = key.split(".")[1]!.replaceAll("-", "+").replaceAll("_", "/");
      publicKey = JSON.parse(atob(payload)).role === "anon";
    }
    if (!publicKey)
      return "Use only the Supabase publishable key (or legacy anon key). Secret/service-role keys are not allowed in this client.";
  } catch {
    return "The Supabase URL or publishable key format is invalid.";
  }
  return null;
}
export function plannerClient(): SupabaseClient {
  const problem = configurationProblem();
  if (problem) throw new Error(problem);
  if (typeof window === "undefined") throw new Error("Open the planner in your browser.");
  singleton ??= createClient(
    import.meta.env["VITE_SUPABASE_URL"],
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
    {
      auth: {
        storage: window.sessionStorage,
        storageKey: "nimantran-planner-auth",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    },
  );
  return singleton;
}
export async function workspaces(): Promise<Workspace[]> {
  const client = plannerClient();
  const { error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  const { data, error } = await client.rpc("planner_workspaces");
  if (error) throw error;
  return data ?? [];
}
export type PlannerTable =
  "families" | "family_members" | "travel_groups" | "logistics_assignments";
async function readAll<T>(table: string, wid: string, columns = "*"): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await plannerClient()
      .from(table)
      .select(columns)
      .eq("wedding_id", wid)
      .order(table === "wedding_members" ? "user_id" : "id")
      .range(from, from + 499);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 500) return rows;
  }
}
export async function snapshot(wid: string, role: Role): Promise<Snapshot> {
  const [families, members, travels, assignments, memberships, invitations] = await Promise.all([
    readAll<Snapshot["families"][number]>("families", wid),
    readAll<Snapshot["members"][number]>("family_members", wid),
    readAll<Snapshot["travels"][number]>("travel_groups", wid),
    readAll<Snapshot["assignments"][number]>("logistics_assignments", wid),
    readAll<Snapshot["memberships"][number]>("wedding_members", wid),
    role === "owner"
      ? readAll<Snapshot["invitations"][number]>(
          "planner_invitations",
          wid,
          "id,wedding_id,email,role,expires_at,accepted_at,created_at",
        )
      : Promise.resolve([]),
  ]);
  return { families, members, travels, assignments, memberships, invitations };
}
export async function saveRow(
  table: PlannerTable,
  wid: string,
  values: Record<string, unknown>,
  existing?: Base,
): Promise<void> {
  let query;
  if (existing)
    query = plannerClient()
      .from(table)
      .update(values)
      .eq("wedding_id", wid)
      .eq("id", existing.id)
      .eq("revision", existing.revision);
  else
    query = plannerClient()
      .from(table)
      .insert({ ...values, wedding_id: wid });
  const { data, error } = await query.select("id");
  if (error) throw error;
  if (!data?.length)
    throw new Error(
      "This record changed or your access changed. Refresh and reopen the form before saving; your draft has not been saved.",
    );
}
export async function removeRow(table: PlannerTable, wid: string, existing: Base): Promise<void> {
  const { data, error } = await plannerClient()
    .from(table)
    .delete()
    .eq("wedding_id", wid)
    .eq("id", existing.id)
    .eq("revision", existing.revision)
    .select("id");
  if (error) throw error;
  if (!data?.length)
    throw new Error("This record changed or access was denied. Refresh before deleting.");
}
export async function rpc<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await plannerClient().rpc(name, args);
  if (error) throw error;
  return data as T;
}
export function readableError(error: unknown): string {
  const record = error as { message?: string; code?: string; status?: number };
  if (record.code === "PGRST202" || record.code === "42P01")
    return "Planner schema is not installed. Apply migration 202610170004_guest_travel_planner.sql after migrations 001–003, then refresh.";
  if (record.code === "42501") {
    if (
      record.message?.startsWith("Invitation is invalid") ||
      record.message === "Sign in with a verified email first"
    )
      return record.message;
    return "Access denied. Check workspace membership and the side you are permitted to edit.";
  }
  if (record.code === "23503")
    return "The linked family or travel group was removed or belongs to another wedding. Refresh and select it again.";
  if (record.code === "23505")
    return "This record already exists (a travel group can have only one pickup assignment). Refresh to edit it.";
  if (record.code === "23514")
    return "Check required fields, counts and date order. Assigned pickups require vehicle, driver and time; assigned accommodation requires a hotel, dates and rooms.";
  return record.message ?? "The request failed. No save was confirmed. Please refresh and retry.";
}
