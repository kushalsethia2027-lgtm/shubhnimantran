# Enable Google sign-in

Google buttons replace the manual email/password/OTP forms in the Guest & Travel Planner and account-based invitation studio. The browser video creator also offers Google sign-in without removing its working no-sign-in path. Guest data remains protected by the existing RLS policies. The landing-page dashboard preview contains clearly labelled fictional examples and never fetches private records.

## One-time owner setup (required)

This cannot be enabled by code alone: the owner must configure their Google OAuth client in Supabase. No Google client secret belongs in Netlify frontend variables or Git.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select/create a project for authentication. Configure **Google Auth Platform → Branding / Audience / Data Access** (older UI: APIs & Services → OAuth consent screen). Use your app name and support email; request only the default email/profile/OpenID access. If the app is in Testing, add each reviewer/planner Google account to Test users. For general use, complete Google's publishing requirements.
2. Under **Clients / Credentials**, create an **OAuth client ID → Web application**.
3. Add the website origin `https://ni-man-tran.app` under Authorized JavaScript origins. Add this exact **Authorized redirect URI**:

   ```text
   https://ozvuruhglhyhuparvael.supabase.co/auth/v1/callback
   ```

   This URI goes to Supabase, not to the website's `/auth/` page. For another Supabase project, copy the callback URL shown in its Google provider settings.

4. Open [Supabase → Authentication → Providers](https://supabase.com/dashboard/project/ozvuruhglhyhuparvael/auth/providers). Enable **Google**, paste the Google Client ID and Client Secret there, and save. Do not paste them into chat, Git, or any `VITE_*` setting. No email SMTP configuration is needed for Google sign-in.
5. In **Supabase → Authentication → URL Configuration**, keep Site URL `https://ni-man-tran.app` and add this allowed redirect URL:

   ```text
   https://ni-man-tran.app/auth/
   ```

   If using other environments, also explicitly allow their callback URLs, for example `http://127.0.0.1:3000/auth/`, `http://127.0.0.1:4173/auth/`, and your exact Netlify preview hostname followed by `/auth/`. Existing `/planner/` URLs can remain for compatibility.

6. Keep the existing Netlify public settings `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Google credentials are stored only in Supabase. Deploy the latest source on branch `nimantran-mvp` with `npm run build:demo`, publishing `dist-demo`.
7. Test in a browser: click **Sign in with Google**, choose the intended account, approve consent, and return to Nimantran. Test both planner and video entry points. If Google says `redirect_uri_mismatch`, compare the Google redirect URI in step 3 character-for-character. If the provider is disabled, check step 4. If testing is restricted, add the account in step 1.

## Account and invitation behavior

- The official Supabase client uses PKCE and exchanges the authorization code on `/auth/`. The callback verifies the returned user with Supabase and accepts only fixed internal destinations (`/planner/`, `/demo/`, `/app`). Cancellation/errors show a retry path; no sign-in success is simulated.
- The authenticated browser session is shared between planner and video pages in the same tab. The original server-backed `/app` additionally exchanges a verified refresh token for HttpOnly cookies through a same-origin-only endpoint. This preserves the existing server API. That full server app still requires its original server configuration; the static Netlify deployment continues to use `/demo/` for video creation.
- Each planner must choose the Google account whose email exactly matches their private membership invitation. The pending invitation is held in tab sessionStorage while OAuth leaves the site and removed after acceptance/dismissal. Database expiry, single-use checks and verified email binding are unchanged. Planner records themselves are stored in Supabase, never localStorage.
- Existing accounts normally link through Supabase's verified-email identity handling. Verify access with your existing account before inviting a different email. A different Google email does not inherit an existing workspace role.
- Video recordings remain browser-tab-local. Google login does not upload them or make them cross-device. Signing in navigates away; the app warns if there are undownloaded recordings. Download before changing accounts or signing in mid-creation.
- Legacy Auth API endpoints remain for compatibility, but manual sign-in forms are no longer shown. Google sign-in does not change existing RLS roles or automatically invite other people.

## Checks and limits

Unit tests cover fixed destination routing and the server session bridge (cross-origin denial, invalid-token denial, server-verified cookies). `tests/google-browser.mjs` verifies provider parameters, PKCE exchange, returned-user verification, planner/video return destinations, pending invitation preservation and cancellation using a mocked HTTP fixture. No live Google account or OAuth client secret was available in the coding environment; hosted Google consent/login requires the setup and real-browser acceptance test above.
