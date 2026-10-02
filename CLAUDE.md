# Aloft

Read `feature-plans/aloft/00-overview.md` before changing anything. Each phase file is a standalone handoff.

## Layer rules (ESLint enforces these)

- `src/domain/` is pure. It imports only other domain modules, `zod`, and `ts-fsrs`.
- `src/server/repositories/` is the only code that imports Drizzle or touches `src/server/db/`.
- `src/server/services/` orchestrate repositories and throw `AppError`. They never return HTTP responses.
- `src/app/` route handlers are thin: parse, authorise, call a service, shape the response.
- `src/game/` never imports `src/server/`.

## Non-negotiables

- Every payout is computed on the server. The client never sends timestamps.
- Focus time is the server clock from start to end, on screen or not, at most two hours a session (decision 58). The open timer's check-in only reads it.
- Uniqueness lives in the database (unique indexes), never in check-then-insert code.
- Balances update with `SET x = x + delta`, never read-modify-write.
- Env vars come from `@/lib/env`, never `process.env` in app code.

## AI card generation

- `src/server/llm/provider.ts` is the only LLM abstraction. Services call `getProviderForUser(userId)` and never construct a client themselves.
- The system prompt in `src/server/llm/prompts/card-generation.ts` is frozen and cached. Per-request text goes in the user turn.
- Every generated card passes `quoteAppearsInSource` before insert. Do not loosen it to fuzzy matching.
- `LLM_PROVIDER=local-cli` (in `.env.local`) uses the developer's own `claude` CLI. It is refused in production by both the env schema and the provider constructor.
- `LLM_PROVIDER=claude-code` runs the owner's subscription through the Agent SDK (the tracker app's approach). Production needs `ALLOW_CLAUDE_CODE_IN_PRODUCTION=true` and `CLAUDE_CODE_OAUTH_TOKEN`; the opt-in is deliberate, because a subscription serving other people is the owner's call. This path is not metered or quota-capped.
- BYOK keys are AES-256-GCM encrypted with `ENCRYPTION_KEY` and only ever returned masked.

## Testing

- `pnpm test` runs three Jest projects: `domain` (node), `server` (node, real Postgres via `pnpm db:up`), `ui` (jsdom).
- Do not mock the database in server tests.
- `pnpm test:unit` (domain + ui, no services), `pnpm test:integration` (server, real Postgres), `pnpm test:coverage` (enforces 90% branches on `src/domain`, 75% on `src/server/services`).
- `pnpm test:e2e` runs Playwright against the dev server with the seeded smoke session (`pnpm seed:smoke`): keyboard review, axe, offline, the full loop, notes to cards, and the anti-cheat probes.
- The only fake is `ScriptedProvider` in `src/server/llm/__fixtures__`; route tests mock `auth()` and nothing else. `LLM_PROVIDER=fake` is the dev and CI provider.
- `pnpm check:bundle` after `pnpm build` prints each route's first-load size and fails on dev surfaces in the output or an island GLB over 150 KB. There is no JS budget and no three.js restriction any more: the study tab draws the cat in three.js (decisions 52 and 54).

## Deploy

- Production is `studydash.workdash.site` on the shared VPS. Every push to `main` that passes the checks deploys there through `.github/workflows/ci.yml`. `deploy/README.md` has the manual steps.
- Secrets live only in `/root/studydash/.env.production` on the server. Never commit or print them.
- Email-and-password sign-in is the primary login until a Google OAuth client exists; `AUTH_GOOGLE_ID=placeholder` hides the Google button.

## Guardrails

- Every setting only narrows: the daily cap goes down, never above 8h. Reduced motion can be forced on, never off.
- Rate limits live in `src/server/services/rate-limit.ts` and apply per user. Add a bucket there before adding a costly endpoint.
- Dev-only UI goes in `src/game/dev/` and is imported only inside a literal `process.env.NODE_ENV !== 'production'` check.

@AGENTS.md

## Study cat care

- The cat's food and treats are derived, never paid out: bowls of kibble = lifetime credited focus / 25 min, treats = 2 per quiz at 75%+. The `pets` row only counts what was used (`bowls_fed`, `treats_given`), and spending is a conditional `UPDATE ... WHERE bowls_fed < earned`.
- Happiness decays in `src/domain/pet/happiness.ts` and the same formula runs in SQL in `src/server/repositories/pet.ts`. Change both together. The owner chose a cat that can reach sad and direct "time to study" nudges (decision 55).
- Push is Web Push without a library (`src/server/push/web-push.ts`, checked against the RFC 8291 test vector). Keys are `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (all or none); `deploy/add-vapid-keys.sh` adds them on the VPS. The in-app nudge clock replaces a cron.

## Focus sounds

- Background sound on the Focus tab is generated with Web Audio in `src/game/systems/focus-sound/`; there are no audio files. Rain, brown noise and piano are layers that mix, each with its own volume; the mix lives in the browser under `aloft:focus-mix`. Silence is the default (decision 57).
- Loop buffers must be a whole number of seconds long. Chromium wraps some fractional lengths onto the last few samples and buzzes.
- If a sound's character changes, re-check its loudness against the others by rendering offline. The levels in `voices.ts` and `piano-voice.ts` were set that way.
- Claims about sound and studying belong in `src/app/(app)/how-it-works/focus-sound-notes.tsx`, each checked against the study. None of the options is proven to help everyone, so don't say otherwise.

## Design context

`PRODUCT.md` holds who this is for and the design principles. `DESIGN.md` holds the visual system (tokens, type, components). Read both before touching any UI. North Star: "The Lantern Post", one warm light in a calm dark scene.

## Assets

- `pnpm assets:placeholders` writes procedural low-poly GLBs to `assets/raw/`. Real Tripo3D exports go in the same folder with the same ids and replace them.
- `pnpm assets:optimize` runs dedup, weld, prune, simplify, WebP textures, meshopt, then writes `public/models/*.glb` and regenerates `src/domain/assets/manifest.generated.ts`. It fails if any asset is over 150 KB or 5,000 triangles.
- `assets/asset-meta.json` is the hand-authored source for price, footprint, rarity, and triangle target. Add an entry before adding a model.
- `AssetId` is the manifest's key union. Never type an asset id as `string`.
- The study tab's character is a cat built in code from three.js primitives (`src/game/character/cat-*.ts`), with toon shading and an ink outline from `toon.ts`. There is no model file. Her reactions to touch, idle habits and naps live in `cat-brain.ts`; the room's milestone props share the same toon look (`room-*.tsx`).
