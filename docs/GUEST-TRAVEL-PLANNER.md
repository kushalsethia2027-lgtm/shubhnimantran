# Guest & Travel Planner

This extends the existing Nimantran React / TanStack Start application. The landing page, `/product`, `/app` invitation accounts and `/demo` video studio remain in place. `/planner/` is a separate authenticated module, included in both the normal build and the existing static Netlify build (`npm run build:demo`, publish `dist-demo`). It uses the official `@supabase/supabase-js` client against the **same Supabase project**. It does not use the old server-only API or require a service-role key. The existing invitation-account cookies and planner browser sessions are separate sign-in sessions; the underlying Supabase user accounts are the same.

## Connect the backend

1. In the existing Supabase project, inspect applied migrations and back up important data. If migrations 001–003 are already applied, run **only** `supabase/migrations/202610170004_guest_travel_planner.sql` in the SQL editor. Do not rerun `supabase/setup.sql` against an initialized project. For a fresh project, apply 001, 002, 003, then 004 in order (or the original `setup.sql` once, then 004). The new migration runs in one transaction and contains no DROP TABLE or data reset.
2. In local `.env`, or Netlify → Project configuration → Environment variables, set:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   ```

   Use the publishable key from Supabase → Project Settings → API Keys, or its legacy **anon** JWT. Both are public browser credentials; RLS enforces access. Never use a secret key or service-role JWT in any `VITE_` variable. Both build configurations reject a secret/service-role value in the planner public-key setting before bundling; test keys are covered by `tests/planner-env.test.ts`. Existing server-only environment variables are unchanged. No real credentials belong in Git or chat.

3. Supabase → Authentication → Providers: enable Email and email confirmation. In URL Configuration, set your deployed Site URL and allow **exact** redirect URLs:
   - `https://ni-man-tran.app/planner/`
   - Your actual Netlify preview domain followed by `/planner/`, if used.
   - `http://127.0.0.1:3000/planner/` for the normal local app.
   - `http://127.0.0.1:4173/planner/` for static preview, if used.
4. Retain Supabase's standard confirmation and password-recovery link templates for this module (links use `{{ .ConfirmationURL }}`). If an earlier OTP customization removed that link, add it back alongside `{{ .Token }}` to support both flows. The planner uses individual email/password accounts, with PKCE confirmation/recovery redirects. Open confirmation/reset links in the same browser that requested them. Signup might not issue a session until email is confirmed. Email restrictions and rate limits still apply: this module cannot bypass Supabase/Gmail delivery configuration or quotas. Never disable RLS to address an authentication error.
5. Rebuild/redeploy after changing `VITE_*`. Keep Netlify branch `nimantran-mvp`, build `npm run build:demo`, publish `dist-demo`. No DNS changes are required. Local development: `npm install`, then `npm run dev -- --host 127.0.0.1 --port 3000 --strictPort`.
6. Open `/planner/`. Missing public configuration shows a setup screen, not simulated records. Missing tables/RPCs produce a migration instruction. A configured URL alone does not establish that Auth/database connectivity works.

## First workspace and separate planners

1. The owner creates their own Supabase account, confirms their email and signs in. Existing invitation users can use that same account/password; requesting a password reset is available if they previously used OTP only.
2. Existing invitation weddings are available to their owners after the migration. New invitation weddings receive an owner membership through a trigger. Alternatively, click **New wedding workspace** and enter name/date/venue. This creates an existing-schema wedding and its owner membership; no existing wedding is overwritten.
3. Settings → **Invite a planner**: enter the recipient's exact email and choose `bride_planner` or `groom_planner`. The database verifies the current actor is the owner. Copy the private one-use link shown once, and send it directly to the intended person yourself. The app does not send invitation emails or messages.
4. The recipient opens that link, creates/confirms their own account if necessary and signs in. After a confirmation redirect, reopen the original invitation link if the invitation prompt is gone. Accept using the exact **verified email** the owner invited. The database checks email, expiry and prior acceptance, then writes membership. No shared passwords or editable user-metadata roles are used. Add the other side the same way. The owner may also manage either side.
5. Tokens contain 244 random bits, expire in seven days, are stored only as SHA-256 hashes, and are delivered in the URL fragment (not sent as a server path/query). The fragment is removed from history immediately. Pending tokens live only in component memory. Accepted/expired/revoked links cannot grant membership. Do not publish these private membership invitations; they are not public guest-data links.
6. Settings lists account IDs and roles. Only the owner can revoke pending invitations or remove non-owner membership. To change a planner role, remove their old membership and issue a new invitation. Ownership transfer is deliberately unavailable. There is no invitation/role claim based on user-provided metadata.

## Data and access

