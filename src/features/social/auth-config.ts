// Public URL of the existing Nimantran Supabase project; not a credential.
export const NIMANTRAN_SUPABASE_URL = "https://ozvuruhglhyhuparvael.supabase.co";
export function resolveServiceUrl(value?: string) {
  const raw = value?.trim().replace(/^["']|["']$/g, "");
  if (!raw) return NIMANTRAN_SUPABASE_URL;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw Error(
      "The account service URL is invalid. Set VITE_SUPABASE_URL to " + NIMANTRAN_SUPABASE_URL,
    );
  }
  // Recover the exact DNS typo reported by the owner. Other projects are not silently redirected.
  if (url.hostname.endsWith(".shopabase.co")) return NIMANTRAN_SUPABASE_URL;
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname))
    throw Error("The account service requires HTTPS.");
  return url.origin;
}
export function eventTimes(date: string, start: string, end: string) {
  const starts = new Date(`${date}T${start}:00+05:30`);
  const ends = new Date(`${date}T${end}:00+05:30`);
  if (!Number.isFinite(starts.getTime()) || !Number.isFinite(ends.getTime()) || start === end)
    throw Error("Choose an event date and different start and end times.");
  if (ends < starts) ends.setTime(ends.getTime() + 86400000);
  return { starts_at: starts.toISOString(), ends_at: ends.toISOString() };
}
