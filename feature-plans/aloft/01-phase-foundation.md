# Phase 1: Foundation

> **Feature:** Aloft — 3D Study Game
> **Phase:** 1 of 9
> **Depends on:** None
> **Estimated scope:** Large (3–5 hours)

## Context from Previous Phase

This is the first phase. No prior context.

**What Aloft is:** a web app that turns studying into a game. Students upload their own lecture notes; Claude generates flashcards from them. Students run verified focus sessions; verified minutes pay out **Focus ⚡** currency and correct recall pays out **Insight 💎**. Both are spent building a persistent 3D floating island.

**The project does not exist yet.** `/Users/marwinbong/projects/aloft` currently contains only `feature-plans/`. This phase creates the entire repository.

## Existing Codebase Context

None — greenfield. However, these conventions from `~/.claude/CLAUDE.md` are **binding** and must be honored from the first file:

- TypeScript `strict: true`, never plain JS
- Functional components with **named exports** (`export const Foo = () => {}`), not default exports
- Arrow functions for callbacks, `function` declarations for top-level functions
- `async`/`await`, never `.then()` chains
- Early returns over nested conditionals
- **Split any file that exceeds ~200 lines**
- Path alias `@/` instead of deep relative imports
- Prettier owns formatting: 2-space indent, single quotes, trailing commas
- Tailwind for all styling
- Jest + React Testing Library, tests named `*.test.ts` / `*.test.tsx`
- **Never add `Co-Authored-By: Claude` or any AI-authorship trailer to commits**

## Objective

Create the repository skeleton, database schema, authentication, and the pure domain layer — everything Phases 2–9 build on. This phase is sequenced first because every later phase imports from `src/domain/` and `src/server/repositories/`, and getting the layer boundaries wrong here is expensive to unwind later.

**Nothing user-facing ships in this phase beyond a sign-in page.** That is intentional.

## Architecture Decisions

### Decision: Drizzle ORM over Prisma
- **Choice:** Drizzle + Neon serverless Postgres
- **Alternatives considered:** Prisma, Kysely, raw `pg`
- **Rationale:** No engine binary to ship into a serverless function (faster cold starts), typed SQL that stays legible for the hand-written leaderboard and streak queries this app will need, and a first-class Auth.js adapter. Dependency Inversion is preserved either way because nothing outside `src/server/repositories/` ever imports Drizzle.
- **Tradeoff:** Prisma's migration tooling and Studio are more polished. Drizzle Kit is adequate but rougher.

### Decision: Repository layer is the *only* code that touches Drizzle
- **Choice:** All data access goes through `src/server/repositories/*.ts`. Services call repositories. Route handlers call services.
- **Alternatives considered:** Calling Drizzle directly from route handlers or Server Components
- **Rationale:** Dependency Inversion Principle. Phase 9 tests services against a real test database; Phase 8 may add caching. Neither is possible if query code is scattered across route handlers.
- **Tradeoff:** One extra layer of indirection for trivial reads.

### Decision: `src/domain/` is pure and imports nothing
- **Choice:** No imports from `src/server/`, `src/game/`, React, three.js, or Drizzle. Only other `domain` modules and small pure libraries (`zod`, `ts-fsrs`).
- **Alternatives considered:** Letting domain types import Drizzle's `InferSelectModel`
- **Rationale:** The economy math, session validation, and FSRS wrapper are the highest-value things to unit test. Purity makes them testable with zero setup — no DB, no DOM, no GPU.
- **Tradeoff:** Domain types are hand-written rather than inferred from the schema, so schema and types must be kept in sync manually. Phase 9 adds a test that asserts they match.

### Decision: Zod schemas defined once in `domain/types/`, used on both client and server
- **Choice:** Every API request/response body has a Zod schema in `src/domain/types/`. Route handlers parse with it; client forms validate with it.
- **Rationale:** Consistency (ACID) — validation rules cannot drift between layers. Also gives free TypeScript types via `z.infer`.
- **Tradeoff:** None meaningful.

### Decision: Enforce layer boundaries with ESLint, not discipline
- **Choice:** `eslint-plugin-import` with `import/no-restricted-paths` zones
- **Rationale:** The `app → server → domain` / `game ↛ server` rule is the single thing most likely to erode across nine phases. A lint rule catches it in CI; a convention in a doc does not.

