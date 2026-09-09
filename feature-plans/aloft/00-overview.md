# Feature Plan: Aloft — 3D Study Game

> **Created:** 2026-07-25
> **Phases:** 9 (+ this overview)
> **Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind CSS v4, three.js + React Three Fiber v9, Drizzle ORM + Postgres (Neon in prod, `pg` driver, Docker locally), Auth.js v5, ts-fsrs, Jest + RTL + Playwright
> **Status:** All nine phases complete (2026-09-08). Unit, integration, route, component, scene, and end-to-end suites are in place with CI. Remaining: launch decisions (error reporting, analytics, model tiering).
> **Project root:** `/Users/marwinbong/projects/aloft`

---

## Codebase Context

**This is a greenfield project.** There is no existing code. Phase 1 creates the repository from scratch.

Conventions come from the user's global `~/.claude/CLAUDE.md` and are **binding**:

- TypeScript with `strict: true` — never plain JavaScript
- Functional components with **named exports** (no default exports for components)
- Arrow functions for callbacks; `function` declarations for top-level functions
- `async`/`await` — never `.then()` chains
- Early returns to reduce nesting
- **Files stay under ~200 lines** — split when one grows past that
- Path aliases (`@/`) over deep relative imports
- Prettier owns formatting — never hand-format. 2-space indent, single quotes, trailing commas
- Tailwind for all styling
- Jest + React Testing Library; test files named `*.test.ts` / `*.test.tsx`
- Prefer integration tests over unit tests for UI
- **Git: never add `Co-Authored-By: Claude` or any AI-authorship trailer to commits or PR descriptions**
- CLI preferences when shelling out: `rg` over grep, `fd` over find, `bat` over cat, `sd` over sed, `jq` for JSON, `gh` for GitHub

**Error recovery rule:** if a lint or build check fails twice on the same issue, stop and ask the user rather than continuing to attempt fixes.

---

## Feature Summary

Aloft turns studying into a game with a real reward loop. A student uploads their own lecture notes; Claude turns them into flashcards and quizzes. They start a focus session, and the app verifies they actually stayed on task using browser focus signals plus server-authoritative timing. Verified minutes pay out **Focus ⚡**, and correct recall on their own material pays out **Insight 💎**. Both are spent building a persistent 3D floating island that grows, lights up at their real local nighttime, and fills with wandering scholars.

The thing a user can do that they couldn't before: get an immediate, tangible, *earned* reward for studying — and watch it accumulate into a world that is visibly theirs.

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────┐
│ BROWSER                                                       │
│                                                               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐  │
│  │ /study       │   │ /review      │   │ /island          │  │
│  │ 2D, no 3D    │   │ 2D, no 3D    │   │ R3F canvas       │  │
│  │ (must work   │   │ FSRS cards   │   │ (lazy, ssr:false)│  │
│  │  standalone) │   │              │   │                  │  │
│  └──────┬───────┘   └──────┬───────┘   └────────┬─────────┘  │
│         │ heartbeat 15s    │                    │ Zustand     │
└─────────┼──────────────────┼────────────────────┼─────────────┘
          │                  │                    │
          ▼                  ▼                    ▼
┌───────────────────────────────────────────────────────────────┐
│ NEXT.JS SERVER — route handlers are THIN controllers          │
│                                                               │
│  server/services/   ← orchestration, throws AppError          │
│  server/repositories/ ← the ONLY code that touches Drizzle     │
│  server/llm/        ← LlmProvider interface, 3 impls          │
│                                                               │
│  domain/            ← PURE. economy · session · review · types │
│                       imports nothing from server/game/react   │
└───────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
   ┌─────────────┐              ┌──────────────────┐
   │ Neon        │              │ Anthropic API    │
   │ Postgres    │              │ (or local CLI    │
   │             │              │  in dev only)    │
   └─────────────┘              └──────────────────┘
