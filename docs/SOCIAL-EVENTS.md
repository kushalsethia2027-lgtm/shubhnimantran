# Nimantran social events MVP

The founder authorised replacement of the wedding-facing product on 29 October 2026. The new site is an adults-only, Gurgaon-first platform for hosted social gatherings. Previous database records are preserved. The old wedding routes now render the new app, and the legacy `/api/nimantran/*` endpoints return HTTP 410 in the full server build. Git history has not been rewritten.

## What is built

- A completely new responsive visual system: original AI-created rooftop brand artwork, plum/ivory/orange palette, poster-style category art, desi copy, four explanatory story cards and category-themed invitation tickets. The hero artwork is labelled as artwork, not a real event.
- Attendee and host entry points. Six named categories, neighbourhood/text search, city, date in IST, budget, age eligibility, atmosphere, solo-friendly and sober filters.
- List/map switch. A pannable, zoomable OpenStreetMap neighbourhood map with price pins, attribution, reset control and failure feedback. No location permission is required. An external map tile provider remains a dependency; production scale should use a provider suitable for expected traffic and OSM usage policy.
- Supabase Google authentication, private date of birth, public display name/bio, adults-only profiles. Age is self-declared; this is not ID verification.
- Three-part host creation with explicit inclusions, exact private address, approximate public coordinates, age rules and sober status. Form drafts stay in the current browser tab's session storage. A host may edit descriptive details before active guest requests; revision checks prevent stale edits. Later material changes require cancellation/relisting.
- Mandatory guest introductions, host approval and capacity enforcement. Free events can proceed to confirmed bookings. Paid listings explicitly cannot be approved until payment infrastructure is implemented.
- Confirmed private venue access, themed tickets, downloadable standalone SVG invitations, print/PDF, host check-in using the attendee's booking code, and one review per checked-in guest after the event ends. Hosts can reply. Confirmed guest counts and hosting history come from actual records.
- Saved real events, personal booking dashboard, host cancellation, private issue reports stored for operator review, event share links and referral attribution. Referral credits are NOT enabled; proposed ₹250/₹250 rewards are labelled coming soon.
- Clarity project `z460vx117a` retained, with account, form, dialog and ticket areas masked. No custom analytics events containing private data were added.

## Connect the existing Supabase project

1. Keep the existing Netlify build variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Use the existing project, and only its publishable or legacy anon key. No frontend service-role key.
2. In Supabase SQL Editor, run **only** `supabase/migrations/202610290005_social_events.sql` once. It is standalone for an existing Supabase Auth project; it does not require reapplying wedding migrations and it never drops those tables. If any social tables already exist, stop and inspect migration history rather than dropping them.
3. Keep Google enabled in Supabase Auth. Google Cloud's authorised redirect URI remains `https://ozvuruhglhyhuparvael.supabase.co/auth/v1/callback`. Supabase Site URL is `https://ni-man-tran.app`; allowed app return URL is `https://ni-man-tran.app/auth/` (plus local preview auth URL for testing). Google OAuth testing-mode accounts must be allowed by its audience settings.
4. Netlify remains branch `nimantran-mvp`, build `npm run build:demo`, publish `dist-demo`. Rebuild after changing public environment variables. Public Google/DNS configuration is unchanged.
5. Sign in, complete an adult profile, and publish a **free** future event. From a second Google account, write an introduction. As host, approve it. Refresh My plans on the guest device to see the ticket and exact address. Check-in is available only from the scheduled start until one day after the scheduled end. Review after the event ends.

When configuration is absent or no live listings exist, clearly labelled fictional event concepts are shown. They cannot be requested, saved as real events, reviewed, paid for or used as valid tickets. Fake host ratings are never supplied. Hosted schema application, real Google sign-in and a two-device real Supabase acceptance test could not be performed without project management access in this environment.

## Data and access

Eight new RLS-enabled tables use the `social_` prefix: profiles, accounts, listings, venues, bookings, reviews, saved and reports. All mutation authority lives in scoped PostgreSQL functions, except self-scoped saved events. Default PUBLIC execution is explicitly revoked. Clients cannot directly change booking states, prices, guest counts, birth dates or reviews. RPCs check `auth.uid()` rather than trusting client role/host/user IDs.

Event creation fixes the host to the signed-in adult. Public map coordinates are rounded to two decimals. Dates, prices, capacities, age ranges, inclusions and copy lengths are constrained. Hosts and confirmed/checked-in guests can read exact venues. Birth dates are visible only to the account owner; guest lists are limited to host/guest. Counts exclude pending, declined and cancelled requests. A completed-hosting count requires the event to have ended, remain uncancelled and have at least one checked-in guest.