---

## Implementation Steps

### Step 1: Scaffold the Next.js app

**What:** Create the Next.js 15 project with TypeScript, Tailwind, and ESLint.

**File(s):** project root `/Users/marwinbong/projects/aloft`

**Details:**

Run from the parent directory. The `feature-plans/` directory already exists in the target — scaffold into the existing directory rather than a new one.

```bash
cd /Users/marwinbong/projects/aloft && pnpm dlx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

Then set `"strict": true` and `"noUncheckedIndexedAccess": true` in `tsconfig.json`. The second one is not default and it catches a whole class of array-indexing bugs that will otherwise appear in the grid/placement code in Phase 3.

Add to `package.json` scripts:
```json
{
  "typecheck": "tsc --noEmit",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:e2e": "playwright test"
}
```

> **ANTI-PATTERN: Default exports for components**
> ❌ Don't: `export default function Button() {}`
> ✅ Instead: `export const Button = () => {}` — except for Next.js `page.tsx`, `layout.tsx`, `error.tsx`, and `loading.tsx`, which the framework *requires* to be default exports.
> 💡 Why: Named exports make refactors safer, autocomplete better, and enforce consistent naming across the codebase. The framework files are the only exception.

---

### Step 2: Install dependencies

**What:** Add every runtime and dev dependency the nine phases need, so later phases don't each stop to install things.

**File(s):** `package.json`

**Details:**

```bash
pnpm add drizzle-orm @neondatabase/serverless zod next-auth@beta @auth/drizzle-adapter @tanstack/react-query zustand ts-fsrs date-fns
pnpm add -D drizzle-kit @types/pg tsx dotenv-cli
```

Do **not** install three.js, `@react-three/*`, or the Anthropic SDK yet — those belong to Phases 3 and 6. Keeping the dependency tree honest per phase makes bundle regressions attributable.

Testing dependencies:
```bash
pnpm add -D jest @types/jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest @playwright/test
```

---

### Step 3: Create the directory structure

**What:** Establish the four-layer structure up front so later phases have an obvious home for every file.

**File(s):** directories under `src/`

**Details:**

```
src/
├── app/
│   ├── (marketing)/page.tsx        # public landing
│   ├── (app)/                      # authed shell — layout.tsx guards
│   │   ├── layout.tsx
│   │   ├── study/page.tsx
│   │   ├── island/page.tsx
│   │   ├── notes/page.tsx
│   │   └── review/page.tsx
│   ├── api/
│   │   └── auth/[...nextauth]/route.ts
│   ├── layout.tsx
│   └── globals.css
├── domain/
│   ├── economy/
│   ├── session/
│   ├── review/
│   └── types/
├── server/
│   ├── db/
│   ├── repositories/
│   ├── services/
│   └── llm/
├── game/                           # empty until Phase 3
├── components/
│   └── ui/
└── lib/                            # small cross-cutting utils only
```

Add a `.gitkeep` to `src/game/` so the boundary exists from day one.

---

### Step 4: Define the Drizzle schema

**What:** Create the full database schema for all nine phases in one pass.

**File(s):**
- `src/server/db/schema.ts` (will exceed 200 lines — **split it**)
- `src/server/db/schema/auth.ts` — Auth.js tables (`users`, `accounts`, `sessions`, `verificationTokens`)
- `src/server/db/schema/game.ts` — `userStats`, `islands`, `placements`, `caches`
- `src/server/db/schema/sessions.ts` — `focusSessions`, `sessionHeartbeats`
- `src/server/db/schema/study.ts` — `noteSources`, `noteChunks`, `cards`, `cardReviews`
- `src/server/db/schema/usage.ts` — `llmUsage`
- `src/server/db/schema/index.ts` — re-exports everything

**Details:**

Full column definitions are in `00-overview.md` under **Data Model**. Read that section — it is the authoritative spec, including every index.

Three constraints carry real load-bearing weight and must not be skipped:

1. `focusSessions` — **partial unique index on `(user_id) WHERE status = 'active'`**. Guarantees one active session per user at the database level. Drizzle:
   ```ts
   activeSessionUniq: uniqueIndex('focus_sessions_one_active')
     .on(table.userId)
     .where(sql`${table.status} = 'active'`),
   ```
2. `sessionHeartbeats` — **unique `(session_id, seq)`**. This is what turns a heartbeat replay attack into a constraint violation instead of free currency.
3. `placements` — **unique `(island_id, x, z)`**. One object per tile, enforced by the DB rather than by application logic that a race condition can defeat.

Create `src/server/db/index.ts` exporting a configured Drizzle client:
```ts
export const db = drizzle(neon(process.env.DATABASE_URL!), { schema });
```

> **ANTI-PATTERN: Application-only uniqueness**
> ❌ Don't: check `SELECT ... WHERE x = ? AND z = ?` then insert if empty.
> ✅ Instead: add the unique index and catch the constraint violation.
> 💡 Why: the check-then-insert pattern has a race window. Two rapid clicks place two objects on one tile. The database constraint has no race window.

---

### Step 5: Environment variable validation

**What:** Fail fast and loudly on missing config, at boot, not at first request.

**File(s):** `src/lib/env.ts`, `.env.example`

**Details:**

```ts
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-').optional(),
  LLM_PROVIDER: z.enum(['anthropic-api', 'byok', 'local-cli']).default('anthropic-api'),
  NODE_ENV: z.enum(['development', 'test', 'production']),
});

export const env = envSchema.parse(process.env);
```

Commit `.env.example` with every key and no values. Never commit `.env.local`.

> **ANTI-PATTERN: `process.env.FOO!` scattered through the codebase**
> ❌ Don't: reach into `process.env` from services and route handlers.
> ✅ Instead: import `env` from `@/lib/env`. One validated object, one source of truth.
> 💡 Why: a missing env var should crash at startup with a precise message, not produce `undefined` deep inside a request three days later.

---

### Step 6: Auth.js v5 setup

**What:** Google OAuth sign-in with the Drizzle adapter and a session-guarded app shell.

**File(s):**
- `src/server/auth.ts` — NextAuth config, exports `{ auth, handlers, signIn, signOut }`
- `src/app/api/auth/[...nextauth]/route.ts` — `export const { GET, POST } = handlers`
- `src/app/(app)/layout.tsx` — server-side guard
- `src/app/(marketing)/page.tsx` — landing with a sign-in button

**Details:**

In `src/server/auth.ts`, use the Drizzle adapter and add a `session` callback that puts `user.id` on the session object — every service needs it.

On first sign-in (the `events.createUser` hook), create the user's starting rows in **one transaction**:
- `user_stats` row with default balances
- `islands` row with `theme: 'meadow'`, `tile_count: 9`

Atomicity matters here: a user with an account but no island crashes Phase 3.

The `(app)/layout.tsx` guard:
```ts
const session = await auth();
if (!session?.user?.id) redirect('/');
```

> **ANTI-PATTERN: Client-side auth guards**
> ❌ Don't: `useSession()` in a client component and conditionally render.
> ✅ Instead: check `await auth()` in the Server Component layout and `redirect()`.
> 💡 Why: a client-side guard ships the protected content to the browser and merely hides it. It is not a security boundary.

---

### Step 7: Domain types and Zod schemas

**What:** The pure type layer every other layer depends on.

**File(s):**
- `src/domain/types/user.ts` — `UserStats`, `Currency`
- `src/domain/types/session.ts` — `FocusSession`, `SessionStatus`, `Heartbeat`, plus Zod schemas `StartSessionRequest`, `HeartbeatRequest`, `EndSessionRequest`
- `src/domain/types/island.ts` — `Island`, `Placement`, `GridCoord`
- `src/domain/types/cache.ts` — `Cache`, `Rarity`, `CacheContents`
- `src/domain/types/study.ts` — `NoteSource`, `NoteChunk`, `Card`, `CardReview`, `Rating`
- `src/domain/types/index.ts` — barrel re-export

**Details:**

Define request/response shapes as Zod schemas and derive the TypeScript types:
```ts
export const heartbeatRequestSchema = z.object({
  sessionId: z.string().uuid(),
  seq: z.number().int().nonnegative(),
  focused: z.boolean(),
});
export type HeartbeatRequest = z.infer<typeof heartbeatRequestSchema>;
```

Note what is **absent** from `HeartbeatRequest`: any timestamp. The client never sends time. The server stamps it. This is deliberate and Phase 2 depends on it.

> **ANTI-PATTERN: Passing whole entities where a slice will do**
> ❌ Don't: `function awardCurrency(user: User, session: FocusSession)`.
> ✅ Instead: `function awardCurrency(input: { creditedMs: number; multiplier: number }): CurrencyAward`.
> 💡 Why: Interface Segregation. Narrow inputs make domain functions trivially unit-testable — no fixtures, no mocks.

---

### Step 8: Economy domain module

**What:** Pure functions for currency, XP, and levels. No I/O.

**File(s):**
- `src/domain/economy/currency.ts`
- `src/domain/economy/xp.ts`
- `src/domain/economy/constants.ts`

**Details:**

```ts
// constants.ts
export const FOCUS_PER_MINUTE = 10;
export const DAILY_CREDITABLE_MS = 8 * 60 * 60 * 1000;   // 8h guardrail
export const MIN_SESSION_MS = 5 * 60 * 1000;             // sessions under 5min pay nothing
export const BREAK_PROMPT_MS = 50 * 60 * 1000;           // 50min

// currency.ts
export function calculateFocusAward(input: {
  creditedMs: number;
  multiplier: number;
}): number;

export function applyDailyCap(input: {
  focusedMs: number;
  alreadyCreditedTodayMs: number;
}): number;   // returns creditable ms, never negative
```

`xp.ts` implements the level curve. Use a shallow curve — `xpForLevel(n) = 100 * n^1.5` — so early levels arrive fast. Early-level velocity is the strongest onboarding retention lever available.

> **ANTI-PATTERN: Business rules living in route handlers**
> ❌ Don't: compute `Math.floor(ms / 60000) * 10` inline in `/api/session/end`.
> ✅ Instead: call `calculateFocusAward()` from the domain layer.
> 💡 Why: the payout formula will be tuned repeatedly. Tuning a pure function with tests around it is safe; tuning arithmetic scattered across route handlers is not.

---

### Step 9: Repository layer

**What:** The only code in the project permitted to import Drizzle.

**File(s):**
- `src/server/repositories/user-stats.ts`
- `src/server/repositories/focus-session.ts`
- `src/server/repositories/island.ts`
- `src/server/repositories/card.ts`
- `src/server/repositories/note.ts`

**Details:**

Each exports plain async functions taking a `db` (or transaction) handle first, so services can compose them inside one transaction:

```ts
export async function getActiveSession(
  tx: DbOrTx,
  userId: string,
): Promise<FocusSession | null>;

export async function incrementBalances(
  tx: DbOrTx,
  userId: string,
  delta: { focus?: number; insight?: number; xp?: number },
): Promise<UserStats>;
```

Every repository function returns **domain types**, not Drizzle row types. Map at the boundary. That mapping is what makes the domain layer independent of the ORM.

> **ANTI-PATTERN: Unbounded list queries**
> ❌ Don't: `db.select().from(placements)` with no limit.
> ✅ Instead: every list function takes `{ limit, offset }` with a sane default and a hard max.
> 💡 Why: one power user with 5,000 placements will otherwise OOM a serverless function.

> **ANTI-PATTERN: Read-modify-write on balances**
> ❌ Don't: read `focus_balance`, add in JS, write it back.
> ✅ Instead: `SET focus_balance = focus_balance + $1` in SQL.
> 💡 Why: read-modify-write loses concurrent updates. Two overlapping requests and one award vanishes.

---

### Step 10: Typed error handling

**What:** A shared error type services throw and route handlers translate.

**File(s):** `src/server/errors.ts`, `src/lib/api-response.ts`

**Details:**

```ts
export class AppError extends Error {
  constructor(
    public code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'INVALID_STATE'
      | 'INSUFFICIENT_FUNDS' | 'RATE_LIMITED' | 'VALIDATION',
    message: string,
    public status: number,
  ) { super(message); }
}
```

`src/lib/api-response.ts` exports a `handleRoute()` wrapper that catches `AppError` → shaped JSON, and anything else → logged 500 with a generic message (never leak internals to the client).

> **ANTI-PATTERN: `res.json()` from a service**
> ❌ Don't: return HTTP responses from `src/server/services/`.
> ✅ Instead: services throw `AppError`; the route wrapper maps it to a response.
> 💡 Why: services must stay transport-agnostic so Phase 9 can test them without HTTP.

---

### Step 11: ESLint layer-boundary rules

**What:** Make the dependency rule mechanically enforced.

**File(s):** `eslint.config.mjs`

**Details:**

Add `import/no-restricted-paths` zones:
- `src/domain/**` may not import from `src/server/**`, `src/game/**`, `src/app/**`, or `src/components/**`
- `src/game/**` may not import from `src/server/**`
- `src/app/**` may not import from `src/server/db/**` (must go through repositories/services)

> **ANTI-PATTERN: Documenting a rule instead of enforcing it**
> ❌ Don't: write "don't import server from game" in a README and hope.
> ✅ Instead: make it a lint error.
> 💡 Why: across nine phases and many sessions, this specific boundary is the one that erodes. Lint has no memory problems.

---

### Step 12: Test configuration

**What:** Get Jest running green, including the three.js ESM situation that Phase 3 will trip over.

**File(s):** `jest.config.ts`, `jest.setup.ts`, `playwright.config.ts`

**Details:**

Use `next/jest` for the base config. Add, in anticipation of Phase 3:

```ts
transformIgnorePatterns: [
  '/node_modules/(?!(three|@react-three|@monogrid|troika-three-text|troika-three-utils|troika-worker-utils|its-fine|meshoptimizer)/)',
],
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
  '\\.(glsl|vs|fs|vert|frag)$': '<rootDir>/__mocks__/shader.ts',
},
```

Two projects in one config: a `node` environment for `src/domain/**` and `src/server/**`, and `jsdom` for `src/app/**` and `src/components/**`. Domain tests should not pay the jsdom startup cost.

Write one smoke test per layer to prove the config works:
- `src/domain/economy/currency.test.ts` — a real assertion on `calculateFocusAward`
- `src/components/ui/button.test.tsx` — renders and responds to a click

> **⚠️ Escape hatch.** If Jest + three.js ESM resists after two serious attempts, **stop and switch to Vitest.** It handles ESM natively and RTL/Playwright are unaffected. Per the user's error-recovery rule, do not burn a third attempt — surface the decision.

---

### Step 13: Landing page and authed shell

**What:** The minimum UI to prove auth works end to end.

**File(s):**
- `src/app/(marketing)/page.tsx` — headline + "Continue with Google"
- `src/app/(app)/layout.tsx` — guard + nav (Study / Notes / Review / Island) + currency HUD placeholder
- `src/app/(app)/study/page.tsx` — placeholder, real in Phase 2
- `src/components/ui/button.tsx` — the one shared primitive this phase needs

**Details:**

Keep this deliberately plain. It is a smoke test for auth, not a design pass. Landing copy should state the actual value proposition — "Study. Earn. Build." — because Phase 8 will iterate on it and a placeholder that says "Hello World" gives nothing to iterate from.

The nav must include all four routes even though three are empty, so the app shell is stable from Phase 2 onward.

---

## State Management for This Phase

| State | Category | Location | Source of truth | Persistence |
|---|---|---|---|---|
| Auth session | Server data | Auth.js session cookie | Postgres `sessions` | Cookie; survives refresh |
| User stats (HUD placeholder) | Server data | Server Component fetch | Postgres `user_stats` | DB |

No client state is introduced in this phase. TanStack Query and Zustand are installed but not yet wired — Phase 2 introduces the first real client state.

## Error Handling

| Operation | Failure mode | User-facing behavior | Recovery strategy |
|---|---|---|---|
| App boot | Missing/invalid env var | Server fails to start with a precise Zod message | Developer fixes `.env.local` — never silently degrade |
| Google OAuth | User cancels | Return to landing, no error toast | No state to clean up |
| Google OAuth | Provider error | Landing page shows "Sign-in failed, try again" | Auth.js `error` search param → inline message |
| First sign-in bootstrap | DB write fails mid-way | Sign-in fails, no partial account | Whole bootstrap is one transaction — all or nothing |
| Any DB query | Connection failure | 500 with a generic message | Log full error server-side; never leak the DSN or stack to the client |

## Testing Requirements for This Phase

- [ ] `calculateFocusAward` pays 10 Focus per credited minute and rounds down
- [ ] `applyDailyCap` returns 0 when the daily cap is already consumed
- [ ] `applyDailyCap` never returns a negative value
- [ ] `xpForLevel` is monotonically increasing
- [ ] A signed-out user hitting `/study` is redirected to `/`
- [ ] First sign-in creates exactly one `user_stats` row and one `islands` row
- [ ] Placing two rows at the same `(island_id, x, z)` violates the unique constraint
- [ ] Inserting a duplicate `(session_id, seq)` heartbeat violates the unique constraint

**Test type guidance:**
- Economy and XP math → **unit tests**, `node` environment, no mocks
- Auth redirect and the bootstrap transaction → **integration tests** against a real test database
- Constraint assertions → **integration tests**; they verify the *database*, so mocking defeats the purpose
- No E2E in this phase — Phase 9 owns E2E

## Acceptance Criteria

- [ ] `pnpm dev` starts with no errors and `/` renders the landing page
- [ ] "Continue with Google" completes sign-in and lands on `/study`
- [ ] Signing in for the first time creates `user_stats` and `islands` rows (verify with `pnpm db:studio`)
- [ ] Visiting `/study` signed out redirects to `/`
- [ ] `pnpm db:migrate` applies cleanly against an empty database
- [ ] Every table, column, and index from `00-overview.md` exists
- [ ] ESLint errors if a file in `src/game/` imports from `src/server/`
- [ ] ESLint errors if a file in `src/domain/` imports from `src/server/`
- [ ] Both Jest projects (`node` and `jsdom`) run and pass

**Verification commands:**
- `pnpm lint` — passes with no errors or warnings
- `pnpm typecheck` — no errors
- `pnpm test` — all pass
- `pnpm build` — production build succeeds

**Boundary check** (should print nothing):
```bash
rg -n "from '@/server" src/game src/domain
```

**Smoke test:** Start `pnpm dev`, open `http://localhost:3000`, click "Continue with Google", complete OAuth. You land on `/study` with the nav visible. Open `pnpm db:studio` and confirm exactly one row exists in `users`, `user_stats`, and `islands`. Sign out, navigate directly to `/island`, and confirm you are redirected to `/`.

## Handoff to Next Phase

Phase 1 delivers the complete skeleton: a Next.js 15 app with strict TypeScript and Tailwind, the full Postgres schema for all nine phases applied via Drizzle migrations, Google sign-in that bootstraps a user's stats and island in one transaction, a pure `src/domain/` layer with economy math and Zod-backed types, a repository layer that is the sole consumer of Drizzle, typed `AppError` handling, ESLint-enforced layer boundaries, and a working Jest setup pre-configured for the three.js ESM problem Phase 3 will hit.

**Codebase state:** compiles, lints, tests green, builds. The only working user-facing feature is sign-in. `/study`, `/notes`, `/review`, and `/island` are reachable placeholders. `src/game/` is empty.

**Phase 2 should start with** the session service in `src/server/services/focus-session.ts` and the three route handlers, then the client heartbeat hook. It should not touch 3D at all — Phase 2's UI is a plain HTML timer, deliberately, so the economy is proven before any rendering complexity exists.

**Open questions for next phase:**
- Heartbeat interval: plan assumes 15s. Shorter means finer-grained credit but more requests; a 45-minute session at 15s is 180 writes. Consider batching heartbeats into a single `focused_ms` accumulator column rather than one row per beat if write volume becomes a concern — the `session_heartbeats` table exists primarily for cadence validation, and only the last N rows are actually needed.
- Whether a browser crash mid-session should credit time up to the last heartbeat (recommended) or forfeit the session (punitive, and against the no-punishment principle).
