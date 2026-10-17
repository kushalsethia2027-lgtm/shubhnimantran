# Implementation status and launch gates

This is a persistent core application under development, **not a launch-ready end-to-end video delivery product**. Do not enable generation/sending merely by adding keys.

## New no-login submission workflow

`/demo` is a real browser-local application with example metadata, editable wedding/guests/CSV import, per-guest actual audio and camera recording, audio upload, explicit local recording permission, deterministic personalised text, three-group sample approval, live canvas design and genuine browser-rendered video download. It does not call the cloud backend or providers. MP4/WebM selection follows browser encoding support. Audio is embedded unchanged; cloning and automatic spoken name replacement remain unavailable. Local draft persistence is explicitly distinguished from Supabase persistence. See SUBMISSION.md for the tested standalone deployment build and remaining production requirements.

The following account/cloud limitations still apply to `/app` and the production pipeline, not to the implemented local demo download workflow.

## Delivered

- Existing landing page, visual identity and bundled video with native controls retained. Unsupported language/watch/turnaround marketing claims corrected. No checkout or paid add-ons.
- Waitlist now validates all seven requested fields and saves through a service-only RPC; duplicate email submission is idempotent. Founding-family allocation is serialized and limited to the first 100 saved families.
- Email OTP request/verification/refresh/logout endpoints using Supabase Auth. Browser tokens are HttpOnly/SameSite cookies. Mutation endpoints require the configured same origin. Auth verification is server-side on every private operation.
- Dashboard, multiple weddings, creation/editing with individual event dates/venues, guest category limits, saved tone and template preference. Changing wedding data invalidates prior scripts; active production locks changes.
- Owner-only PostgreSQL RLS plus constrained write RPCs. Composite foreign keys prevent cross-wedding event assignment. Audits and consent/approval histories cannot be edited by the host.
- Guest manual add/edit/delete, relation suggestions/custom terms, pagination/search/language/attention filtering, CSV template, RFC 4180 preview, normalized phone duplicates, row errors, event-name mapping, atomic import and spreadsheet-safe export. Imported guests are never assumed to have opted in to messaging.
- Browser recorder, supported MIME selection, timer/60s stop, playback/discard/re-record, 30–60s validation, speaker name/relation, explicit consent copy/version and immutable history, private upload/signature checking, signed two-minute playback links. Duration is browser-declared and is not a server media-analysis check or proof of speaker identity. Provider verification is false by default and cannot be set by the host.
- Voice revocation first blocks new generations and cancels queued work; recording deletion and a registered ElevenLabs voice deletion are attempted. Unconfirmed provider/derived asset deletion stays failed/pending. Minimal consent history is retained.
- Per-guest script editing and pronunciation text, optional server-side Anthropic draft request with explicit usage approval, revision checks, locking/reopening approvals, representative relationship sample selection and a three-group gate. Guests receive only their assigned event facts in the generation prompt. **AI output still needs host/native-speaker review; factual correctness is not automatically guaranteed.**
- Durable job tables, unique per-script-revision/voice idempotency keys, transactional sample/voice/count gates, service-only SKIP LOCKED job claiming, queued-job cancellation. No worker is deployed or invoked by the app.
- Server-side ElevenLabs TTS/deletion, Shotstack submission/poll and Twilio approved-template submission adapters. Real outbound calls are isolated. The app does not invoke billable TTS/rendering/messaging adapters.
- Local Twilio HMAC verification with tampering tests; callbacks remain unavailable (503) after verification until monotonic/idempotent processing is implemented.
- Mobile navigation and 390px browser validation, Hindi navigation/intro, reduced-motion support, inline errors and unavailable states. **Full Hindi form translation remains incomplete.**

## Launch blockers in priority order

1. **No live Supabase configuration.** Apply migrations to a dedicated reviewed project, configure Auth SMTP/OTP template, verify account creation, expiration/refresh/logout, RLS, storage upload/playback/deletion and persistence using two actual accounts. Local PostgreSQL tests model Supabase auth/storage SQL contracts; they are not hosted Auth/Storage tests.
2. **No live production pipeline.** Provider consent/identity verification and voice enrollment are not implemented. Need a resumable worker with periodic reauthorization, approved sample audio/video generation, actual Hindi typography templates, private rendered asset ingestion and signed watch links. Add provider polling, reconciliation and a job reaper. An interrupted outbound request has unknown outcome: place it in `needs_review`, never blindly retry and bill twice. Existing `claim_job` is infrastructure only.
3. **No live sending or scheduling.** Need Twilio Business onboarding and an approved Content SID, opt-out flow, final per-guest message preview, explicit recipient-count/time confirmation, timezone handling, durable schedule/cancellation, at-most-once submission/reconciliation, signed monotonic callbacks and real sandbox acceptance. Signature verification alone is not webhook processing. Never infer delivered/read from submission. No RSVP, reminders or watch analytics yet.
4. **Privacy operations need deployment and review.** Retention cleanup scheduler, orphan-upload reconciliation, derived media/provider deletion, reviewed notices/retention/legal basis, processor terms, grievance contact, backups and incident handling are outstanding. Raw media durations/voice quality/identity are not server verified. Do not claim legal compliance or completed external deletion.
5. Secure, expiring team-assisted review links, pronunciation-reference uploads/corrected audio previews, restricted admin tools, full Hindi localization and RSVP are not implemented. Owner-only script review works; it is not the requested audio/video sample workflow.

## Test evidence

- `bun test tests`: unit tests use deterministic inputs and mocked fetch where necessary. They verify CSV/phone/schema/gating, origin/access boundaries, missing configuration, cookie flags, streamed body limits and cryptographic webhook signatures.
- `npm run test:db`: real disposable PostgreSQL 17; migrations applied and actual role/RLS/RPC behavior tested. Auth users and the storage bucket catalog are local schema fixtures. No external messages/media are created.
- `npm run test:browser`: Chromium, real local public pages and unavailable configuration; authenticated UI journey uses explicitly labelled API interception fixtures. The recorder test uses a real Chromium MediaRecorder and a synthetic test microphone for 30 seconds; its upload is intercepted, not persisted through live Supabase Storage. It proves UI wiring/mobile layout, **not live end-to-end persistence or live OTP**.
- Build/typecheck/lint are separate checks. No live Claude, ElevenLabs, Shotstack or Twilio integration has been verified.

## Queue design and external side effects

Database approval is not provider authorization by itself. A future worker must lock/check wedding, current script revision, active provider-verified consent and opt-out state immediately before each external side effect. Persist provider request/result IDs. Reconcile ambiguous timeouts; do not automatically re-submit Twilio or create duplicate assets. Delivery should have a unique `(asset, guest, channel)` identity, and host cancellation must race safely with a transactional worker claim. A lease recovery job must move abandoned work to review/reconciliation, not silently restart provider submissions.

No bearer token, signed storage URL or guest PII belongs in application logs. API errors log event types, provider hostname/status and IDs only. A support contact must be configured; there is no fictional number. Database backups and audit access require operator policy.

Individual takes are keyed by guest in tab memory. Recording context includes guest identity, wording, pronunciation and event/wedding details; changes block export until re-recorded. Camera clips retain both video and audio; a separately captured audio track is used for reliable local composition. The original clip and branded invitation are both downloadable. Permission denial, guest switching, return to an existing take and stale-script gating were tested. No synthetic faces or automatic voice cloning are used.
