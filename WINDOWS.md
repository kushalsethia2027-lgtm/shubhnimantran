# Open Nimantran on a Windows laptop

1. Install **Node.js 24 LTS** from https://nodejs.org/ with the default options.
2. On this GitHub branch, select **Code → Download ZIP**. Extract the ZIP using **Extract All**.
3. Open the extracted project folder. The correct folder contains `package.json`, `src` and `README.md`.
4. Click File Explorer's address bar, type `cmd`, and press Enter.
5. Run these commands separately in that Command Prompt:

```cmd
node --version
npm install
npm run dev -- --host 127.0.0.1 --port 3000 --strictPort
```

Keep Command Prompt open. Wait until Vite says it is ready, then open Chrome or Edge at:

```text
http://127.0.0.1:3000
```

The wedding studio is at:

```text
http://127.0.0.1:3000/app
```

Do not use the Bash installation script in Command Prompt. Do not open `localhost` before the development server starts. If startup fails, copy the terminal error, excluding keys/passwords. A browser connection-refused message alone cannot identify the startup problem.

If port 3000 is already in use, stop an older development server with Ctrl+C, or use `--port 3001` and open the corresponding browser address.

## Database features

The pages can be viewed without Supabase. Sign-in and persistence require the server variables and migrations documented in README.md. The project URL is prefilled for `ozvuruhglhyhuparvael.supabase.co`. Run this in the app's Command Prompt:

```cmd
npm run setup:supabase
```

Copy the **legacy anon key** and **legacy service_role key** from your Supabase project's **Settings → API Keys → Legacy API Keys**, and paste them into the corresponding hidden prompts. Pasted characters do not appear; press Enter after each. The command saves `.env` locally without displaying keys. It does not apply migrations or prove that credentials work.

Next, for a **new/empty Nimantran project**, copy the database setup SQL to your Windows clipboard:

```cmd
type supabase\setup.sql | clip
```

Open https://supabase.com/dashboard/project/ozvuruhglhyhuparvael/sql/new, paste with Ctrl+V, and click **Run**. This single transaction contains all three migrations. Use it **instead of** applying those files separately. Inspect existing tables before running it; do not drop existing data to fix a conflict. Stop at the first error and share only the error, never keys.

Before signing in, set the Supabase Auth **Site URL** to `http://127.0.0.1:3000`. In **Authentication → Email Templates**, include `<p>Your sign-in code: {{ .Token }}</p>` in both **Confirm signup** and **Magic Link** templates. Keep any required existing template content. Supabase test-email restrictions may require custom SMTP. Finally restart the development server.

Never commit `.env` or share its contents in chat.

This is an application foundation, not a completed launch: personalised media generation and WhatsApp delivery remain unavailable. Installing a ChatGPT Supabase plugin does not automatically supply credentials to an app running on your laptop. See docs/IMPLEMENTATION.md for the actual feature status.