```

**Dependency rule (enforce with ESLint `import/no-restricted-paths`):**
`app → server → domain` and `app → game → domain`. `domain` imports nothing. `game` never imports `server`.

---

## Decisions Log

| # | Decision | Choice | Rationale | Date |
|---|---|---|---|---|
| 1 | Platform | Web only, Next.js 15 + R3F | User choice. No OS-level enforcement available; substitute browser signals + server authority | 2026-07-25 |
| 2 | Core game loop | Idle world-builder + session-end loot | Mostly static props → Tripo3D fits without rigging burden. Sunk-investment retention | 2026-07-25 |
| 3 | Enforcement model | Layered soft (visibility + heartbeats + quiz gate) | Research: punishment mechanics drive off uncommitted users (Habitica vs Finch) | 2026-07-25 |
| 4 | Audience | Public product day one | User choice. Forces accounts, cloud DB, server-authoritative economy | 2026-07-25 |
| 5 | Currency design | Two currencies — Focus (time) and Insight (recall) | Makes real recall the only path to desirable items, without any punishment | 2026-07-25 |
| 6 | Reward schedule | Fixed base + variable-ratio bonus + pity timer | Fixed base builds habit; variable ratio resists extinction; pity prevents drought churn | 2026-07-25 |
| 7 | Physics engine | **None** | An idle builder needs raycast placement, not rigid-body sim. Large bundle + complexity saving | 2026-07-25 |
| 8 | Client state | Zustand (game) + TanStack Query (server) + URL params | Zustand is readable/writable outside React's render cycle — required for `useFrame` | 2026-07-25 |
| 9 | ORM | Drizzle + Neon Postgres | Typed SQL, no engine binary in serverless, hand-writable leaderboard queries | 2026-07-25 |
| 10 | Auth | Auth.js v5 + Google OAuth | Free, self-hosted, Drizzle adapter exists, students all have Google accounts | 2026-07-25 |
| 11 | Spaced repetition | `ts-fsrs` (FSRS-6) | ~20–30% fewer reviews than SM-2 for equal retention. Do not hand-roll | 2026-07-25 |
| 12 | LLM auth | Provider interface, 3 impls | Subscription auth is not permitted for third-party users — it is a dev-only path | 2026-07-25 |
| 13 | Economy authority | Server computes every payout | Web clients are fully inspectable. Client-side economy = free currency | 2026-07-25 |
| 14 | Study UI ↔ 3D coupling | **Zero** | `/study` and `/review` must be fully functional with the 3D canvas absent or failed | 2026-07-25 |
| 15 | Next.js major | **16**, not 15 | `create-next-app@latest` ships 16 and `next-auth@beta` supports it. Turbopack is the only bundler; `next dev` writes to `.next/dev` so dev and build can run together | 2026-09-06 |
| 16 | Postgres driver | `pg` via `drizzle-orm/node-postgres` | The Neon HTTP driver has no transactions, and the bootstrap must be one transaction. `pg` talks to Neon over TCP and to Docker locally with zero config. Swap lives in one file (`src/server/db/index.ts`) if cold starts ever matter | 2026-09-06 |
| 17 | Jest layout | Three projects: `domain`, `server`, `ui` | `server` runs migrations in a globalSetup against the Docker test DB. Splitting it out means `pnpm test:unit` never needs Postgres | 2026-09-06 |
| 18 | Phase 3 assets | Procedural placeholder GLBs | Six props generated by `scripts/generate-placeholder-assets.ts` in the low-poly palette so the pipeline, manifest, and island are real before any Tripo3D output exists. Same ids, drop-in replacement | 2026-09-08 |
| 19 | Texture format | WebP via sharp, not KTX2 | KTX2 needs the external `toktx` binary. Placeholders have no textures; revisit when textured Tripo3D assets land | 2026-09-08 |
| 20 | Image-based lighting | Hemisphere + directional, no drei `Environment` preset | Presets fetch an HDR from a third-party CDN at runtime. Offline Chromebooks and CSP say no. Phase 4 owns lighting anyway | 2026-09-08 |
| 21 | Manifest location | `src/domain/assets/manifest.generated.ts` | The server prices placements from it, and `server` must not import `game`. Pure data belongs in `domain` | 2026-09-08 |
| 22 | Ambient audio | Procedural WebAudio bed, no files | Wind is filtered noise, crickets and birds are oscillator envelopes, cross-faded by day factor. Zero KB, no autoplay fight. Per-prop positional emitters wait for assets that make sound | 2026-09-08 |
| 23 | Backdrop | Dark, palette-tinted dome | A bright blue sky inside a dark app read as a pasted window. The dome keeps the Lantern Post scene calm and lets the island lighting carry the time of day | 2026-09-08 |
| 24 | Won pieces | Rare and epic assets are won, never bought; a won copy places free once | Winning "the right to buy" something is a weak reward. Ownership is derived from opened caches, free placements from won minus placed, so no inventory table | 2026-09-08 |
| 25 | Level gating | Starter pieces carry `minLevel` in asset-meta | A level-up has to name something concrete. "Level 3, Scholar's cottage unlocked" is a reward; "Level 3" is a number | 2026-09-08 |
| 26 | LLM provider | One `LlmProvider` interface, three implementations | `AnthropicApiProvider` for the platform key, the same class with a decrypted user key for BYOK, and `LocalCliProvider` shelling out to `claude -p` for development. The CLI path throws at construction in production and the env schema refuses `LLM_PROVIDER=local-cli` there. | 2026-09-08 |
| 27 | Structured output | `messages.parse` + `zodOutputFormat` | One Zod schema (`cardBatchSchema`) is the contract for the API, the CLI fallback, and the tests. The system prompt is frozen with `cache_control` on its last block; per-chunk text goes in the user turn. | 2026-09-08 |
| 28 | Quote verification | Exact substring after normalisation | NFKC, straight quotes, ASCII dashes, collapsed whitespace, lowercase. No fuzzy matching: a card whose `sourceQuote` is not in its chunk is dropped and counted, never repaired. | 2026-09-08 |
| 29 | Quota and metering | Platform key only | BYOK bypasses the monthly cap but is still metered so the user sees spend. The local CLI is neither capped nor metered; its usage includes Claude Code's own system prompt and would swamp the numbers. | 2026-09-08 |
| 30 | Generation lifecycle | `after()` plus polling | The upload route answers with the source id; the client polls `/api/notes/[id]/status`. Progress is an in-memory map with a database fallback. `POST /api/notes/[id]/generate` retries only sections without cards. | 2026-09-08 |
| 31 | FSRS wrapper | `ts-fsrs` behind `scheduler.ts` only | `FsrsState` is the JSON-safe ts-fsrs card (ISO dates). `parseState` resets a corrupt or legacy blob instead of crashing the queue. `nowMs` is always a parameter. | 2026-09-08 |
| 32 | Quiz storage | None; rebuilt from the session id | Questions, distractors, and option order come from `selectQuizCards` and `shuffleWithSeed` seeded by the session id. Fetch, answer, and finish all recompute the same key; the client never receives it. | 2026-09-08 |
| 33 | Quiz grading | Per answer, server-side, first attempt wins | `POST /api/review/session-quiz/answer` writes one `card_reviews` row per card with the session id; a second answer for the same card is refused. That is what lets the multiplier climb live without trusting the client. | 2026-09-08 |
| 34 | Quiz single-write | `focus_sessions.quiz_submitted_at` | The plan guarded on `quiz_multiplier = 1.00`, but six of eight earns exactly 1.00, the same as never trying. A nullable timestamp is the marker; `claimQuizMultiplier` is a conditional update on it. | 2026-09-08 |
| 35 | Session links | Only quiz rows carry `session_id` | Normal reviews never link to a session, so a session's review rows are exactly its quiz attempts. Simpler than tagging rows. | 2026-09-08 |
| 36 | Device tier | Decided once at mount, in the canvas | `QualityProbe` measures two seconds of frames and reads the GPU string and core count; a poor frame rate outranks the spec sheet. Settings can force a tier; the override lives in localStorage. | 2026-09-08 |
| 37 | Reduced motion | OS setting plus an app override, enforced by CSS floor, lint, and tests | `aloft:motion=reduce` wins over the OS; the OS can only add reduction. A global CSS rule collapses every animation; `no-restricted-imports` blocks animation libraries and the raw post-fx spike outside the juice layer; each primitive has a no-op test. | 2026-09-08 |
| 38 | Rate limits | Postgres fixed windows, one row per user and bucket | One atomic upsert restarts or increments the window; `AppError` carries `retryAfterSeconds` and the route wrapper sets `Retry-After`. Redis would be more infrastructure than the problem needs. | 2026-09-08 |
| 39 | Dev surfaces | `src/game/dev`, loaded behind literal `NODE_ENV` checks | Time scrubber, stats overlay, and console handle import only inside `process.env.NODE_ENV !== 'production'`, so the bundler drops them. `pnpm check:bundle` greps the output to prove it and enforces the 300 KB study budget and the no-three.js rule. | 2026-09-08 |
| 40 | Onboarding | Inline steps on /study, completion in `users.onboarded_at` | Four steps derived from real data (zone, notes, session, placement), no overlay tour. Done steps strike through; the last one completing records the timestamp. | 2026-09-08 |
| 41 | Preferences only narrow | Daily cap, break reminder, motion, island quality, list view | Every setting reduces what the product does. The cap schema refuses anything above eight hours and the service clamps again. | 2026-09-08 |
| 42 | Test fakes | One `ScriptedProvider` fixture, one dev `FakeLlmProvider` | The fixture scripts outputs and errors and records every call so prompt shape is asserted. `LLM_PROVIDER=fake` makes sentence cards from the passage for development and CI, refused in production like the CLI. Nothing else is mocked except `auth()` in route tests. | 2026-09-08 |
| 43 | Coverage thresholds by layer | `src/domain` 90% branches, `src/server/services` 75%, nothing elsewhere | Directory-keyed thresholds in `jest.config.ts`; a global number would drive tests written to move a number. | 2026-09-08 |
| 44 | End-to-end auth | Seeded session cookie, never Google | `pnpm seed:smoke` inserts the smoke user and a 30-day session into the target database; Playwright adds the cookie. In CI the built app runs against the test database with the fake provider and `MIN_SESSION_MS_OVERRIDE=10000`. | 2026-09-08 |
| 45 | Island placement in e2e | Through the API, then verified in the list view | Canvas raycasting in a headless browser is not worth testing; persistence through the real HTTP stack is. | 2026-09-08 |
| 46 | Manual sign-in | Email and password that opens an Auth.js database session | Auth.js refuses Credentials with database sessions, so `/api/auth/register` and `/api/auth/login` verify a scrypt hash and insert the same `sessions` row Auth.js reads, setting the same cookie (`__Secure-` over https). Existing emails are refused outright so a password can never claim a Google account. Google shows only with real credentials. | 2026-09-08 |
| 47 | Deployment | Docker on the shared VPS, like gamedash | Standalone Next image, loopback port 3004, host nginx plus certbot, host Postgres via host-gateway. Boot runs a pg-only migrator that mirrors drizzle's journal because the standalone trace bundles drizzle-orm. | 2026-09-08 |
| 48 | PWA | Manifest route, hand-drawn lantern icons, small service worker | Network first for pages, cache first for hashed assets and models, `/offline` when the network is gone, never the API. An install button in settings uses `beforeinstallprompt`; iOS gets Share sheet instructions. | 2026-09-08 |
| 49 | Subscription provider | `claude-code` through the Agent SDK, opt-in in production | The owner wants the app to run on their Claude subscription rather than API credits, as their tracker app does. Hermetic single turn (no tools, no settings, thinking off), structured JSON through `outputFormat`. Production refuses it unless `ALLOW_CLAUDE_CODE_IN_PRODUCTION=true` and the token are both set, so the decision lives in the env file. Not metered. | 2026-09-08 |
| 50 | Study tab shape | Length, ring with rungs, live "so far" earnings, lantern indicator, an aim, today's lanterns | Client-side shape over the server-side meter: the server never sees the chosen length or the aim, and ending early pays what was earned. The rungs are derived from the economy constants (5 counts, 15 chest, 45 to 90 odds), not retyped. Reaching the length is a door (end and collect, or keep going), never a wall. Breaks with cards and the subject-linked quiz are the next passes. | 2026-09-08 |
| 51 | Career scene | A 2D layered SVG of her becoming a doctor on the study tab, driven by milestones from real work | Milestones come from focused hours, high grades (75 percent or better on a session quiz), and cards remembered, never from Focus spent, so the island stays the only shop. Rooms, wardrobe, wall items, and the car outside are switched by pure domain state from three server counts (`quiz_correct`/`quiz_total` were added to `focus_sessions` for the grade count). No three.js on /study and no rigging: she is a few shapes with a mood (studying, looking up, resting). New milestones are revealed on the session result by diffing progress captured at start against the refetch after the end. | 2026-09-08 |
| 52 | Character on the study tab | The owner's Meshy "Whisker Scholar" in three.js, between two vector layers of the room | The user chose the real model over pre-rendered frames and dropped the bundle rule to get it. The check now only reports sizes. The rig ships no seated clip, so the seated pose and the idle motion (breath, nod, writing hand) are procedural on the bones; the walking clip plays in place when the tab is away. The room stays SVG: back layer, transparent canvas, front layer with the desk over her lap, so milestones keep switching props. Wardrobe milestones became props (coat on a hook, scrubs on the shelf) because the texture is baked. 463 KB, cache-first in the service worker. | 2026-09-09 |

---

## Data Model

### `users` (Auth.js standard + additions)
- `id` — text, PK (Auth.js)
- `email` — text, unique, not null
- `name`, `image` — text, nullable
- `timezone` — text, not null, default `'UTC'` — **drives the in-game day/night cycle**
- `created_at` — timestamptz, not null, default now()

### `user_stats`
- `user_id` — text, PK, FK → `users.id` on delete cascade
- `focus_balance` — integer, not null, default 0 — **server-written only**
- `insight_balance` — integer, not null, default 0 — **server-written only**
- `xp` — integer, not null, default 0
- `level` — integer, not null, default 1
- `streak_days` — integer, not null, default 0
- `streak_freezes` — integer, not null, default 2
- `last_session_date` — date, nullable — for streak computation in the user's timezone
- `pity_counter` — integer, not null, default 0 — caches opened since last rare
- **Relationship:** one-to-one with `users`

### `focus_sessions`
- `id` — uuid, PK
- `user_id` — text, FK → `users.id`
- `started_at` — timestamptz, not null — **server clock, never client**
- `ended_at` — timestamptz, nullable
- `focused_ms` — integer, not null, default 0 — accumulated from validated heartbeats
- `credited_ms` — integer, not null, default 0 — after daily caps applied
- `loot_seed` — text, not null — generated server-side at start; client cannot reroll
- `status` — enum `('active','completed','abandoned')`, not null, default `'active'`
- `quiz_multiplier` — numeric(3,2), not null, default 1.00 — set by post-session quiz
- **Indexes:** `(user_id, started_at DESC)`; partial unique on `(user_id) WHERE status = 'active'` — one active session per user

### `session_heartbeats`
- `session_id` — uuid, FK → `focus_sessions.id` on delete cascade
- `seq` — integer, not null — monotonic per session
- `at` — timestamptz, not null — **server receipt time**
- `focused` — boolean, not null — was the tab visible + focused
- **Indexes:** unique `(session_id, seq)` — makes replay attacks a constraint violation
- Append-only. Never updated.

### `islands`
- `id` — uuid, PK
- `user_id` — text, FK → `users.id`, unique (one island per user for now)
- `theme` — text, not null, default `'meadow'`
- `tile_count` — integer, not null, default 9

### `placements`
- `id` — uuid, PK
- `island_id` — uuid, FK → `islands.id` on delete cascade
- `asset_id` — text, not null — must exist in the generated asset manifest
- `x`, `z` — integer, not null — grid coordinates
- `rot_y` — integer, not null, default 0 — quarter turns (0–3)
- `placed_at` — timestamptz, not null, default now()
- **Indexes:** unique `(island_id, x, z)` — one object per tile, enforced at DB level

### `caches`
- `id` — uuid, PK
- `user_id` — text, FK → `users.id`
- `session_id` — uuid, FK → `focus_sessions.id`, unique — one cache per session
- `rarity` — enum `('common','uncommon','rare','epic')`, not null
- `contents` — jsonb, not null — `{ assetIds: string[], focus: number, insight: number }`
- `opened_at` — timestamptz, nullable — null means unopened

### `note_sources`
- `id` — uuid, PK
- `user_id` — text, FK → `users.id`
- `kind` — enum `('paste','markdown','pdf','image')`, not null
- `title` — text, not null
- `content_hash` — text, not null — sha256 of normalized content
- `created_at` — timestamptz, not null, default now()
- **Indexes:** unique `(user_id, content_hash)` — prevents paying twice to process identical notes

### `note_chunks`
- `id` — uuid, PK
- `source_id` — uuid, FK → `note_sources.id` on delete cascade
- `ordinal` — integer, not null
- `text` — text, not null
- `token_count` — integer, not null
- **Indexes:** `(source_id, ordinal)`

### `cards`
- `id` — uuid, PK
- `user_id` — text, FK → `users.id`
- `chunk_id` — uuid, FK → `note_chunks.id` on delete cascade
- `question`, `answer` — text, not null
- `source_quote` — text, not null — **must appear verbatim in the parent chunk (hallucination guard)**
- `tags` — text[], not null, default `'{}'`
- `next_due_at` — timestamptz, not null
- `fsrs_state` — jsonb, not null — `{ difficulty, stability, retrievability, reps, lapses }`
- `suspended` — boolean, not null, default false
- **Indexes:** `(user_id, next_due_at)` — the review queue query

### `card_reviews`
- `id` — uuid, PK
- `card_id` — uuid, FK → `cards.id` on delete cascade
- `session_id` — uuid, FK → `focus_sessions.id`, nullable — links recall to a focus session
- `reviewed_at` — timestamptz, not null, default now()
- `rating` — smallint, not null — FSRS 1–4 (Again/Hard/Good/Easy)
- `elapsed_ms` — integer, not null
- **Indexes:** `(card_id, reviewed_at DESC)`

### `llm_usage`
- `user_id` — text, FK → `users.id`
- `month` — text, not null — `'YYYY-MM'`
- `input_tokens`, `output_tokens` — integer, not null, default 0
- `cost_cents` — integer, not null, default 0
- **Indexes:** PK `(user_id, month)`

---

## API Surface

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/api/session/start` | Open a focus session; returns `{ sessionId }`. Loot seed stays server-side | yes |
| POST | `/api/session/beat` | Heartbeat `{ sessionId, seq, focused }`. Validates cadence | yes |
| POST | `/api/session/end` | Close session, apply caps, award currency, roll cache — one transaction | yes |
| GET | `/api/session/active` | Recover an in-flight session after a refresh or crash | yes |
| GET | `/api/island` | Island + placements for the current user | yes |
| POST | `/api/island/place` | Place an asset; server debits currency and validates the tile | yes |
| DELETE | `/api/island/place/:id` | Remove a placement (partial refund) | yes |
| POST | `/api/cache/:id/open` | Reveal cache contents; server-authoritative | yes |
| POST | `/api/notes` | Create a note source (paste/markdown/pdf/image), enqueue processing | yes |
| GET | `/api/notes/:id/status` | Poll generation progress | yes |
| GET | `/api/review/queue` | Cards due now, FSRS-ordered | yes |
| POST | `/api/review/answer` | Submit `{ cardId, rating, elapsedMs }`; server reschedules via FSRS | yes |
| POST | `/api/review/session-quiz` | Post-session quiz result → sets `quiz_multiplier`, awards Insight | yes |
| GET | `/api/stats` | Balances, streak, level for the HUD | yes |

