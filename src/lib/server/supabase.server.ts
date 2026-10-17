import { z } from "zod";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function config() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_ANON_KEY"];
  if (!url || !key)
    throw new ApiError(
      503,
      "Development mode: Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY on the server and apply the database migration.",
    );
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(parsed.hostname))
    throw new ApiError(503, "Supabase must use HTTPS.");
  return { url: url.replace(/\/$/, ""), key };
}
export function serviceKey() {
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!key)
    throw new ApiError(503, "This operation requires the server-only Supabase service-role key.");
  return key;
}
export async function supa<T>(
  path: string,
  token: string | undefined,
  method = "GET",
  body?: unknown,
  privileged = false,
): Promise<T> {
  const { url, key } = config();
  const authKey = privileged ? serviceKey() : key;
  let response: Response;
  try {
    response = await fetch(`${url}${path}`, {
      method,
      headers: {
        apikey: authKey,
        Authorization: `Bearer ${token ?? authKey}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        Prefer: "return=representation",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new ApiError(
      502,
      "The database is temporarily unreachable. Your changes were not confirmed; reload before retrying.",
    );
  }
  const result = await response.text();
  let parsed: unknown;
  try {
    parsed = result ? JSON.parse(result) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const record = parsed as { code?: string; message?: string } | null;
    if (response.status === 400 && path.startsWith("/auth/v1/"))
      throw new ApiError(
        400,
        "The sign-in code or email is invalid or expired. Request a new code and retry.",
      );
    if (response.status === 401) throw new ApiError(401, "Your session expired. Sign in again.");
    if (record?.code === "23505")
      throw new ApiError(
        409,
        "This record already exists. Check duplicate guests or email addresses.",
      );
    if (record?.code === "42501" || response.status === 403)
      throw new ApiError(403, "You do not have access to this record.");
    if (record?.code === "P0001")
      throw new ApiError(
        409,
        record.message ?? "This operation is blocked by the current workflow state.",
      );
    console.error(
      JSON.stringify({
        event: "database.error",
        status: response.status,
        code: record?.code ?? "unknown",
      }),
    );
    throw new ApiError(
      502,
      "The database rejected this request. Check that migrations are applied and the service is configured.",
    );
  }
  return parsed as T;
}
export async function rpc<T>(name: string, args: unknown, token?: string, privileged = false) {
  return supa<T>(`/rest/v1/rpc/${name}`, token, "POST", args, privileged);
}
export function cookies(request: Request) {
  const pairs = (request.headers.get("cookie") ?? "").split(";").map((v) => v.trim().split("="));
  return Object.fromEntries(pairs.map(([k, v]) => [k, v ?? ""]));
}
export async function session(
  request: Request,
): Promise<{ token: string; user: { id: string; email: string } }> {
  const token = cookies(request)["nim_access"];
  if (!token) throw new ApiError(401, "Sign in to continue.");
  const user = await supa<{ id: string; email: string }>("/auth/v1/user", token);
  return { token, user };
}
export function authCookies(request: Request, access: string, refresh: string, age = 3600) {
  const secure =
    new URL(request.url).protocol === "https:" || process.env["NODE_ENV"] === "production"
      ? "; Secure"
      : "";
  return [
    `nim_access=${access}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${secure}`,
    `nim_refresh=${refresh}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age ? 604800 : 0}${secure}`,
  ];
}
export async function requireWedding(wid: string, token: string) {
  z.string().uuid().parse(wid);
  const rows = await supa<Array<{ id: string }>>(`/rest/v1/weddings?id=eq.${wid}&select=id`, token);
  if (!rows.length) throw new ApiError(404, "Wedding not found.");
}
export async function rateLimit(key: string, max = 15, seconds = 300) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const bucket = Array.from(new Uint8Array(hash), (v) => v.toString(16).padStart(2, "0")).join("");
  if (!(await rpc<boolean>("take_rate_limit", { bucket, max_hits: max, seconds }, undefined, true)))
    throw new ApiError(429, "Too many attempts. Please wait a few minutes and try again.");
}
export async function storage(
  path: string,
  method: string,
  body?: BodyInit,
  contentType?: string,
): Promise<unknown> {
  const { url } = config();
  const key = serviceKey();
  const response = await fetch(`${url}/storage/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(contentType ? { "Content-Type": contentType } : {}),
    },
    ...(body === undefined ? {} : { body }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new ApiError(502, "Private storage operation failed. Please retry.");
  return response.json();
}
export async function boundedBody(request: Request, limit = 128_000) {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Request body is required.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new ApiError(413, "File or request is too large.");
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const part of chunks) {
    all.set(part, offset);
    offset += part.length;
  }
  return all;
}
