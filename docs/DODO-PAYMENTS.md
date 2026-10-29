# Historical wedding-software payment plan

> Archived on 29 October 2026. Nimantran is now a social-events marketplace. The prices and product instructions below apply to the retired wedding app. See [SOCIAL-EVENTS.md](SOCIAL-EVENTS.md) for the new product and marketplace payment requirements. No existing software-product approval establishes approval for event ticketing or host payouts.

## Approved prices

| Product                        | INR price | Purchase scope                              |
| ------------------------------ | --------: | ------------------------------------------- |
| Video Invitations — 50 guests  |       999 | One wedding, up to 50 individual guests     |
| Video Invitations — 150 guests |      2499 | One wedding, up to 150 individual guests    |
| Video Invitations — 400 guests |      5499 | One wedding, up to 400 individual guests    |
| Guest & Travel Planner         |      1999 | One wedding workspace, purchased separately |

The founder supplied prices and guest limits on 27 October 2026. Per-wedding, one-time billing is an implementation assumption to confirm before launch. No automatic subscription or combined bundle is requested. Tax-inclusive versus tax-exclusive presentation, refund terms, access duration, upgrades and multiple purchases still need decisions before accepting payment. Do not imply lifetime support or automatic voice personalisation.

## Current state

The public homepage presents the three video packages and separate planner price. Checkout remains disabled; current access remains unchanged. There is no verified payment ledger, webhook processing or paid entitlement enforcement. No Dodo credentials or products were accessible in this environment. Do not advertise this change as a functioning payment gateway.

## Dashboard preparation

1. Complete Dodo merchant onboarding and confirm live selling eligibility, supported INR pricing and payment methods in the account.
2. In test mode, create four separate one-time products using the names and amounts above. Quantity is one wedding package, not a per-guest price. Do not create recurring subscriptions.
3. Retain the four product IDs. These identifiers can be supplied for implementation; API keys and webhook secrets must be entered through deployment secret settings, never chat or git.
4. Create separate live products after testing. Test and live product IDs and credentials must never be mixed.
5. The Shipped revenue connector uses its own read-only key. It does not create a checkout or unlock app access. It must not be reused as the application's write-capable server credential.

## Required implementation before collecting money

The deployed site is a static Vite build on Netlify. A secure checkout needs server-side endpoints (for example Netlify Functions), not a secret in VITE_* variables.

- Authenticate the purchaser with the existing Supabase session and check wedding ownership/membership server-side. Only sell against an identified wedding/workspace; support initial-workspace creation explicitly.
- Resolve the selected plan to an allowlisted server-side Dodo product ID. Ignore amounts, limits, user IDs and entitlements supplied by the browser.
- Create the hosted checkout server-side with authenticated purchase association. Use the current official Dodo API/SDK, fixed allowed return URLs and idempotency where supported.
- Verify webhook signatures against the raw request body and reject unsigned or altered events. Match provider payment, environment, product, currency, amount and recorded purchase before granting access. Persist event IDs and handle duplicates, retries and out-of-order events.
- Persist payment records and one-wedding entitlements using additive migrations and RLS. Only trusted backend processing may grant/update entitlements. Never grant access based on return URL or a browser “success” message.
- Enforce 50/150/400 guest caps and planner access at protected backend operations. Current browser-only video downloads cannot provide a secure paid rendering gate; paid video production needs a defined enforceable delivery model before checkout launch.
- Define refund/dispute entitlement treatment, expose a verified payment status, and handle cancelled, failed and pending payments honestly.
- Test sandbox success, cancellation, wrong account/wedding, manipulated price/plan, invalid signature, duplicate events, retries, refund/dispute and production configuration. Keep existing invitation recording and planner flows covered.

No migration or secret variable was added speculatively. Define exact API versions, webhook event types and deployment configuration when implementing the provider integration from current official documentation.
