# Nimantran

Every invitation carries your family's voice.

This TanStack Start/React/TypeScript application preserves the existing Lovable landing page and adds a private wedding studio. It includes database-backed wedding/guest/script/consent workflows and explicitly unavailable external-production screens. **It is not launch ready:** voice verification, rendered samples, batch workers and WhatsApp sending still require implementation and provider acceptance. See [implementation status and blockers](docs/IMPLEMENTATION.md).

## No-login submission path

**Open `/demo` to use the new browser-local wedding invitation studio without sign-in or API keys.** It supports wedding/guest editing, CSV preview, per-guest permissioned audio and camera-video recording, audio upload, editable local Hindi/Hinglish scripts, representative approvals, real browser video encoding, preview and direct download. Example data/audio is explicitly labelled; no voice cloning or external messaging is simulated.

For the deadline, follow [SUBMISSION.md](SUBMISSION.md). It includes Windows instructions, the presentation walkthrough, exact voice requirements and optional static-site deployment. `npm run build:demo` produces a standalone static build in `dist-demo`; no server or database is needed after hosting those files over HTTPS. A ready-to-upload ZIP and a real generated example are in `submission/`.

## Local development

Requires Node.js 22.12+ (tested with Node 24.19), Bun 1.3.14, and optionally Docker for database integration tests.

```sh
bun install --frozen-lockfile
cp .env.example .env
# Fill server configuration securely; do not commit .env.
npm run dev -- --host 0.0.0.0 --port 3000
```

The app studio is at `/app`; the landing remains at `/`. Without Supabase configuration the studio shows a development/unavailable state and the waitlist cannot save. No fake accounts, records or delivery successes are supplied.

The lockfile's Lovable configuration tarball currently points to an inaccessible registry. If installation fails with 403, use the tested cache-seeding workaround:

```sh
bash scripts/install-cloud.sh
```

It fetches the **same version** from the public npm registry with the same locked SHA-512, seeds a local Bun cache, and installs the app with its frozen lockfile. TLS and integrity verification remain enabled. Existing cloud tasks are isolated; use the checkout already present rather than creating a worktree.

## Supabase setup

Use a dedicated Supabase project. These migrations create application tables; review them before applying to an existing database. In the SQL editor, apply all files in `supabase/migrations` in filename order. Alternatively, with the official Supabase CLI:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `APP_ORIGIN` in `.env` or server environment settings. Never prefix secrets with `VITE_`. The service-role key is used only on the server for waitlist allocation, shared rate limiting and private storage/deletion; private application reads/writes use the user's JWT and RLS.

Enable email authentication, configure production SMTP, and change both the **Confirm signup** and **Magic Link** email templates to display `{{ .Token }}` (the app accepts a numeric code, not a magic-link callback). Set the Auth site URL to your exact application origin. Keep OTP expiries short and configure Supabase's own Auth rate limits. Restart the app after environment changes.

After setting the server variables, run `npm run check:supabase` (Bun required). This read-only preflight checks Auth reachability, required tables, service-role access and private bucket configuration without printing keys or records. It does not apply migrations or prove email delivery.

For a fresh/empty project, `supabase/setup.sql` is a single-transaction alternative containing all three migrations. Use it instead of applying the migration files individually, never both. Windows users can run `type supabase\setup.sql | clip`, then paste the SQL into the Supabase SQL Editor.

Migrations create private `voices` and `invitations` buckets. Hosts have no direct storage policies; server endpoints verify wedding ownership before upload, signing or deletion. Existing buckets must remain private and match the documented MIME/size restrictions. Never make these buckets public to fix an access error.

## External providers

All external API keys remain server-only. Configuration presence is not proof of live integration.

- **Anthropic:** set `ANTHROPIC_API_KEY` and optionally `ANTHROPIC_MODEL` to a model available to your account. A host explicitly approves each AI draft request. Only selected-event facts and relevant guest details are sent. Drafts need human review and saving before approval.
- **ElevenLabs:** set `ELEVENLABS_API_KEY`. TTS/deletion adapters exist; cloning/enrollment and provider-required consent verification are not activated. No host can mark their own voice as provider verified. Never manually flip this flag to bypass consent verification.
- **Shotstack:** set `SHOTSTACK_API_KEY`; use `SHOTSTACK_ENV=stage` for sandbox. Submission/polling adapters exist, but Hindi templates, samples and the worker are outstanding. No render is submitted by the UI.
- **Twilio:** set account SID/auth token, `TWILIO_WHATSAPP_FROM` and approved `TWILIO_CONTENT_SID`. Onboard the official WhatsApp Business sender. Adapter variable `1` is the guest name, `2` the watch link; adjust only with a reviewed approved template. The webhook endpoint verifies HMAC against exact `APP_ORIGIN`, then returns 503 because status persistence is not yet activated. Do not point live callbacks to it or enable live sends yet.
- **Support:** set `SUPPORT_EMAIL` to a real monitored address.

