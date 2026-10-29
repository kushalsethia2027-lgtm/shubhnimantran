# Nimantran

**Go out. Find your people.** A Gurgaon-first, adults-only social events web app with separate attendee and host experiences.

Discover events by interest, neighbourhood, budget, age eligibility, solo-friendly atmosphere and sober preference. Hosts list gatherings with clear inclusions and review guest introductions before approving them. Confirmed free bookings receive category-themed invitations; hosts check guests in and attendees can review completed events.

## Run locally

Use Node.js 22.12+ (tested with Node 24) and the existing locked dependencies. On Windows, run each command separately from this repository's folder:

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000/`. For the cloud environment's frozen-lockfile setup, use `bash scripts/install-cloud.sh`.

## Connect shared accounts and event data

Copy `.env.example` to `.env`, supply the existing Supabase project's public URL/publishable key, and apply `supabase/migrations/202610290005_social_events.sql` once. Keep Google OAuth enabled and allow your site's `/auth/` redirect URL. Do not delete legacy database data or reapply old migrations.

See [complete setup, permissions, tests and launch limitations](docs/SOCIAL-EVENTS.md).

Without the backend, clearly labelled fictional event concepts let visitors explore the design. These concepts cannot be booked. Paid checkout and ₹250 referral credits are not active. Free live events support requests, host approval, confirmed tickets, check-in and attendance-backed reviews once the migration and Google authentication are configured.

## Deploy to Netlify

- Connected branch: `nimantran-mvp`
- Build: `npm run build:demo`
- Publish directory: `dist-demo`
- Public build settings: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

Despite its historical script name, `build:demo` builds the complete new static site. Do not deploy the dummy configuration used by browser fixtures.

## Checks

```bash
npm run typecheck
npm run lint
npm run build:demo
npm run build
npm run test:social:db
```

Browser fixture setup is documented in [SOCIAL-EVENTS.md](docs/SOCIAL-EVENTS.md). Existing wedding documentation, source and migrations are historical; the wedding-facing site and API have been retired. The replacement does not erase existing users or wedding records.