**Every route handler is a thin controller.** Parse + authorize + call a service + shape the response. No SQL, no business rules.

---

## State Management Strategy

| State | Category | Location | Source of truth | Persistence |
|---|---|---|---|---|
| Currency balances, XP, streak | Server data | TanStack Query | Postgres `user_stats` | DB; refetched on mutation |
| Active focus session | Server data + local timer | Zustand + `/api/session/active` | Postgres `focus_sessions` | DB; recoverable after refresh |
| Island placements | Server data | TanStack Query → hydrates Zustand | Postgres `placements` | DB |
| Camera position, hovered tile, build-mode | Ephemeral UI | Zustand (transient, no React subscribe) | Client only | None — resets on reload |
| Per-frame animation values | Ephemeral | **Refs mutated in `useFrame`** | Client only | None |
| Review queue position | Ephemeral UI | `useState` in the review page | Client only | None |
| Active tab / filters | URL state | `useSearchParams` | URL | Shareable, survives refresh |

**The rule that matters most:** anything read or written inside `useFrame` lives in a ref or a Zustand transient subscription — **never** React state. Setting React state at 60fps will destroy the frame budget.

---

## Testing Strategy

Defined here, executed in Phase 9. Each phase lists its own coverage requirements.

- **Domain layer (`src/domain/**`) — unit tests, Jest.** Pure functions: currency math, XP curve, loot rolls with a seeded RNG, session validation rules, FSRS wrapper. This is where the highest-value, cheapest tests live. Target near-full branch coverage.
- **API + services — integration tests against a real Postgres.** Use a disposable Neon branch or local Postgres in Docker. **Do not mock the database.** Bugs live in the boundary between service and repository — exactly where mocks paper over problems.
- **UI — React Testing Library, integration-style.** Test behavior from the user's perspective: "clicking Start shows a running timer." Never assert on internal state or CSS classes.
- **3D — `@react-three/test-renderer`, smoke level only.** Assert the scene graph contains the expected nodes and that placement math maps grid→world correctly. Do not attempt visual regression.
- **E2E — Playwright.** One test that covers the entire loop end to end, plus the three anti-cheat probes.