Approval and request functions lock the event row to serialise capacity decisions. Guests cannot self-approve or forge confirmation. The paid approval path deliberately fails. Check-in requires the correct code and time window. Reviews require checked-in attendance and the event to have ended, with a unique event/user constraint. Operator database access is still privileged; RLS is not a substitute for a staffed moderation process.

## Verification commands

```bash
npm run typecheck
npm run lint
npm run build
npm run build:demo
npm run test:social:db
# Build an isolated browser fixture; never deploy this dummy configuration.
VITE_SUPABASE_URL=https://social-fixture.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_social_fixture \
npm run build:demo -- --outDir /tmp/nimantran-social-fixture
npm run test:social
```

`test:social:db` runs real PostgreSQL 17 in a disposable Docker container with modelled Supabase identities. Checks cover permitted/denied reads and writes, underage profiles, DOB changes, direct forged confirmation, cross-host access, address privacy, guest counts, capacity, ticket issuance, stale edits, edits after requests, wrong/early check-in, attendance-backed reviews, duplicate reviews, private reports, cancellations and paid-approval denial. This is not an audit of hosted Supabase settings.

`test:social` uses intercepted Supabase HTTP in separate browser contexts. It exercises discovery, category filters, preview booking denial, map controls/fallback, mobile overflow, three-section host publication, guest introduction, approval refresh across contexts, private address access, SVG download, check-in and review posting. It does not make real Google, Supabase, OSM or payment calls.

Legacy invitation test scripts remain historical and do not validate the redesigned UI. Existing server/domain unit tests remain available. Third-party installed marketing-skill snippets and generated marketing assets are excluded from application linting.

## Before taking real paid bookings

The prior Dodo wedding-software plan does not establish support for marketplace ticketing or host payouts. Confirm provider eligibility, KYC, split/payout handling, tax treatment, refunds and disputes first. Then implement server-created checkout, signature-verified idempotent webhooks, authoritative payment/entitlement records, seat reservation expiry, host payout reconciliation and refund handling. A return URL or frontend state must never confirm payment.

No money, automatic messages or referral rewards are sent by this release. Approved paid bookings remain disabled rather than issuing fake tickets. Payment secrets must never enter a `VITE_*` variable. Existing Shipped read-only keys are for reporting only.

## Operational limits before a public launch

- Add a real support/privacy contact, reviewed booking/privacy terms, cancellation handling, operator moderation tools and a staffed report response process. Stored reports are not automatically emailed or actively monitored by the software.
- Define host approval/identity and venue-permission checks. The app does not claim verified identities or venue safety. Alcohol-free listings are filterable; other listings require minimum age 25 as a conservative platform policy and host attestation, which does not replace local legal/venue requirements.
- Add authentication and request abuse protections appropriate to launch volume, an operator ability to suspend hosts/listings, and production monitoring/backups.
- Decide and fund referral eligibility, minimum spend, expiry, limits, fraud prevention and refund reversals before issuing any credit.
- No attendee chat, public attendee identities, automatic seat assignment, waitlist, automatic messaging, subscriptions or paid boosts in this MVP. One request per guest/event; declined/cancelled requests cannot currently be resubmitted. Hosts can cancel, but no financial refund is performed because payment is disabled.
- Approximate pins are host-entered, not geocoded or independently verified. Event reading is capped at 1,000 accessible rows in this MVP; add pagination before scaling. Refresh-on-focus and explicit refresh are implemented; there is no Realtime subscription.
- Historical wedding code and migrations are retained as non-public legacy source to preserve data/history. They are not part of the reachable wedding product anymore.

## Results from this implementation

- TypeScript: passed.
- ESLint: zero errors; six existing UI-component fast-refresh warnings.
- Static Netlify build and full TanStack build: passed.
- Bun unit suite: 70 passed, zero failed (six new social-discovery cases).
- Standalone social PostgreSQL access checks: passed.
- Full existing migration chain, including the new social migration, and legacy database checks: passed.
- Social browser HTTP-fixture journeys: passed, including separate host/guest contexts, ticket download and completed-event review.
- Real static build smoke checks: new social app at root and former wedding page URLs, no mobile horizontal overflow or runtime errors.
- TanStack development SSR smoke check: passed; retired wedding API returns 410.
- Desktop and mobile screenshots: `docs/screenshots/social-home-desktop.jpg` and `docs/screenshots/social-home-mobile.jpg`.
- Not performed: hosted migration application, real hosted Google account flow, real cross-device Supabase acceptance, Netlify deployment status verification, live payments/payouts or referral credit issuance.
