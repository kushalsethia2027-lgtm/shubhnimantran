# Homepage product walkthrough

The homepage has two different videos:

- **Hero:** original 19-second Aarav/Meera wedding invitation, with its recorded speech and native controls.
- **Product section:** original 42-second walkthrough of invitation creation and Guest & Travel Planner. Native controls plus chapter buttons jump to wedding details (0s), recording (7s), download (14s), families (21s), arrivals (28s), and logistics (35s). Captions are available through the native CC menu. The soundtrack is original, synthesized instrumental music; it is not cloned speech or licensed third-party music.

The walkthrough uses screenshots captured from the actual application while running isolated browser fixtures. It is explicitly labelled **sample data / guided tour**. It does not read the live database, expose guest records, claim to be a live dashboard, or simulate a production save for the viewer. Animated focus/cursor graphics explain the journey; the video is prerecorded. Use the adjacent links to open the real invitation creator and authenticated planner.

## Regenerate the video

Requires the existing Node/Playwright setup, Chromium, and ffmpeg with H.264/AAC support. No paid API, hosted credentials or uploaded family media is used. POSIX commands below are for the cloud build workspace.

1. Build and serve the ordinary static site on port 4173, without real Supabase variables. In another terminal, build the **test fixture only** and serve it on port 4174:

   ```bash
   VITE_SUPABASE_URL=https://planner-fixture.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_fixture npm run build:demo -- --outDir /tmp/nimantran-planner-browser
   npx vite preview --config vite.demo.config.ts --outDir /tmp/nimantran-planner-browser --host 127.0.0.1 --port 4174
   ```

2. Capture the relevant screens by running the existing functional browser checks. The optional capture flag uses a desktop viewport; normal tests retain their 390px viewport. Test microphone input is synthetic and the planner HTTP API is mocked in tests only.

   ```bash
   WALKTHROUGH_CAPTURE_DIR=/tmp/nimantran-tour-captures TEST_BASE_URL=http://127.0.0.1:4173 TEST_DEMO_PATH=/demo/ npm run test:demo
   WALKTHROUGH_CAPTURE_DIR=/tmp/nimantran-tour-captures npm run test:planner
   ```

3. Render the video and poster:

   ```bash
   node scripts/render-walkthrough.mjs
   ```

   The script reads only the six fixture screenshots under `/tmp/nimantran-tour-captures`, draws deterministic branded frames with a guided cursor and chapter progress, synthesizes its original stereo soundtrack, and encodes `src/assets/nimantran-walkthrough.mp4` and its JPEG poster. The six matching English cues are in `src/assets/nimantran-walkthrough.vtt`.

4. Rebuild the normal site (`npm run build:demo`) and run `npm run test:site`. Do not deploy the fixture build. Source fixtures/captures are not used to read any live guest records.

Browser checks verify the two videos have different URLs, the hero plays its 19-second sample, the walkthrough is 42 seconds, and chapter buttons seek and play the correct timestamps. `ffprobe` verifies H.264 video plus AAC audio in the exported walkthrough.
