/** Read-only project preflight. Never prints keys, tokens, rows or auth settings. */
const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(
    `Supabase connection is unavailable. Missing server variables: ${missing.join(", ")}.`,
  );
  console.error(
    "Set values securely in environment settings or an ignored .env file; do not paste secrets into chat.",
  );
  process.exit(2);
}
const url = new URL(process.env["SUPABASE_URL"]!);
if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
  console.error("Supabase must use HTTPS.");
  process.exit(2);
}
const base = url.origin;
const anon = process.env["SUPABASE_ANON_KEY"]!;
const service = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
let failed = false;
async function check(
  label: string,
  path: string,
  key: string,
  validate?: (data: unknown) => boolean,
) {
  try {
    const response = await fetch(`${base}${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      console.error(`FAIL: ${label} (HTTP ${response.status}). No data was modified.`);
      failed = true;
      return;
    }
    if (validate && !validate(await response.json())) {
      console.error(`FAIL: ${label}; expected configuration is missing. No data was modified.`);
      failed = true;
      return;
    }
    console.log(`PASS: ${label}`);
  } catch {
    console.error(`FAIL: ${label}; connection could not be verified. No data was modified.`);
    failed = true;
  }
}
await Promise.all([
  check("Supabase Auth reachable with public project key", "/auth/v1/settings", anon),
  check(
    "Core wedding schema and service-role access",
    "/rest/v1/weddings?select=id&limit=0",
    service,
  ),
  check("Consent schema", "/rest/v1/voice_consents?select=id&limit=0", service),
  check("Approval schema", "/rest/v1/sample_approvals?select=id&limit=0", service),
  check("Private media buckets", "/storage/v1/bucket", service, (data) => {
    if (!Array.isArray(data)) return false;
    return ["voices", "invitations"].every((id) =>
      data.some((bucket) => bucket.id === id && bucket.public === false),
    );
  }),
]);
console.log(
  "This preflight does not verify email delivery, user isolation, recording uploads, or provider integrations.",
);
process.exitCode = failed ? 1 : 0;