Allow required HTTPS egress to your Supabase project domain, `api.anthropic.com`, `api.elevenlabs.io`, `api.shotstack.io`, `api.twilio.com`. Google Fonts are optional browser resources. Never disable TLS or expose service keys to browser assets.

## Verification

```sh
npm run typecheck
npm test                 # requires bun on PATH
npm run test:db          # Docker; disposable PostgreSQL 17, no published DB port
npm run dev -- --host 0.0.0.0 --port 3000
# In another terminal; use existing Chromium, or install it with playwright first:
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
npm run lint
npm run build            # existing Lovable/Cloudflare default
npm run build:node       # standalone Node deployment target
```

`tests/browser.mjs` defaults to an installed `/usr/bin/chromium`; set `CHROMIUM_PATH` if different. Authenticated browser tests use API fixtures; the database tests use real PostgreSQL with Supabase auth/storage SQL fixtures. These are not live-provider acceptance tests. No test sends invitations or creates provider media.

## Deployment

### Standalone Node (verified build and local HTTP smoke test)

1. Provision a Node 24 host with HTTPS and a process supervisor. Configure server-only variables from `.env.example`; set `APP_ORIGIN` to the exact public HTTPS origin, without a trailing slash.
2. Apply the migrations to Supabase and configure email OTP/SMTP as above.
3. Run the frozen dependency installation (or `bash scripts/install-cloud.sh` for the registry workaround).
4. Run `npm run typecheck`, `npm test`, then `npm run build:node`.
5. Start `HOST=0.0.0.0 PORT=3000 npm start` with your supervisor. Serve behind HTTPS. Retain the complete `.output` directory; client assets are under `.output/public`.
6. Verify `/`, `/app` and `/api/nimantran/status`, then sign in as two real test accounts and validate isolation, create/edit/import/save/return/consent/delete flows. Do not launch production media or delivery features until the blocker checklist is complete.

### Vercel or Lovable

The bundled Nitro config supports target detection. For Vercel, set the build command to `NITRO_PRESET=vercel npm run build`, Node 24, production server environment variables, and use the generated Nitro/Vercel output. This path is **documented but not deployed/verified here**. Lovable's existing default Cloudflare build is retained and builds successfully; runtime secret binding and authenticated API behavior require deployment validation. Standalone Node has been locally smoke-tested. Do not deploy this as a static-only site: it needs server-side API execution.

## Privacy, consent and retention

Speaker self-declaration and a recording alone are not proof of identity or provider consent verification. Both spoken and explicit written consent are collected; generation stays disabled. Revocation is immediate in the database. Deletion is confirmed only when applicable operations succeed; provider/derived asset failures remain visible in deletion requests. Recipients may retain previously delivered files, which cannot be recalled.

Proposed retention: raw/generated media up to 30 days after the final event, guest details up to 90 days, restricted consent/audit evidence up to one year. **The cleanup scheduler and legal review are launch blockers, not deployed capabilities.** Review DPDP obligations, notices, processor agreements, cross-border handling, access rights and retention before launch. No legal compliance is claimed.

See [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) for exact delivered scope, unverified integrations and severity-ordered launch requirements.

## Guest & Travel Planner

The additive `/planner/` module supports separate authenticated family planners, shared travel/logistics and Supabase persistence. See [setup, schema, permissions and acceptance checks](docs/GUEST-TRAVEL-PLANNER.md). Public browser environment values and the new migration are required; until configured, the module shows setup instructions. Existing invitation flows remain available.

Google replaces manual sign-in forms; enable the provider using the [Google sign-in setup guide](docs/GOOGLE-SIGN-IN.md). The homepage includes an interactive, labelled preview of the Guest & Travel Planner.
