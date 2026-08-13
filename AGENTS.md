# AGENTS.md

## Cursor Cloud specific instructions

This repo contains two independently-runnable products. The update script already runs
`npm install` in the repo root, `netlify/functions/`, and `whatsapp-bot/`, so dependencies
(including Puppeteer's bundled Chrome under `~/.cache/puppeteer`) are already present when a
cloud agent starts. Do not re-document dependency installation here.

### 1. SimChat web app (repository root)

- Stack: TanStack Start + React 19 + Vite (via `vinxi`) + Tailwind. See `README.md` and `package.json` scripts.
- Dev server: `npm run dev` serves http://localhost:3000. Build: `npm run build`. Preview: `npm run serve`.
- No `lint` script exists. The closest lint/typecheck is `npx tsc --noEmit`; note it currently reports
  a couple of pre-existing `noUnusedLocals` errors (`src/routes/__root.tsx`, `src/routes/index.tsx`) that
  are unrelated to setup. `npm run build` uses esbuild and does not run these strict checks.
- Non-obvious AI caveat: the chat's "generate scenario" flow POSTs to
  `/.netlify/functions/genAIResponse-background`. That endpoint is only served under `netlify dev`
  (not plain `npm run dev`), and the function itself needs a valid `ANTHROPIC_API_KEY` **and** Convex
  (`CONVEX_URL` + `CONVEX_ADMIN_KEY`) because it writes the AI reply into Convex, which the frontend then
  reads back. Under plain `npm run dev` with no keys, the chat UI still works (conversations/messages use
  local TanStack Store state) but no AI reply returns.
- The scenario previewer at `/preview.html` is fully functional offline: it renders a clinical scenario
  passed in via `window.postMessage(scenarioJson, '*')` (or `window.name` set to the JSON for debugging).

### 2. WhatsApp bot (`whatsapp-bot/`)

- Stack: Express + Twilio + Anthropic + Convex + Puppeteer (server-side PDF). See `whatsapp-bot/README.md`.
- Run: `cd whatsapp-bot && npm run dev` (`node --watch src/index.js`).
- Non-obvious caveat: `PORT` defaults to `3000`, which collides with the web app. Set `PORT` (e.g. `3100`)
  in `whatsapp-bot/.env` when running both. The server plus its `/` and `/health` endpoints start without
  any credentials because Twilio/Convex clients are initialized lazily; actual webhook message handling
  (`POST /webhook/whatsapp`) requires Convex + Twilio + `ANTHROPIC_API_KEY` and will otherwise throw.
- Puppeteer launches with `args: ['--no-sandbox', '--disable-setuid-sandbox']` (already used in code).

### Convex (shared backend)

- Schema/functions live in `convex/`. Deploy with `npx convex dev` / `npx convex deploy`, which requires a
  Convex login/deploy key. Without a configured `VITE_CONVEX_URL`, the web app silently falls back to local
  in-memory state (see `src/convex.tsx` / `src/store/hooks.ts`).
