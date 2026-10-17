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

The pages can be viewed without Supabase. Sign-in and persistence require the server variables and migrations documented in README.md. Copy `.env.example` to `.env` only if you are ready to configure the connection. Never commit `.env` or share its contents in chat.

This is an application foundation, not a completed launch: personalised media generation and WhatsApp delivery remain unavailable. Installing a ChatGPT Supabase plugin does not automatically supply credentials to an app running on your laptop. See docs/IMPLEMENTATION.md for the actual feature status.
