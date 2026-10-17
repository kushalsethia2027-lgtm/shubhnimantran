# Nimantran submission: no login, no SMTP, no WhatsApp

## What to demonstrate now

Use **`/demo`**, not `/app`. The demo uses clearly labelled example data, real browser-local edits and approvals, and actual video encoding/download. It makes **no Supabase, Anthropic, ElevenLabs, Shotstack or Twilio requests**.

### On your Windows laptop

1. Download the newest `nimantran-mvp` branch ZIP from GitHub and extract it into a new folder. Your old `.env` can stay in the old folder; this demo needs no credentials.
2. Open the new folder containing `package.json`. Type `cmd` in File Explorer's address bar.
3. Stop any older development server with Ctrl+C. Run these commands separately:

```cmd
npm install
npm run dev -- --host 127.0.0.1 --port 3000 --strictPort
```

4. Keep the terminal open. Open **http://127.0.0.1:3000/demo** in current Chrome or Edge.

### A two-minute walkthrough

1. **Wedding:** show the editable Aarav–Meera example, dates and venues. If you change details, click **Save wedding & continue**. Changes invalidate old scripts and approvals.
2. **Guests:** show the three example relationship groups. Add/edit/delete a guest, or preview a CSV. Phone numbers are unnecessary because there is no messaging.
3. **Voice:** choose **Use example narration** for an immediate demonstration, or **Record my voice** / upload MP3, WAV, M4A or WebM. Preview it and check the permission box.
4. **Review scripts:** click **Create personalised scripts**. Review and approve Rajesh, Sunita and Rohan individually. Their scripts mention only their selected events. Editing wording or pronunciation reopens approval.
5. **Generate & download:** choose a recipient and a design. Click **Generate downloadable video**. Keep the tab visible for about 19 seconds with the example narration. Preview the actual output, then click **Download generated video**.

### Accurate presentation wording

> Nimantran's working submission flow creates an invitation video in the browser using approved personalised text and an actual recording. It works without sign-in, external services or WhatsApp. Example narration is labelled; voice cloning is not being simulated. Account-backed cloud features are a separate integration.

## Voice: what is and is not required

| Capability                                                | Required now                                                                                                                      | Status                                                             |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Own recorded voice in downloaded video                    | Chrome/Edge, microphone permission and explicit permission to use the audio                                                       | Implemented                                                        |
| Uploaded narration in video                               | Supported audio file under 15 MB and 65 seconds                                                                                   | Implemented                                                        |
| Ready-to-try example audio                                | Bundled 19-second Aarav–Meera narration                                                                                           | Implemented and labelled prerecorded                               |
| Personal guest names spoken in your own voice             | Record the selected guest's script yourself                                                                                       | Implemented through recording/upload                               |
| Automatically speak new names using a cloned family voice | ElevenLabs account/key, real speaker consent and provider verification, plus completion/acceptance of the secure backend pipeline | Not implemented/verified                                           |
| Local Hindi/Hinglish text                                 | Wedding facts, guest relation and selected events                                                                                 | Implemented with editable deterministic templates, not an AI claim |
| AI-written text                                           | Anthropic credentials and human review                                                                                            | Existing account adapter only; not used by this demo               |
| Video render/download                                     | Supported browser, permissioned audio and approved samples                                                                        | Implemented locally; no Shotstack required                         |
| WhatsApp                                                  | Nothing                                                                                                                           | Excluded from this submission path                                 |

**Audio is embedded unchanged.** Editing a name or script does not rewrite a recording. For spoken personalisation, read/record the selected guest's exact approved script. Pronunciation notes guide the speaker; they do not transform existing audio.

## If a public website URL is required

A self-contained static build is included as `submission/nimantran-demo-site.zip`.

1. Download that ZIP from the GitHub branch and extract it. Find the folder that contains `index.html` and `assets` directly.
2. Open https://app.netlify.com/drop and sign in to Netlify if requested (GitHub sign-in is an option).
3. Drag that folder onto Netlify Drop. **Do not upload the full source repository or `.env`.**
4. Netlify provides a public HTTPS address. Open it, run the walkthrough and include the address in your submission.

This deployment is a user action; no public URL has been published by the assistant. HTTPS enables microphone permission on that hosted site. No environment variables, database or backend are needed for this static demo.

To rebuild the static site from source:

```cmd
npm run build:demo
npm run preview:demo
```

The built files are in `dist-demo`. The preview address is printed by Vite (normally http://127.0.0.1:4173).

## Files and privacy

- Wedding/guest/script/approval metadata is saved in this browser's localStorage, not Supabase. Use example names when presenting on a shared computer.
- Audio and generated video live only in tab memory. Refreshing intentionally clears audio and video; saved scripts survive. Download before leaving the page.
- **Reset demo** clears the draft and in-memory media. Files already downloaded remain on your computer.
- Browser output is MP4 when the encoder supports it, otherwise WebM. Both preview in Chrome/Edge. MP4 is a container; the browser chooses codecs, so arbitrary desktop-player compatibility is not guaranteed.
- `submission/example-generated-invitation.mp4` is an actual browser-rendered example with bundled narration, transcoded to H.264/AAC for wider presentation compatibility. It is a sample, not a live guest delivery or cloned voice.
- Keep the rendering tab visible. Generation happens in real time and can be cancelled. Do not refresh during encoding.

## Verification

44 unit tests passed. The browser flow was tested with real scripts, local persistence, approval gating, real MediaRecorder encoding, download and 390px layout. Media inspection confirmed 540×960 video plus an audible audio track. The microphone path uses a synthetic test input in automated testing, not a real person's recording. No live provider or account-auth acceptance is claimed.
