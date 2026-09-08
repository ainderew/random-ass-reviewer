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
- Uniqueness lives in the database (unique indexes), never in check-then-insert code.
- Balances update with `SET x = x + delta`, never read-modify-write.
- Env vars come from `@/lib/env`, never `process.env` in app code.

## AI card generation

- `src/server/llm/provider.ts` is the only LLM abstraction. Services call `getProviderForUser(userId)` and never construct a client themselves.
- The system prompt in `src/server/llm/prompts/card-generation.ts` is frozen and cached. Per-request text goes in the user turn.
- Every generated card passes `quoteAppearsInSource` before insert. Do not loosen it to fuzzy matching.
- `LLM_PROVIDER=local-cli` (in `.env.local`) uses the developer's own `claude` CLI. It is refused in production by both the env schema and the provider constructor.
- BYOK keys are AES-256-GCM encrypted with `ENCRYPTION_KEY` and only ever returned masked.

## Testing

- `pnpm test` runs three Jest projects: `domain` (node), `server` (node, real Postgres via `pnpm db:up`), `ui` (jsdom).
- Do not mock the database in server tests.
- `pnpm test:unit` (domain + ui, no services), `pnpm test:integration` (server, real Postgres), `pnpm test:coverage` (enforces 90% branches on `src/domain`, 75% on `src/server/services`).
- `pnpm test:e2e` runs Playwright against the dev server with the seeded smoke session (`pnpm seed:smoke`): keyboard review, axe, offline, the full loop, notes to cards, and the anti-cheat probes.
- The only fake is `ScriptedProvider` in `src/server/llm/__fixtures__`; route tests mock `auth()` and nothing else. `LLM_PROVIDER=fake` is the dev and CI provider.
- `pnpm check:bundle` after `pnpm build` enforces the budget: `/study` under 300 KB gzip, no three.js outside `/island`, no dev surfaces, GLBs under 150 KB.

## Deploy

- Production is `studydash.workdash.site` on the shared VPS. Every push to `main` that passes the checks deploys there through `.github/workflows/ci.yml`. `deploy/README.md` has the manual steps.
- Secrets live only in `/root/studydash/.env.production` on the server. Never commit or print them.
- Email-and-password sign-in is the primary login until a Google OAuth client exists; `AUTH_GOOGLE_ID=placeholder` hides the Google button.

## Guardrails

- Every setting only narrows: the daily cap goes down, never above 8h. Reduced motion can be forced on, never off.
- Rate limits live in `src/server/services/rate-limit.ts` and apply per user. Add a bucket there before adding a costly endpoint.
- Dev-only UI goes in `src/game/dev/` and is imported only inside a literal `process.env.NODE_ENV !== 'production'` check.

@AGENTS.md

## Design context

`PRODUCT.md` holds who this is for and the design principles. `DESIGN.md` holds the visual system (tokens, type, components). Read both before touching any UI. North Star: "The Lantern Post", one warm light in a calm dark scene.

## Assets

- `pnpm assets:placeholders` writes procedural low-poly GLBs to `assets/raw/`. Real Tripo3D exports go in the same folder with the same ids and replace them.
- `pnpm assets:optimize` runs dedup, weld, prune, simplify, WebP textures, meshopt, then writes `public/models/*.glb` and regenerates `src/domain/assets/manifest.generated.ts`. It fails if any asset is over 150 KB or 5,000 triangles.
- `assets/asset-meta.json` is the hand-authored source for price, footprint, rarity, and triangle target. Add an entry before adding a model.
- `AssetId` is the manifest's key union. Never type an asset id as `string`.