- Reuses `public.weddings` (`owner_id` is the existing equivalent of `created_by`); adds a `name` column without modifying existing names/couple details. Planners see a minimal workspace summary through `planner_workspaces`, not owner-only invitation guests, scripts or recordings.
- Adds `wedding_members`, `families`, `family_members`, `travel_groups`, `logistics_assignments`, and `planner_invitations`. No existing invitation tables are replaced. All new tables have RLS enabled; sensitive columns of the invitation table are not granted to clients.
- A member may read that wedding's planner records across both sides. Only the owner or the corresponding side planner may write family/member/travel records. Both sides may write shared pickup/accommodation records. Only the owner may manage membership or delete the planner workspace. Anonymous users and nonmembers cannot read guest contacts or call private RPCs.
- Child foreign keys include both wedding ID and parent ID. Triggers forbid moving rows between weddings, moving members/travel between families, changing a family's side, or changing an assignment target/type. Create a new record explicitly when these must change.
- Guest totals use individual members and their RSVP statuses. A family RSVP is a coordination note, not an inherited per-person RSVP. Family `accommodation_required` is an additive field so requirements can be calculated honestly. Confirmed members of those families are counted as accommodation requirements; room counts remain separate because occupancy is not assumed. Per-event attendance is not included in this MVP and invitation guests are not automatically imported/deduplicated.
- Each family can have several travel groups. Travel passenger totals are explicitly separate from registered guest totals. Arrival/departure timestamps are stored as `timestamptz`; forms and displays use the browser's named timezone. Departure means leaving the wedding destination. Check-in/out are local calendar dates. Missing details remain visible; incomplete travel can be saved.
- Pickup “needed” is derived from travel requests until an assignment is assigned/completed. A group has at most one pickup assignment. Wedding-wide accommodation can omit a travel group and appears under “Both sides.” Room/date details must be entered explicitly before marking accommodation assigned. No driver, vehicle, hotel or room is automatically allocated.
- Deleting a family cascades its members/travel/linked assignments after confirmation. Deleting a travel group cascades its linked assignments. Deleting a **planner workspace** removes planner records/membership only: the existing invitation wedding, invitation guests, events and media stay intact, to preserve the existing product.

## Synchronization and conflicts

All planning data is read from and written to Supabase; it is never persisted in localStorage. Supabase session tokens are kept in **tab sessionStorage**; sign in independently on another device. Each mutation requires a backend response and is followed by a full re-fetch. There is a Refresh button, a last-fetched indicator, a visible-tab poll every 30 seconds, and refetch on window focus. There is no Realtime publication or public subscription to configure.

Reads are paginated in batches of 500 to avoid silently truncating the default PostgREST 1000-row limit. Updates/deletes include the row's revision, and database triggers advance it. A stale revision or changed authorization yields zero affected rows and a visible conflict; unsaved form text is retained. Reopen the form after refresh to merge changes manually. Save confirmation is not shown before a successful backend response. If the save succeeded but refresh fails, the message distinguishes those outcomes.

Filters apply consistently to CSV exports. Side/search filter family and member counts; travel date/mode/pickup filters affect travel and related logistics. Arrival and departure timelines are grouped chronologically; undated/missing details remain explicit. CSV exports include only records returned by the authenticated, RLS-protected backend and escape spreadsheet formulas. Downloaded CSVs contain private details and must be handled accordingly. No public guest links, identity documents, paid APIs, tracking or messaging integrations are added.

## Validation

```bash
npm run typecheck
npm run lint
npm test                         # requires Bun, as before
npm run test:db                   # Docker, disposable PostgreSQL 17
npm run build
npm run build:demo
node tests/static-site-browser.mjs
npm run test:camera
```

`tests/planner-database.sql` runs after all migrations and the existing invitation database checks. It models verified Supabase user identities in an isolated fixture, sets `role authenticated` and JWT subject IDs, and tests owner/bride/groom/outsider/anonymous permissions, denied direct inserts/updates/deletes, role escalation, membership RPC restrictions, invite email binding/replay, foreign-wedding children, multi-group reads, shared assignments, revision conflicts, revoked access and planner-only deletion. It is **not** a hosted Supabase Auth test.

`tests/planner.test.ts` checks actual counts, filters, multiple groups, required assignment data, invalid dates/counts and CSV escaping. `tests/planner-browser.mjs` uses an explicitly mocked HTTP API fixture to test UI wiring across separate browser sessions; it does not claim to test hosted authentication or RLS. To run that fixture without real credentials:

```bash
VITE_SUPABASE_URL=https://planner-fixture.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_fixture npm run build:demo -- --outDir /tmp/nimantran-planner-browser
npx vite preview --config vite.demo.config.ts --outDir /tmp/nimantran-planner-browser --host 127.0.0.1 --port 4174
# In another terminal:
node tests/planner-browser.mjs
```

These commands use POSIX syntax for the cloud/test environment. Never deploy the fixture build. The normal production build uses your real public environment settings or the configuration screen.

## Required hosted acceptance check

Hosted readiness is **not established** until these are performed against your configured Supabase project:

- Owner and both planners sign in on separate browsers/devices with distinct verified accounts.
- Owner creates a workspace and emails/private-shares the secure invitations; wrong-email/expired/revoked links fail.
- Each planner adds a family and members on their side; the other device sees the change after Refresh (or within 30 seconds while visible).
- Direct authenticated API attempts to write the opposite side and foreign-wedding children fail, and an anonymous request returns no private data. Local SQL tests alone do not certify the hosted deployment.
- Add two travel groups for a family, arrange a pickup and accommodation from the opposite side, and verify filters/CSV and individual-member counts.
- Open the same record in two sessions: after one saves, the other's stale save must fail and retain its draft.
- Remove a member and verify their subsequent requests lose access.
- Confirm the original homepage, sample MP4, invitation creation, recording and final video downloads still work.
