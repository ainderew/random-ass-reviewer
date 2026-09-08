# Phase 9: Testing

> **Feature:** Aloft — 3D Study Game
> **Phase:** 9 of 9
> **Depends on:** all prior phases
> **Estimated scope:** Medium–Large (3–4 hours)

## Context from Previous Phases

**What Aloft is:** a web app that turns studying into a game. Students upload their own notes; Claude generates verified flashcards. Verified focus minutes pay **Focus ⚡**; correct recall pays **Insight 💎**. Both are spent building a persistent 3D floating island.

Phases 1–8 delivered a production-quality product. Each phase listed what needed testing; this phase writes the suite.

**Architecture recap (what you're testing):**

- **`src/domain/`** — pure, imports nothing. `economy/` (currency, xp, rng, loot, streak, insight), `session/` (validation, accumulation), `island/` (grid math), `review/` (FSRS wrapper, queue), `study/` (chunking, quote verification), `world/` (sun, wander), `types/` (Zod schemas).
- **`src/server/`** — `db/` (Drizzle schema), `repositories/` (the only Drizzle consumers), `services/` (orchestration; throw `AppError`), `llm/` (`LlmProvider` × 3).
- **`src/game/`** — R3F scene, systems, juice primitives. Never imports `server`.
- **`src/app/`** — routes; thin controllers.

**Test tooling already configured in Phase 1:**
- `jest.config.ts` with **three projects** — `domain` (node) for `src/domain/**`, `server` (node, real Postgres, migrations in `jest.global-setup.server.ts`) for `src/server/**`, `ui` (jsdom) for `src/app/**`, `src/components/**`, `src/game/**`
- `transformIgnorePatterns` already covers three.js and `@react-three/*` ESM
- `moduleNameMapper` maps `@/` and stubs `.glsl` imports
- `playwright.config.ts` exists
- Smoke tests exist at `src/domain/economy/currency.test.ts` and `src/components/ui/button.test.tsx`

> ⚠️ **The Jest + three.js escape hatch is still live.** If ESM issues resurface while writing scene tests, switch the test runner to Vitest rather than burning a third attempt — RTL and Playwright are unaffected. Per the user's error-recovery rule: two failed attempts on the same issue means stop and surface the decision.

## Existing Codebase Context

- `jest.config.ts` — three projects; the test-DB globalSetup already exists (Phase 1)
- `src/server/db/index.ts` — exports `db`; tests point it at a test database via `DATABASE_URL`
- `src/lib/env.ts` — Zod-validated env; tests need a `.env.test`
- `src/server/llm/provider.ts` — the `LlmProvider` interface; the fake implements it

## Objective

Write the test suite: exhaustive unit coverage of the pure domain layer, integration coverage of services and API routes against a real Postgres, RTL coverage of user-facing behavior, smoke-level scene-graph assertions, and Playwright E2E of the full loop plus the anti-cheat probes.

## Architecture Decisions

### Decision: Integration tests run against a real Postgres, never a mock
- **Choice:** A disposable test database (local Docker Postgres or a Neon branch), migrated fresh, truncated between tests.
- **Alternatives considered:** Mocking the repository layer; an in-memory SQLite substitute
- **Rationale:** The unique constraints **are** the correctness mechanism in three places — one active session per user, one heartbeat per `(session_id, seq)`, one placement per tile. A mock cannot enforce them, so a mocked test of those paths asserts nothing. SQLite doesn't support the partial unique index Phase 2 relies on.
- **Tradeoff:** Tests need a running Postgres. Worth it — these are the tests that catch the bugs that cost money.

### Decision: One fake `LlmProvider`, no network in tests
- **Choice:** `FakeLlmProvider` implements the Phase 6 interface with scripted responses.
- **Rationale:** The provider is the external boundary, and the interface exists precisely so tests don't hit the network. Real API tests are slow, flaky, and cost money per run.
- **Tradeoff:** Prompt regressions aren't caught by tests. Mitigated by the `sourceQuote` rejection-rate logging from Phase 6 — a rising rate in production is the real signal.

### Decision: Test behavior, never implementation
- **Choice:** RTL queries by role and accessible name. No `data-testid` unless there is genuinely no accessible handle. No assertions on internal state or CSS classes.
- **Rationale:** Implementation-detail tests break on every refactor while behavior is unchanged — they cost more than they catch.
- **Tradeoff:** Some tests are more verbose. Accepted.

### Decision: Three focused E2E tests, not an exhaustive suite
- **Choice:** Playwright covers (1) the full study→earn→build loop, (2) the notes→cards→review loop, (3) the anti-cheat probes. Everything else lives at a cheaper layer.
- **Rationale:** E2E is slow and flaky. Its value is proving the layers connect — which three tests establish. A twentieth E2E test adds runtime and flake, not confidence.
- **Tradeoff:** Some UI paths only get RTL coverage. Correct trade.

---

## Implementation Steps

### Step 1: Test database setup

**File(s):** `jest.setup.db.ts`, `docker-compose.test.yml`, `.env.test`, `package.json`

**Details:**

`docker-compose.test.yml` runs Postgres 16 on a non-default port so it can't collide with a dev instance.

`jest.setup.db.ts` as `globalSetup` for the `node` project: run `drizzle-kit migrate` against `DATABASE_URL` from `.env.test` once per run.

Add a `resetDb()` helper that `TRUNCATE ... RESTART IDENTITY CASCADE`s all tables, called in `beforeEach` for integration tests. **Truncate, don't drop and re-migrate** — migration per test is ~100× slower and the suite becomes something nobody runs.

Scripts:
```json
{
  "test:unit": "jest --selectProjects node --testPathIgnorePatterns integration",
  "test:integration": "jest --selectProjects node --testPathPattern integration",
  "test:ui": "jest --selectProjects jsdom",
  "test:e2e": "playwright test"
}
```

> **ANTI-PATTERN: Re-running migrations per test**
> ❌ Don't: migrate in `beforeEach`.
> ✅ Instead: migrate once in `globalSetup`, truncate per test.
> 💡 Why: a suite that takes four minutes gets skipped. A suite that takes fifteen seconds gets run.

---

### Step 2: Domain unit tests

**What:** The cheapest, highest-value coverage in the project. Aim for near-full branch coverage here and nowhere else.

**File(s):**
- `src/domain/economy/{currency,xp,rng,loot,streak,insight}.test.ts`
- `src/domain/session/validation.test.ts`
- `src/domain/island/grid.test.ts`
- `src/domain/review/{scheduler,queue}.test.ts`
- `src/domain/study/{chunking,verify-quote}.test.ts`
- `src/domain/world/{sun,wander}.test.ts`

**Details:**

These are pure functions with no setup. Every case listed in Phases 1–7's "Testing Requirements" belongs here. The ones that carry the most weight:

**`loot.test.ts` — the pity guarantee.** Across 12 consecutive rolls from any seed, at least one must be rare or better. Run it across 100 distinct seeds. This is a promise to users; assert it statistically, not anecdotally.

**`rng.test.ts` — determinism.** Same seed → identical sequence. Different seeds → different sequences. `weighted()` respects its distribution within tolerance over 10,000 samples.

**`streak.test.ts` — timezone correctness.** A user at UTC+8 studying at 01:00 local must not lose their streak. This is the bug that would make people quit, and it's invisible if you only test in UTC.

**`scheduler.test.ts` — simulate 90 days.** Assert that repeated Good ratings produce monotonically increasing intervals and that Again shortens them. Pass `nowMs` explicitly; that's why it's a parameter.

**`verify-quote.test.ts` — the rejection case is the point.** It must match through whitespace, smart quotes, and case differences, and it must **reject a plausible paraphrase**. Write that test first.

**`grid.test.ts` — exhaustive round-trip.** Every in-bounds coordinate must survive `gridToWorld` → `worldToGrid` unchanged.

**`insight.test.ts` — the multiplier floor.** `calculateQuizMultiplier` must never return below 1.0 for any input, including 0 correct out of 8.

---

### Step 3: Repository and constraint tests

**What:** Verify the database enforces what the design depends on.

**File(s):** `src/server/repositories/__tests__/*.integration.test.ts`

**Details:**

These test the *database*, so mocking would defeat the purpose:

- Two rows with the same `(island_id, x, z)` → unique violation
- Two `focus_sessions` with `status = 'active'` for one user → partial unique index violation
- Duplicate `(session_id, seq)` heartbeat → unique violation
- Duplicate `(user_id, content_hash)` note source → unique violation
- `incrementBalances` under two concurrent calls → both increments land (SQL-side `+=`, not read-modify-write)
- Deleting a `note_source` cascades to chunks and cards
- An `fsrs_state` object round-trips through JSONB unchanged

That concurrency test is worth writing carefully: fire two `incrementBalances(+10)` calls in parallel and assert the balance rose by 20, not 10. A read-modify-write regression passes every other test.

---

### Step 4: Service integration tests

**What:** The business logic, against a real DB.

**File(s):** `src/server/services/__tests__/*.integration.test.ts`

**Details:**

Organized by service. The load-bearing cases:

**`focus-session.integration.test.ts`**
- Start → beat × N → end credits approximately the focused time
- **End with zero heartbeats awards zero** ← headline anti-cheat
- **Replayed `seq` is rejected**
- **200 heartbeats in one second credit at most one interval**
- Under `MIN_SESSION_MS` completes with zero payout and **no thrown error**
- Daily cap clamps credited time and sets `cappedByDailyLimit`
- **The cap applies to time before the quiz multiplier applies to the award**
- A forced failure mid-transaction rolls back both currency and session
- Ending another user's session throws `NOT_FOUND`
- The stale sweeper credits to the last heartbeat, not to `now()`

**`island.integration.test.ts`**
- Placement debits and inserts atomically
- Insufficient funds throws and **creates no row**
- Two concurrent placements on one tile: exactly one succeeds
- Removal refunds exactly 50%, rounded down

**`cache.integration.test.ts`**
- **Opening a cache twice credits currency once** ← idempotency
- Opening another user's cache → 404
- `endSession` response contains **no** `contents` and **no** `pity_counter`

**`card-generation.integration.test.ts`** (with `FakeLlmProvider`)
- Cards whose quote fails verification are dropped
- Usage records all four token fields separately
- Quota assertion throws **before** any provider call
- One chunk failing doesn't abort the others
- Identical content uploaded twice creates one source

**`review.integration.test.ts`**
- `submitAnswer` updates FSRS state and inserts a review atomically
- **`submitSessionQuiz` twice for one session is rejected**
- Quiz submission on a completed session throws `INVALID_STATE`
- A corrupt `fsrs_state` resets rather than crashing the queue

> **ANTI-PATTERN: Mocking the database in service tests**
> ❌ Don't: `jest.mock('@/server/repositories/...')`.
> ✅ Instead: real Postgres, truncated between tests.
> 💡 Why: the bugs live at the service↔repository boundary — transaction scope, constraint violations, concurrent writes. That's exactly what mocks paper over.

---

### Step 5: The fake LLM provider

**File(s):** `src/server/llm/__fixtures__/fake-provider.ts`

**Details:**

```ts
export class FakeLlmProvider implements LlmProvider {
  readonly name = 'anthropic-api';
  constructor(private script: {
    cards?: GeneratedCard[];
    throwError?: Error;
    usage?: Partial<TokenUsage>;
  }) {}
  // ...
}
```

Scriptable to return: valid cards, cards with fabricated quotes (to test the guard), a refusal, a rate-limit error, and null `parsed_output`. Each is a real failure mode from Phase 6's error table.

Also assert the provider is **called with the expected shape** — specifically that `cache_control` sits on the last system block and that no variable content leaked into the system prompt. A cache regression is silent and expensive; this is the only place it's cheap to catch.

---

### Step 6: API route tests

**File(s):** `src/app/api/__tests__/*.integration.test.ts`

**Details:**

Thin coverage, because the logic is in services. What routes uniquely own:

- Unauthenticated requests return 401 on every authed route
- Malformed bodies return 400 with Zod details
- `userId` is derived from the session, **never** from the request body
- `AppError` codes map to the right HTTP status
- Unexpected errors return a generic 500 that leaks nothing
- **`GET /api/review/session-quiz` contains no correct-answer field**
- **`POST /api/session/end` contains no cache `contents` and no `pity_counter`**

Those last two are leak tests. They're the kind of thing a refactor silently reintroduces, and they're one assertion each.

---

### Step 7: Component and hook tests

**File(s):** `src/app/(app)/**/__tests__/*.test.tsx`, `src/components/**/__tests__/*.test.tsx`

**Details:**

Behavior only. Query by role and accessible name.

**`use-focus-session.test.ts`** — the trickiest, worth the effort:
- Beats fire at the configured interval (fake timers)
- `seq` increments — **never resets to 0** (the stale-closure bug from Phase 2)
- Tab hidden → subsequent beats report `focused: false`
- Mount with an active session resumes rather than starting a new one
- `beforeunload` fires `sendBeacon`

**`focus-timer.test.tsx`** — Start shows a running timer; tab-away shows the Away state; End shows the result.

**`review-session.test.tsx`** — Space reveals the answer; `3` rates Good and advances; the completion summary renders after the last card.

**`session-quiz.test.tsx`** — Skip goes straight to the reward; correct answers raise the displayed multiplier; the multiplier display never drops below ×1.0.

**`upload-dropzone.test.tsx`** — an oversized file shows the limit message before any upload starts.

**Error boundaries** — force a throw, assert the fallback renders and Retry calls `reset`.

> **ANTI-PATTERN: Testing implementation details**
> ❌ Don't: assert that a hook's internal `seq` state equals 3, or that a div has class `bg-red-500`.
> ✅ Instead: assert that three heartbeat requests were sent, or that the Away indicator is visible.
> 💡 Why: the first breaks on every refactor while behavior is unchanged. The second breaks only when something actually broke.

---

### Step 8: Scene-graph smoke tests

**File(s):** `src/game/__tests__/*.test.tsx`

**Details:**

Using `@react-three/test-renderer`. **Smoke level only** — node counts and instance counts, not appearance:

- One `InstancedMesh` per distinct `assetId`
- Instance count equals the placement count for that asset
- Scholar count scales with placements and caps at 8
- Reduced motion produces zero particle nodes
- The scene mounts without throwing given a minimal island fixture

**Do not attempt visual regression testing.** A day/night cycle driven by wall-clock time is non-deterministic by design; screenshot diffing it is a maintenance sink that produces false failures forever.

---

### Step 9: Reduced-motion coverage

**File(s):** `src/game/systems/juice/__tests__/reduced-motion.test.ts`

**Details:**

One table-driven test over every exported primitive, asserting each no-ops when `worldState.reducedMotion` is true:

| Primitive | Assertion |
|---|---|
| `useHitStop` | Never sets `worldState.frozen` |
| `useScreenShake` | Amplitude stays 0 |
| `useSpringPop` | Resolves to the final value immediately |
| `playPitched` | Still plays (audio isn't motion) but with no pitch ramp |

Plus a **guard test** that enumerates the exports of `src/game/systems/juice/` and fails if any is missing from the table. That's what stops a future primitive from silently skipping the check — Phase 8's lint rule catches misuse, this catches omission.

---

### Step 10: E2E tests

**File(s):** `e2e/{full-loop,study-content,anti-cheat}.spec.ts`, `e2e/fixtures/`

**Details:**

Auth: seed a test user directly and inject the session cookie. **Do not automate the Google OAuth flow** — it's slow, it breaks on Google's UI changes, and it tests Google, not Aloft.

**`full-loop.spec.ts`** — sign in → `/study` → start → wait past the dev-shortened minimum → end → chest reveal → `/island` → place a building → reload → **it's still there**.

**`study-content.spec.ts`** — upload a fixture markdown file → cards generate (with the fake provider wired in test mode) → each card shows a source quote → `/review` → answer five cards with the keyboard → Insight balance rises.

**`anti-cheat.spec.ts`** — the three probes, run through the real HTTP stack:
1. `POST /api/session/end` with no prior heartbeats → award is **0**
2. Replay a heartbeat `seq` → rejected
3. Mutate the Zustand currency store from the page context → reload → **balance unchanged**

That third one is the clearest statement of the server-authoritative design, and it's the one a future refactor is most likely to break.

Add a dev-only env flag shortening `MIN_SESSION_MS` so E2E doesn't wait five real minutes.

---

### Step 11: CI

**File(s):** `.github/workflows/ci.yml`

**Details:**

On push and PR:
1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:unit` — fast, no services
4. Start Postgres → `pnpm test:integration`
5. `pnpm test:ui`
6. `pnpm build`
7. `pnpm check:bundle` (Phase 8)
8. `pnpm test:e2e` against the built app

Unit tests run first so the common failure fails in seconds rather than after a full build.

Add the boundary greps as an explicit CI step — they're one line each and they protect the architecture:
```bash
rg -q "from '@/server" src/game src/domain && exit 1 || true
rg -q "process\.env" src --glob '!src/lib/env.ts' && exit 1 || true
```

Coverage thresholds, differentiated by layer:
- `src/domain/**` — 90% branches. This is where it's cheap and where the money bugs live.
- `src/server/services/**` — 75%
- Everything else — no threshold. A global percentage target produces tests written to move a number.

> **ANTI-PATTERN: A uniform global coverage threshold**
> ❌ Don't: require 80% across the whole codebase.
> ✅ Instead: high on `domain`, moderate on `services`, none elsewhere.
> 💡 Why: a global target drives people to test trivial pass-through code to hit a number, while the hard logic stays undertested. Put the bar where the risk is.

---

## Testing Requirements for This Phase

This phase *is* the testing requirements. See the acceptance criteria below.

## Acceptance Criteria

- [ ] `pnpm test:unit` passes with no database or network
- [ ] `pnpm test:integration` passes against a fresh Postgres
- [ ] `pnpm test:ui` passes
- [ ] `pnpm test:e2e` passes against a production build
- [ ] `src/domain/**` branch coverage ≥ 90%
- [ ] `src/server/services/**` branch coverage ≥ 75%
- [ ] Every "Testing Requirements" checkbox from Phases 1–8 has a corresponding test
- [ ] **Ending a session with zero heartbeats awards zero**
- [ ] **A replayed heartbeat `seq` is rejected**
- [ ] **Client-side store mutation does not change the server balance**
- [ ] **Opening a cache twice credits currency once**
- [ ] **The pity guarantee holds across 100 distinct seeds**
- [ ] **`calculateQuizMultiplier` never returns below 1.0**
- [ ] **A UTC+8 user studying at 01:00 local keeps their streak**
- [ ] **The daily cap applies before the quiz multiplier**
- [ ] **`verify-quote` rejects a plausible paraphrase**
- [ ] **The quiz API response contains no correct answer**
- [ ] **`/api/session/end` contains no cache contents and no pity counter**
- [ ] **Every juice primitive no-ops under reduced motion, and the guard test enumerates all of them**
- [ ] No test calls the real Anthropic API
- [ ] No test mocks the database in a service or repository test
- [ ] CI fails if `src/game/` or `src/domain/` imports from `src/server/`
- [ ] The full suite runs in under 5 minutes in CI

**Verification commands:**
```bash
pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration && pnpm test:ui && pnpm build && pnpm check:bundle && pnpm test:e2e
```

**Coverage:**
```bash
pnpm test -- --coverage
```

**Smoke test:** With Postgres down, `pnpm test:unit` still passes — proof the domain layer is genuinely pure. Bring Postgres up and run the integration suite; it should complete in well under a minute. Deliberately break one thing — remove the `(session_id, seq)` unique index — and confirm the replay test fails. That's the check that the anti-cheat tests are testing something real rather than passing vacuously.

## Handoff — the project is complete

**Phase 9 completes Aloft.** The suite covers: exhaustive unit tests over the pure domain layer (economy, session validation, grid math, FSRS scheduling, chunking, quote verification, sun and wander math) at ≥90% branch coverage; integration tests over repositories, services, and API routes against a real Postgres with the database constraints exercised as the correctness mechanisms they are; a scriptable `FakeLlmProvider` so no test touches the network; RTL coverage of user-facing behavior queried by role; smoke-level scene-graph assertions; a table-driven reduced-motion suite with a guard test that fails when a new primitive is added without coverage; and three focused Playwright E2E tests covering the full loop, the study-content loop, and the three anti-cheat probes. CI runs lint, typecheck, unit, integration, UI, build, bundle assertions, and E2E, plus explicit greps enforcing the layer boundaries.

**Final state:** the complete product works end to end. A student uploads their own lecture notes; Claude generates flashcards, each verified against a verbatim quote from the source. They run a focus session whose duration the server verifies and can't be faked from the client. They review cards on an FSRS schedule, earning Insight for real recall. An optional post-session quiz multiplies their payout. Both currencies build a persistent 3D island that grows, lights its windows at their real local dusk, and fills with wandering scholars — and every reward moment is engineered for anticipation without borrowing the gambling patterns that would make it predatory.

**What's deliberately not built:**
- Multiplayer, social study rooms, friend leaderboards
- Native mobile
- Real-money purchases of any kind
- Combat / roguelite runs
- Rigged, animated creature companions
- Proctoring, webcam presence, device fingerprinting
- i18n

**Known gaps carried forward:**
- Prompt regressions aren't caught by tests — the `sourceQuote` rejection rate in production is the real signal. Watch it.
- No visual regression testing on the 3D scene. Deliberate.
- Generation is synchronous; very large uploads will time out. The Batches API (50% cheaper, up to 100k requests) is the escalation path.
- Device tier is decided once per mount; a throttling laptop stays at its initial tier.
- FSRS runs on library defaults; per-user parameter optimization needs hundreds of reviews of history.

**Before launch, still to decide:**
- Error reporting (Sentry or similar) — ~30 minutes, worth doing
- Analytics — only after deciding what question it answers
- Model cost tiering — everything runs on `claude-opus-5` by default; evaluate `claude-sonnet-5` or `claude-haiku-4-5` for bulk generation once you have real usage data. **Card quality from messy student notes is the product**, so this is a decision to make with data, not an automatic optimization.

---

## Delivered (2026-09-08)

- 46 Jest suites across the three projects, 300 tests: domain at ≥90% branches, services at ≥75% (enforced by `pnpm test:coverage`).
- Route tests in `src/app/api/__tests__` run in the node project with only `auth()` mocked. They cover 401 on every authed route, 400 shaping, status mapping, the generic 500, session-derived identity, the quiz key leak, the session-end leak, and `Retry-After`.
- `ScriptedProvider` is the single fake; `FakeLlmProvider` (`LLM_PROVIDER=fake`) serves development and CI.
- Playwright: keyboard review, axe on four routes, offline, the full loop, notes to cards to Insight, and the three anti-cheat probes. Serialised, one seeded user, `pnpm seed:smoke` prunes empty sessions so the twelve-a-day cap does not bite reruns.
- CI in `.github/workflows/ci.yml`: boundaries, lint, typecheck, unit, integration, coverage, build, bundle, e2e against the built app with the fake provider and a ten-second minimum session.
- unpdf loads pdf.js through `import()`; the Jest scripts set `--experimental-vm-modules` for it.
