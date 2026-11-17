# English Hunter System

A gamified English training app (IELTS + TOEFL, speaking & writing first) that runs entirely on your own Cloudflare account. No dependency on Claude to run.

## Stack
- **Cloudflare Workers** — serves the app (`public/`) and the API (`src/worker.js`)
- **D1** (`english-hunter`) — all progress, synced across devices
- **Workers AI** (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) — the AI examiner, capped at 30 casts/day (free tier)
- **Browser Web Speech API** — speech-to-text and text-to-speech, on device

## Core rules
- **XP measures effort. Ability stats change ONLY from real tests (Raids = EF SET).**
- Daily Quest: 90 min target, 20 min minimum protects the streak.
- Level curve: cumulative XP for level L = `50 × L × (L − 1)`. Rank: E (1) · D (10) · C (20) · B (30) · A (45) · S (60).
- v1 features are frozen. New ideas go to the v2 list below.

## Files
| File | Purpose |
|---|---|
| `src/worker.js` | API: auth (passphrase), state, events/XP, AI examiner, Error Bank, Phrase Bank, tests, side quests |
| `public/app.js` | The whole UI (vanilla JS, no build step) |
| `public/content.js` | Content bank: gates, prompts, drills, chapters, side quests, raids, targets — **edit this to add content** |
| `public/styles.css` | Visual theme |

## Deploy (one time)
1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository** → choose `englishcommand`.
2. Build settings: leave defaults (deploy command `npx wrangler deploy`). Bindings (D1, AI, assets) are read from `wrangler.jsonc`.
3. After the first deploy, open the `*.workers.dev` URL **immediately** and create your passphrase (the first visitor sets it).
4. Every push to `main` redeploys automatically.

## Local dev
```
npm install
npx wrangler dev --local   # AI examiner needs `npx wrangler dev --remote`
```

## v2 ideas (not in v1)
- (add here)
