import { readFile, writeFile, rename, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";

export function validateLegacyKey(key, role, projectUrl) {
  let payload;
  try {
    const parts = key.split(".");
    if (parts.length !== 3) throw new Error();
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    throw new Error(
      `Use the legacy ${role} JWT key from Supabase Settings → API Keys → Legacy API Keys.`,
    );
  }
  if (payload.role !== role)
    throw new Error(`This is not a ${role} key. Select the correct legacy API key.`);
  const ref = new URL(projectUrl).hostname.split(".")[0];
  if (payload.ref && payload.ref !== ref)
    throw new Error("This key belongs to a different Supabase project.");
  // Parsing checks role/project only; Supabase must verify authenticity remotely.
  return key;
}

export function updateEnvironment(source, values) {
  const remaining = source
    .split(/\r?\n/)
    .filter((line) => {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
      return !match || !Object.hasOwn(values, match[1]);
    })
    .join("\n")
    .trimEnd();
  const updated = Object.entries(values)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("\n");
  return `${remaining}${remaining ? "\n\n" : ""}${updated}\n`;
}

async function main() {
  if (!process.stdin.isTTY)
    throw new Error(
      "Run this command directly in Command Prompt. Do not pipe keys or put them on the command line.",
    );
  const root = resolve(import.meta.dirname, "..");
  const file = resolve(root, ".env");
  let source = "";
  try {
    source = await readFile(file, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const example = parseEnv(await readFile(resolve(root, ".env.example"), "utf8"));
  const existing = parseEnv(source);
  const projectUrl = existing.SUPABASE_URL || example.SUPABASE_URL;
  if (!projectUrl || !/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(projectUrl))
    throw new Error("Set your public Supabase project URL in .env.example first.");
  console.log(`Configure Nimantran for ${new URL(projectUrl).hostname}`);
  console.log("Get legacy API keys from Supabase Settings → API Keys → Legacy API Keys.");
  console.log("Keys are hidden while typing/pasting and stay in your local ignored .env file.");
  const silent = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  const reader = createInterface({ input: process.stdin, output: silent, terminal: true });
  reader.on("SIGINT", () => {
    reader.close();
    process.exitCode = 130;
  });
  async function ask(name, role) {
    process.stdout.write(`${name}${existing[name] ? " (Enter keeps existing value)" : ""}: `);
    const input = (await reader.question("")).trim();
    process.stdout.write("\n");
    return validateLegacyKey(input || existing[name] || "", role, projectUrl);
  }
  let anon, service;
  try {
    anon = await ask("SUPABASE_ANON_KEY", "anon");
    service = await ask("SUPABASE_SERVICE_ROLE_KEY", "service_role");
  } finally {
    reader.close();
  }
  const next = updateEnvironment(source, {
    APP_ORIGIN: existing.APP_ORIGIN || "http://127.0.0.1:3000",
    SUPABASE_URL: projectUrl.replace(/\/$/, ""),
    SUPABASE_ANON_KEY: anon,
    SUPABASE_SERVICE_ROLE_KEY: service,
  });
  const temporary = `${file}.setup-${randomUUID()}`;
  try {
    await writeFile(temporary, next, { flag: "wx", mode: 0o600 });
    await rename(temporary, file);
  } finally {
    await unlink(temporary).catch(() => {});
  }
  console.log("Saved .env. No authenticated request or database migration has been performed.");
  console.log(
    "Next: apply the SQL migrations, restart npm run dev, then open http://127.0.0.1:3000/app.",
  );
  console.log("Never upload .env or paste its contents into chat.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => {
    console.error(
      "Setup did not complete. Check your legacy key types and project, then retry. No keys are printed.",
    );
    process.exitCode = 1;
  });
}
