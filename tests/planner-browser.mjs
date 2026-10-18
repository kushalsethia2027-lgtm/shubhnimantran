// Browser wiring tests against an in-process API fixture, NOT a hosted Supabase acceptance test.
// PostgreSQL/RLS enforcement is tested separately by tests/planner-database.sql.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4174";
const wid = randomUUID(),
  fid = randomUUID();
const users = {
  owner: { id: randomUUID(), email: "owner@example.invalid" },
  bride: { id: randomUUID(), email: "bride@example.invalid" },
  groom: { id: randomUUID(), email: "groom@example.invalid" },
};
const now = new Date().toISOString();
const rows = {
  families: [
    {
      id: fid,
      wedding_id: wid,
      side: "groom",
      family_name: "Groom household",
      contact_name: "",
      contact_phone: "",
      rsvp_status: "pending",
      accommodation_required: false,
      notes: "",
      revision: 1,
      created_at: now,
      updated_at: now,
    },
  ],
  family_members: [],
  travel_groups: [],
  logistics_assignments: [],
  wedding_members: Object.entries(users).map(([role, u]) => ({
    user_id: u.id,
    wedding_id: wid,
    role: role === "owner" ? "owner" : role + "_planner",
    created_at: now,
  })),
  planner_invitations: [],
};
const errors = [];
const tokenFor = (role) =>
  Buffer.from("{}").toString("base64url") +
  "." +
  Buffer.from(
    JSON.stringify({
      sub: users[role].id,
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString("base64url") +
  ".fixture";
const session = (role) => ({
  access_token: tokenFor(role),
  refresh_token: "fixture-" + role,
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    ...users[role],
    aud: "authenticated",
    role: "authenticated",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: now,
  },
});
async function setup(role) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (e) => errors.push(e.message));
  await context.route("https://planner-fixture.supabase.co/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      method = req.method();
    const respond = (value, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(value),
        headers: { "access-control-allow-origin": "*" },
      });
    if (url.pathname === "/auth/v1/token") return respond(session(role));
    if (url.pathname === "/auth/v1/user") return respond(session(role).user);
    if (url.pathname === "/auth/v1/logout") return route.fulfill({ status: 204 });
    if (url.pathname === "/rest/v1/rpc/planner_workspaces")
      return respond([
        {
          id: wid,
          name: "Family wedding",
          wedding_date: "2027-02-10",
          venue: "Jaipur",
          role: role === "owner" ? "owner" : role + "_planner",
        },
      ]);
    if (url.pathname === "/rest/v1/rpc/planner_invite") {
      const body = req.postDataJSON();
      rows.planner_invitations.push({
        id: randomUUID(),
        wedding_id: wid,
        email: body.invite_email,
        role: body.invite_role,
        expires_at: new Date(Date.now() + 604800000).toISOString(),
        accepted_at: null,
        created_at: now,
      });
      return respond("fixture-one-use-invitation-token");
    }
    const table = url.pathname.split("/").at(-1);
    const list = rows[table];
    if (!list) return respond({ message: "Unknown fixture endpoint " + url.pathname }, 400);
    const matches = (row) =>
      [...url.searchParams].every(
        ([key, value]) => !value.startsWith("eq.") || String(row[key]) === value.slice(3),
      );
    if (method === "GET") return respond(list.filter(matches));
    if (method === "POST") {
      const value = req.postDataJSON();
      const item = { id: randomUUID(), revision: 1, created_at: now, updated_at: now, ...value };
      list.push(item);
      return respond([{ id: item.id }], 201);
    }
    const found = list.filter(matches);
    if (method === "PATCH") {
      const value = req.postDataJSON();
      found.forEach((row) =>
        Object.assign(row, value, {
          revision: row.revision + 1,
          updated_at: new Date().toISOString(),
        }),
      );
      return respond(found.map((row) => ({ id: row.id })));
    }
    if (method === "DELETE") {
      rows[table] = list.filter((row) => !matches(row));
      return respond(found.map((row) => ({ id: row.id })));
    }
    return respond({ message: "Unhandled fixture request" }, 400);
  });
  // Authenticated fixture session only; real OAuth wiring has its own browser test.
  await context.addInitScript(
    (value) => sessionStorage.setItem("nimantran-planner-auth", JSON.stringify(value)),
    session(role),
  );
  await page.goto(base + "/planner/");
  await page
    .getByRole("heading", { name: "Two families. One celebration.", exact: true })
    .waitFor();
  await page.getByText("Last fetched:", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Families", exact: true }).click();
  await page.getByRole("heading", { name: "Groom household", exact: true }).waitFor();
  return { page, context };
}
try {
  const { page: bride } = await setup("bride");
  const { page: groom } = await setup("groom");
  assert.equal(
    await bride.getByRole("button", { name: "Edit Groom household", exact: true }).count(),
    0,
  );
  assert.equal(
    await groom.getByRole("button", { name: "Edit Groom household", exact: true }).count(),
    1,
  );
  await bride.getByRole("button", { name: "Add family", exact: true }).click();
  await bride.getByLabel("Family name", { exact: true }).fill("Bride household");
  await bride.getByLabel("This family needs accommodation", { exact: true }).check();
  await bride.getByRole("button", { name: "Save family", exact: true }).click();
  await bride.getByRole("heading", { name: "Bride household", exact: true }).waitFor();
  await groom.getByRole("button", { name: "Refresh", exact: true }).click();
  await groom.getByRole("heading", { name: "Bride household", exact: true }).waitFor();
  assert.equal(
    await groom.getByRole("button", { name: "Edit Bride household", exact: true }).count(),
    0,
  );
  await bride.getByRole("button", { name: "Add member to Bride household", exact: true }).click();
  await bride.getByLabel("Full name", { exact: true }).fill("Asha");
  await bride.getByLabel("Member RSVP status", { exact: true }).selectOption("confirmed");
  await bride.getByRole("button", { name: "Save member", exact: true }).click();
  await bride
    .getByText("Invited 1 · Confirmed 1 · Declined 0 · Pending 0", { exact: true })
    .waitFor();
  // Two separate travel groups for one family.
  for (const mode of ["train", "flight"]) {
    await bride.getByRole("button", { name: "Families", exact: true }).click();
    const family = bride
      .locator("section")
      .filter({ has: bride.getByRole("heading", { name: "Bride household", exact: true }) });
    await family.getByRole("button", { name: "Add travel group", exact: true }).click();
    await bride.locator("form").getByLabel("Transport mode", { exact: true }).selectOption(mode);
    await bride.getByLabel("Origin", { exact: true }).fill("Delhi");
    await bride.getByLabel("Destination", { exact: true }).fill("Jaipur");
    await bride.getByLabel("Passengers in this travel group", { exact: true }).fill("3");
    await bride
      .getByLabel("Arrival at wedding destination", { exact: true })
      .fill("2027-02-09T10:00");
    await bride.getByLabel("Pickup required", { exact: true }).check();
    await bride.getByRole("button", { name: "Save travel", exact: true }).click();
    await bride
      .getByRole("heading", { name: "Add travel group", exact: true })
      .waitFor({ state: "detached" });
  }
  await groom.getByRole("button", { name: "Refresh", exact: true }).click();
  await groom.getByRole("button", { name: "Arrivals & Departures", exact: true }).click();
  await groom
    .getByRole("heading", { name: "Bride household · train", exact: true })
    .first()
    .waitFor();
  await groom.getByLabel("Transport mode", { exact: true }).selectOption("flight");
  assert.equal(
    await groom.getByRole("heading", { name: "Bride household · train", exact: true }).count(),
    0,
  );
  await groom.getByLabel("Transport mode", { exact: true }).selectOption("all");
  await groom.getByRole("button", { name: "Manage pickup", exact: true }).first().click();
  await groom.getByLabel("Assignment status", { exact: true }).selectOption("assigned");
  await groom.getByLabel("Vehicle", { exact: true }).fill("Family van");
  await groom.getByLabel("Driver name", { exact: true }).fill("Driver");
  await groom.getByLabel("Pickup time", { exact: true }).fill("2027-02-09T10:15");
  await groom.getByRole("button", { name: "Save assignment", exact: true }).click();
  await groom
    .getByRole("heading", { name: "Add logistics assignment", exact: true })
    .waitFor({ state: "detached" });
  await bride.getByRole("button", { name: "Refresh", exact: true }).click();
  await bride.getByRole("button", { name: "Logistics", exact: true }).click();
  await bride.getByText("Family van · Driver", { exact: false }).waitFor();
  await bride.getByRole("button", { name: "Add accommodation", exact: true }).click();
  await bride.getByLabel("Assignment status", { exact: true }).selectOption("assigned");
  await bride.getByLabel("Hotel name", { exact: true }).fill("Family Hotel");
  await bride.getByLabel("Check-in", { exact: true }).fill("2027-02-09");
  await bride.getByLabel("Check-out", { exact: true }).fill("2027-02-11");
  await bride.getByLabel("Rooms", { exact: true }).fill("2");
  await bride.getByRole("button", { name: "Save assignment", exact: true }).click();
  await bride.getByText("Family Hotel", { exact: false }).waitFor();
  await bride.getByRole("button", { name: "Overview", exact: true }).click();
  const metric = (label) =>
    bride.locator("section > div").filter({ has: bride.getByText(label, { exact: true }) });
  assert.match(await metric("Invited members").innerText(), /\b1\b/);
  assert.match(await metric("Travel passengers (separate count)").innerText(), /\b6\b/);
  // Concurrent update: captured revision must produce a visible error and retain draft.
  await bride.getByRole("button", { name: "Families", exact: true }).click();
  await bride.getByRole("button", { name: "Edit Bride household", exact: true }).click();
  const family = rows.families.find((f) => f.side === "bride");
  family.revision++;
  await bride.getByLabel("Family name", { exact: true }).fill("Unsaved stale draft");
  await bride.getByRole("button", { name: "Save family", exact: true }).click();
  await bride.getByRole("alert").filter({ hasText: "This record changed" }).waitFor();
  assert.equal(
    await bride.getByLabel("Family name", { exact: true }).inputValue(),
    "Unsaved stale draft",
  );
  await bride.getByRole("button", { name: "Cancel", exact: true }).click();
  const [csv] = await Promise.all([
    bride.waitForEvent("download"),
    bride.getByRole("button", { name: "Export guests", exact: true }).click(),
  ]);
  await csv.saveAs("/tmp/nimantran-planner-guests.csv");
  assert.match(readFileSync("/tmp/nimantran-planner-guests.csv", "utf8"), /Asha/);
  await bride.getByRole("button", { name: "Refresh", exact: true }).click();
  await bride.getByRole("button", { name: "Refresh", exact: true }).waitFor();
  await bride.getByRole("button", { name: "Edit Bride household", exact: true }).click();
  await bride.getByLabel("Notes", { exact: true }).fill("Updated family note");
  await bride.getByRole("button", { name: "Save family", exact: true }).click();
  await bride.getByText("Updated family note", { exact: true }).waitFor();
  bride.once("dialog", (dialog) => dialog.accept());
  await bride.getByRole("button", { name: "Remove member", exact: true }).click();
  await bride.getByText("Asha", { exact: true }).waitFor({ state: "detached" });
  await bride
    .getByText("Invited 0 · Confirmed 0 · Declined 0 · Pending 0", { exact: true })
    .last()
    .waitFor();
  assert.equal(rows.family_members.length, 0);
  const { page: owner } = await setup("owner");
  await owner.getByRole("button", { name: "Settings", exact: true }).click();
  await owner.getByLabel("Planner email", { exact: true }).fill("new-planner@example.invalid");
  await owner.getByRole("button", { name: "Create secure invitation link", exact: true }).click();
  await owner.getByLabel("Private invitation link", { exact: false }).waitFor();
  assert.match(
    await owner.getByLabel("Private invitation link", { exact: false }).inputValue(),
    /\/planner\/#invite=/,
  );

  await bride.getByRole("button", { name: "Settings", exact: true }).click();
  assert.equal(
    await bride.getByRole("button", { name: "Create secure invitation link", exact: true }).count(),
    0,
  );
  assert.equal(
    await bride.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
  );
  assert.deepEqual(errors, []);
  await bride.screenshot({ path: "/tmp/nimantran-planner-mobile.png", fullPage: true });
  console.log(
    "PASS browser API fixture: separate bride/groom sessions, family+member CRUD saves, two travel groups, mode filter, shared pickup and accommodation, refetch across sessions, real calculated metrics, stale save rejection, CSV download, member controls, mobile layout. Hosted Auth/sync NOT tested.",
  );
} finally {
  await browser.close();
}