**Anti-cheat tests are non-negotiable and belong in the integration suite**, because they are the thing most likely to silently break during a refactor:
1. `POST /api/session/end` with zero heartbeats → awards zero
2. Replaying a stale `seq` → rejected (unique constraint)
3. A session whose heartbeat cadence implies fast-forwarding → credited time clamped

---

## Phase Index

| Phase | File | Focus | Key deliverables |
|---|---|---|---|
| 0 | `00-overview.md` | This document | Architecture, data model, decisions |
| 1 | `01-phase-foundation.md` | Foundation | Scaffold, Drizzle schema + migrations, Auth.js, `domain/` types, repositories, test config |
| 2 | `02-phase-focus-session-engine.md` | Session engine | Server-authoritative start/beat/end, visibility tracking, caps, currency award. **2D only** |
| 3 | `03-phase-3d-world-foundation.md` | 3D world | Asset pipeline + manifest, R3F canvas, island, camera, raycast placement, persistence |
| 4 | `04-phase-aliveness.md` | Aliveness | Day/night from real clock, wind shader, ambient scholars, particles, positional audio, camera drift |
| 5 | `05-phase-reward-juice.md` | Reward & juice | Loot tables, pity timer, chest sequence, hit-stop/shake/squash, streaks, XP |
| 6 | `06-phase-notes-ai.md` | Notes + AI | `LlmProvider` × 3, ingestion, chunking, card generation, sourceQuote guard, quotas |
| 7 | `07-phase-review-system.md` | Review | FSRS scheduling, review UI, quiz-gated multiplier — closes the loop |
| 8 | `08-phase-polish.md` | Polish | Error/loading/empty states, session recovery, perf budget, reduced-motion, a11y, 2D fallback |
| 9 | `09-phase-testing.md` | Testing | Full suite: domain units, API integration, E2E, anti-cheat probes |

**First playable: end of Phase 5.**

---

## Out of Scope

- Multiplayer, social study rooms, friend leaderboards — changes DB access patterns significantly; separate plan
- Native mobile app — the web build should be *usable* on mobile, but the island is desktop-first
- Real-money purchases of any kind — with a student/minor userbase this is a legal line, not a preference
- Combat / roguelite runs — deferred until the builder loop proves itself
- Rigged, animated creature companions — avoiding the rigging burden is the whole reason the builder loop was chosen
- Proctoring, webcam presence, device fingerprinting — see the anti-cheat posture in Phase 2

---

## Open Questions

- ✅ **Note formats**: paste, `.md`, `.txt`, `.pdf` (20 pages, text layer required), and up to 5 photos shipped in Phase 6. Notion, Google Docs, and YouTube transcripts are each a future ingestion adapter behind the same `Ingested` shape.
- ✅ **Art direction**: cozy low-poly, decided 2026-09-08 when the UI was anchored on the preview palette. Phase 3 ships procedural placeholder GLBs in the same palette; the Tripo3D library replaces them by dropping files into `assets/raw/` and running `pnpm assets:optimize`.
- 🟢 **Project name** — `aloft` is a placeholder appearing in every path.
- 🟢 **Package manager** — assumed `pnpm` throughout.
- 🟢 **Jest vs Vitest** — Jest per the user's CLAUDE.md, but three.js ships ESM and needs `transformIgnorePatterns` wrangling. If Phase 1 can't get it green in one session, switch to Vitest and keep RTL + Playwright unchanged.
