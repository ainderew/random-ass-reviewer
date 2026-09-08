# Phase 2: Focus Session Engine

> **Feature:** Aloft — 3D Study Game
> **Phase:** 2 of 9
> **Depends on:** `01-phase-foundation.md`
> **Estimated scope:** Medium (2–3 hours)

## Context from Previous Phase

**What Aloft is:** a web app that turns studying into a game. Students run verified focus sessions; verified minutes pay **Focus ⚡** currency and correct recall pays **Insight 💎**. Both are spent building a persistent 3D floating island. Target users are students, board-exam takers, and grad students who want to study but can't hold focus.

Phase 1 built the entire skeleton. The codebase is a Next.js 15 App Router project (React 19, TypeScript strict, Tailwind), with a four-layer architecture enforced by ESLint:

- **`src/domain/`** — pure, imports nothing from server/game/react. Contains economy math and Zod-backed types.
- **`src/server/`** — `db/` (Drizzle schema), `repositories/` (the *only* code that touches Drizzle), `services/` (orchestration, throws `AppError`), `llm/` (empty until Phase 6).
- **`src/game/`** — empty. Phase 3 fills it. **May never import from `src/server/`.**
- **`src/app/`** — routes. Thin controllers only, no SQL, no business rules.

**Files created in Phase 1:**
- `src/lib/env.ts` — Zod-validated `env` object. Never read `process.env` directly anywhere else.
- `src/lib/api-response.ts` — `handleRoute()` wrapper: catches `AppError` → shaped JSON, everything else → logged 500.
- `src/server/errors.ts` — `AppError` with codes `UNAUTHORIZED | NOT_FOUND | INVALID_STATE | INSUFFICIENT_FUNDS | RATE_LIMITED | VALIDATION`.
- `src/server/auth.ts` — Auth.js v5, Google OAuth, exports `{ auth, handlers, signIn, signOut }`. Session carries `user.id`. First sign-in bootstraps `user_stats` + `islands` in one transaction.
- `src/server/db/schema/*.ts` — full schema for all nine phases, already migrated.
- `src/server/db/index.ts` — exports the configured `db` client.
- `src/server/repositories/user-stats.ts` — includes `incrementBalances(tx, userId, { focus?, insight?, xp? })` using SQL-side `+=`, not read-modify-write.
- `src/server/repositories/focus-session.ts` — `getActiveSession(tx, userId)` and friends.
- `src/domain/economy/constants.ts` — `FOCUS_PER_MINUTE = 10`, `DAILY_CREDITABLE_MS = 8h`, `MIN_SESSION_MS = 5min`, `BREAK_PROMPT_MS = 50min`.
- `src/domain/economy/currency.ts` — `calculateFocusAward({ creditedMs, multiplier })`, `applyDailyCap({ focusedMs, alreadyCreditedTodayMs })`.
- `src/domain/economy/xp.ts` — `xpForLevel(n) = 100 * n^1.5`.
- `src/domain/types/session.ts` — `FocusSession`, `SessionStatus`, `Heartbeat`, and Zod schemas `startSessionRequestSchema`, `heartbeatRequestSchema`, `endSessionRequestSchema`.
- `src/app/(app)/layout.tsx` — server-side auth guard, nav, currency HUD placeholder.
- `src/app/(app)/study/page.tsx` — placeholder. **This phase replaces it.**

**Database tables relevant to this phase** (already migrated):

`focus_sessions` — `id` uuid PK, `user_id`, `started_at` timestamptz, `ended_at` nullable, `focused_ms` int default 0, `credited_ms` int default 0, `loot_seed` text, `status` enum `('active','completed','abandoned')`, `quiz_multiplier` numeric(3,2) default 1.00.
**Has a partial unique index on `(user_id) WHERE status = 'active'`** — one active session per user, enforced by the database.

`session_heartbeats` — `session_id` FK, `seq` int, `at` timestamptz, `focused` boolean.
**Has a unique index on `(session_id, seq)`** — a replayed heartbeat is a constraint violation, not free currency.

**Critical decision inherited from Phase 1:** `heartbeatRequestSchema` contains **no timestamp field**. The client never sends time. The server stamps every heartbeat with its own clock. This is the foundation of the entire anti-cheat design.

## Existing Codebase Context

- `src/lib/api-response.ts` — wrap every route handler in `handleRoute()`. Follow this pattern exactly; do not hand-roll try/catch per route.
- `src/server/repositories/user-stats.ts` — `incrementBalances` already does SQL-side increments. Use it; do not read a balance into JS and write it back.
- `src/domain/economy/currency.ts` — the payout formula already exists. This phase *calls* it; it does not reimplement it.
- `src/app/(app)/layout.tsx` — the authed shell. The timer UI mounts inside it.

## Objective

Build the server-authoritative focus session engine: start, heartbeat, end. The server owns the clock, validates heartbeat cadence, applies daily caps, and awards currency in a single transaction. The client gets a plain 2D timer.

**This phase deliberately ships zero 3D.** If the session engine is wrong, every downstream phase is wrong — and a plain HTML timer surfaces that in an hour instead of a month.

## Architecture Decisions

### Decision: The server owns the clock, absolutely
- **Choice:** `started_at` and every heartbeat `at` are stamped from the server's clock. Client `Date.now()` is used only to render a countdown, and never reaches an API payload.
- **Alternatives considered:** Trusting client-reported elapsed time; signing client timestamps
- **Rationale:** The browser is fully inspectable and `Date.now()` is trivially overridable from the console. Any economy that trusts the client is not an economy.
- **Tradeoff:** The displayed timer can drift a second or two from the credited time. Acceptable — reconcile on session end and show the server's number as final.

### Decision: Credit only *focused* intervals, computed between heartbeats
- **Choice:** Focused time accrues as the sum of gaps between consecutive heartbeats where the earlier beat reported `focused: true`. A gap longer than `MAX_BEAT_GAP_MS` (45s) credits only `HEARTBEAT_INTERVAL_MS` (15s), not the full gap.
- **Alternatives considered:** Crediting wall-clock elapsed; crediting only on clean session end
- **Rationale:** Handles laptop sleep, tab suspension, and network drops without either over-crediting (sleep through a session) or punishing (losing everything to one dropped request).
- **Tradeoff:** A user with genuinely flaky network loses a small amount of credit. Erring toward under-crediting is correct — over-crediting destroys the economy, under-crediting costs a few Focus.

### Decision: Browser signals are advisory, plausibility caps are the real defense
- **Choice:** `document.visibilityState` and `window.blur/focus` set the `focused` flag. The server does not trust them, but combines them with hard caps: max 8h credited/day, max 12 sessions/day, min 5 min for any payout.
- **Rationale:** A user can trivially force `focused: true`. The caps mean the *maximum* value of cheating is one honest day of study — which is a terrible return on writing a script.
- **Tradeoff:** Determined cheaters win. **This is accepted and intentional.** See Anti-cheat posture below.

### Decision: A crashed session is recovered, not forfeited
- **Choice:** `/api/session/active` returns any in-flight session on page load. A session with no heartbeat for >5 minutes is swept to `completed` and credited up to its last heartbeat.
- **Alternatives considered:** Forfeiting abandoned sessions (Forest's dying-tree model)
- **Rationale:** The product's core principle is no punishment. A crashed browser is not a moral failure, and punishing it is exactly the mechanic the research says drives off uncommitted users.
- **Tradeoff:** Slightly more generous to someone who closes their laptop mid-session. The 45s gap rule bounds the exposure.

## Anti-cheat posture — read this before implementing

Layered, cheap, and **explicitly not airtight**:

1. Server-authoritative clock and payout
2. Heartbeat cadence validation (monotonic `seq`, DB-enforced uniqueness)
3. Page Visibility + blur/focus → only focused intervals credit
4. Plausibility caps — 8h/day, 12 sessions/day, 5min minimum
5. Quiz-gated multiplier (Phase 7) — the large payout requires real recall

**A determined cheater with devtools will win, and that is fine.** They are grinding a game whose only prize is a virtual lantern. Do **not** build proctoring, webcam presence, or device fingerprinting. The cost/benefit is terrible and it destroys trust with the honest majority.

---

## Implementation Steps

### Step 1: Session domain rules

**What:** Pure functions encoding every session validation rule. No I/O, no DB.

**File(s):** `src/domain/session/validation.ts`, `src/domain/session/constants.ts`

**Details:**

```ts
// constants.ts
export const HEARTBEAT_INTERVAL_MS = 15_000;
export const MAX_BEAT_GAP_MS = 45_000;      // beyond this, credit only one interval
export const STALE_SESSION_MS = 5 * 60_000; // sweep threshold
export const MAX_SESSIONS_PER_DAY = 12;

// validation.ts
export function accumulateFocusedMs(
  beats: ReadonlyArray<{ atMs: number; focused: boolean }>,
): number;

export function isValidNextBeat(input: {
  lastSeq: number | null;
  nextSeq: number;
  lastAtMs: number | null;
  nowMs: number;
}): { ok: true } | { ok: false; reason: 'OUT_OF_ORDER' | 'TOO_FAST' };
```

`accumulateFocusedMs` walks consecutive pairs. For each pair where the *earlier* beat is `focused`, add `min(gap, MAX_BEAT_GAP_MS === gap ? gap : HEARTBEAT_INTERVAL_MS)` — concretely: add `gap` if `gap <= MAX_BEAT_GAP_MS`, else add `HEARTBEAT_INTERVAL_MS`.

`isValidNextBeat` rejects `TOO_FAST` when `nowMs - lastAtMs < HEARTBEAT_INTERVAL_MS * 0.5`. This is what stops a script from firing 200 heartbeats in a second.

> **ANTI-PATTERN: Validation logic inside the service**
> ❌ Don't: inline the cadence checks in `focus-session.ts`.
> ✅ Instead: pure functions in `src/domain/session/`, called by the service.
> 💡 Why: these are the rules most likely to need tuning and most in need of exhaustive tests. Pure functions test with no database.

---

### Step 2: Session service

**What:** Orchestration — the only place that composes repositories into transactions.

**File(s):** `src/server/services/focus-session.ts`

**Details:**

```ts
export async function startSession(userId: string): Promise<{ sessionId: string }>;
export async function recordHeartbeat(input: HeartbeatRequest & { userId: string }): Promise<{ focusedMs: number }>;
export async function endSession(input: { userId: string; sessionId: string }): Promise<SessionResult>;
export async function getActiveSession(userId: string): Promise<FocusSession | null>;
```

`startSession`:
1. Sweep any stale session for this user first (see Step 5)
2. Check `MAX_SESSIONS_PER_DAY` against the user's timezone — throw `RATE_LIMITED` if exceeded
3. Insert with `loot_seed = crypto.randomUUID()` and `started_at = now()` from the DB
4. If the partial unique index rejects the insert, an active session already exists — throw `INVALID_STATE`

**The loot seed is never returned to the client.** It stays server-side and Phase 5 rolls against it.

`endSession` — **one transaction**, in this order:
1. Load the session; throw `NOT_FOUND` if missing or not owned by `userId`; throw `INVALID_STATE` if not `active`
2. Load heartbeats, compute `focusedMs` via `accumulateFocusedMs`
3. If `focusedMs < MIN_SESSION_MS`, mark `completed` with `credited_ms = 0` and return — no payout, no cache, **no error** (a short session is a normal thing, not a failure)
4. Compute today's already-credited ms, apply `applyDailyCap`
5. `award = calculateFocusAward({ creditedMs, multiplier: session.quiz_multiplier })`
6. `incrementBalances(tx, userId, { focus: award, xp: award })`
7. Update the session to `completed` with `focused_ms`, `credited_ms`, `ended_at`
8. Return `{ creditedMs, focusAwarded, xpAwarded, cappedByDailyLimit: boolean }`

> **ANTI-PATTERN: Multiple round trips instead of one transaction**
> ❌ Don't: award currency, then update the session, in separate calls.
> ✅ Instead: wrap the whole thing in `db.transaction(async (tx) => { ... })`.
> 💡 Why: Atomicity. A crash between the two writes either pays a user twice on retry or loses their session entirely.

> **ANTI-PATTERN: Throwing on a short session**
> ❌ Don't: `throw new AppError('VALIDATION', 'Session too short')`.
> ✅ Instead: complete it normally with a zero payout and an honest message.
> 💡 Why: no-punishment principle. A 3-minute session is a user trying. Do not greet it with an error dialog.

---

### Step 3: Route handlers

**What:** Thin controllers. Parse, authorize, call the service, shape the response.

**File(s):**
- `src/app/api/session/start/route.ts`
- `src/app/api/session/beat/route.ts`
- `src/app/api/session/end/route.ts`
- `src/app/api/session/active/route.ts`

**Details:**

Every handler follows the same shape:
```ts
export const POST = handleRoute(async (req) => {
  const session = await auth();
  if (!session?.user?.id) throw new AppError('UNAUTHORIZED', 'Sign in required', 401);
  const body = heartbeatRequestSchema.parse(await req.json());
  return recordHeartbeat({ ...body, userId: session.user.id });
});
```

Note the ownership check lives in the *service*, not the handler — the handler passes `userId` and the service verifies the session belongs to it.

> **ANTI-PATTERN: Trusting `userId` from the request body**
> ❌ Don't: accept `userId` as a field the client sends.
> ✅ Instead: always derive it from `await auth()`.
> 💡 Why: otherwise any user can end any other user's session, or credit currency to an arbitrary account.

> **ANTI-PATTERN: Business logic in the route handler**
> ❌ Don't: compute elapsed time or check caps inside `route.ts`.
> ✅ Instead: the handler's entire job is auth + parse + delegate + return.
> 💡 Why: Phase 9 tests services directly without spinning up HTTP.

---

### Step 4: Client heartbeat hook

**What:** The client half — tracks focus, beats on an interval, survives tab-switching.

**File(s):** `src/app/(app)/study/_hooks/use-focus-session.ts`

**Details:**

```ts
export function useFocusSession(): {
  status: 'idle' | 'starting' | 'running' | 'ending';
  elapsedMs: number;
  focusedMs: number;
  isFocused: boolean;
  start: () => Promise<void>;
  end: () => Promise<SessionResult>;
};
```

Implementation notes that matter:

- **Focus flag:** `document.visibilityState === 'visible' && document.hasFocus()`. Listen to `visibilitychange`, `blur`, and `focus`. Keep it in a **ref**, not state — it's read inside the interval callback and does not need to trigger a re-render on every change.
- **Interval:** `setInterval` at `HEARTBEAT_INTERVAL_MS`. Increment `seq` locally starting at 0.
- **Background throttling:** browsers throttle `setInterval` to ~1/min in hidden tabs. This is *fine and correct* — a hidden tab isn't focused time anyway. Do not fight it with a Web Worker or `Audio` hack.
- **Recovery:** on mount, call `/api/session/active`. If a session is in flight, resume it — set `seq` past the server's last known value, which the endpoint returns.
- **`beforeunload`:** fire `navigator.sendBeacon('/api/session/end', ...)`. Best-effort only; the stale sweeper is the real backstop.
- **Displayed timer:** derive from `Date.now() - startedAtFromServer`. Update via `requestAnimationFrame` or a 1s interval — never store per-tick values in React state at high frequency.

> **ANTI-PATTERN: Sending elapsed time from the client**
> ❌ Don't: `body: { sessionId, elapsedMs: Date.now() - startedAt }`.
> ✅ Instead: send only `{ sessionId, seq, focused }`. The server computes everything else.
> 💡 Why: this is the entire anti-cheat design. Once the client reports duration, currency is free.

> **ANTI-PATTERN: `useEffect` with a stale interval closure**
> ❌ Don't: `useEffect(() => { setInterval(() => beat(seq), 15000) }, [])` where `seq` is state.
> ✅ Instead: keep `seq` and `focused` in refs read inside the callback.
> 💡 Why: the closure captures the first render's values and every heartbeat sends `seq: 0` forever.

---

### Step 5: Stale session sweeper

**What:** Reclaim sessions abandoned by crashes or closed laptops.

**File(s):** `src/server/services/focus-session.ts` (add `sweepStaleSessions`)

**Details:**

`sweepStaleSessions(userId)` finds active sessions whose most recent heartbeat is older than `STALE_SESSION_MS`, and ends each via the normal `endSession` path — crediting time up to the last heartbeat.

Call it lazily at the top of `startSession` and `getActiveSession`. **No cron job.** A cron is more infrastructure for a problem that only matters at the moment a specific user next interacts.

> **ANTI-PATTERN: Adding a background job for a lazily-resolvable problem**
> ❌ Don't: schedule a cron to sweep all users' stale sessions.
> ✅ Instead: sweep that one user's sessions when they next touch the API.
> 💡 Why: a stale session harms nobody until its owner tries to start a new one. Lazy sweeping is correct and free.

---

### Step 6: The timer UI

**What:** A plain, good-looking 2D timer. No 3D, no canvas.

**File(s):**
- `src/app/(app)/study/page.tsx` — Server Component: fetches stats, renders the client timer
- `src/app/(app)/study/_components/focus-timer.tsx` — `'use client'`
- `src/app/(app)/study/_components/session-result.tsx` — the post-session summary
- `src/components/ui/currency-badge.tsx` — shared HUD element

**Details:**

Timer states:
- **Idle** — big "Start Focusing" button, today's total, current streak
- **Running** — large `MM:SS`, a subtle "Focused" / "Away — not counting" indicator, an End button
- **Away** — the indicator flips and the timer visually desaturates. **Do not** show a scary red warning or a countdown-to-forfeit. Informative, not punitive.
- **Break prompt** — at `BREAK_PROMPT_MS` (50 min), a dismissible suggestion to take five. Never forced.
- **Ended** — `session-result.tsx` shows credited time, Focus earned, and (from Phase 5) the cache

Push `'use client'` as low as possible: `page.tsx` stays a Server Component and fetches `user_stats` directly; only `focus-timer.tsx` is a client component.

The result screen is where Phase 5 attaches the chest sequence. Structure it now so that plugging in the reward animation is additive: render `{children}` or a `slot` where the cache reveal will go.

> **ANTI-PATTERN: Premature client component**
> ❌ Don't: put `'use client'` at the top of `study/page.tsx`.
> ✅ Instead: keep the page a Server Component; mark only the interactive timer.
> 💡 Why: `'use client'` pushes the entire subtree into the client bundle. Phase 3 adds three.js — bundle discipline established now pays off then.

---

### Step 7: Wire TanStack Query

**What:** Set up the query client and the stats query the HUD reads.

**File(s):** `src/app/providers.tsx`, `src/app/(app)/_hooks/use-stats.ts`, `src/app/api/stats/route.ts`

**Details:**

`providers.tsx` is a client component wrapping the app in `QueryClientProvider`. Defaults: `staleTime: 30_000`, `refetchOnWindowFocus: true` — the HUD should update when a user comes back to the tab.

`use-stats()` wraps `useQuery` on `/api/stats`. **Invalidate it after `endSession` resolves** so the currency badge updates immediately.

> **ANTI-PATTERN: Duplicating server state into Zustand**
> ❌ Don't: copy balances into a Zustand store and try to keep it in sync.
> ✅ Instead: TanStack Query is the single source of truth for server data; invalidate after mutations.
> 💡 Why: State Synchronization is the #1 source of stale-data bugs. Zustand is for ephemeral client state (Phase 3's camera and build mode), not server data.

---

## State Management for This Phase

| State | Category | Location | Source of truth | Persistence |
|---|---|---|---|---|
| Session status (idle/running/ending) | UI | `useState` in `use-focus-session` | Client | None — recovered from `/api/session/active` |
| `sessionId` | Server data | Hook state, seeded from server | Postgres `focus_sessions` | DB |
| Heartbeat `seq` | Ephemeral | **Ref** in the hook | Client, validated server-side | None |
| `isFocused` | Ephemeral | **Ref** + mirrored to state for display | Browser events | None |
| Displayed elapsed time | Derived | Computed from server `started_at` | Server clock | Recomputed on mount |
| Credited time, balances | Server data | TanStack Query | Postgres | DB |

## Error Handling

| Operation | Failure mode | User-facing behavior | Recovery strategy |
|---|---|---|---|
| Start session | One already active | Resume the existing session instead of erroring | `/api/session/active` on mount makes this near-impossible in practice |
| Start session | Daily session cap hit | "You've started 12 sessions today — take a break." | Informative, not an error state |
| Heartbeat | Network failure | **Silent.** No toast, no banner. | Retry on next tick. The gap rule bounds the credit loss |
| Heartbeat | `OUT_OF_ORDER` / `TOO_FAST` | Silent server-side rejection, 200 response | Never surface this — legitimate users hit it during clock adjustments |
| Heartbeat | Session already ended | Client stops the interval and shows the result | Server returns `INVALID_STATE`; hook transitions to `ended` |
| End session | Network failure | "Saving…" with retry; timer keeps displaying | Retry up to 3× with backoff, then rely on the stale sweeper |
| End session | Under 5 minutes | "Session logged — under 5 minutes doesn't earn Focus yet." | Normal completion path, zero payout, **no error styling** |
| End session | Daily cap reached | Show earned amount + "Daily cap reached — nice work today." | Framed as an achievement, not a denial |
| Any route | Not signed in | Redirect to `/` | Layout guard already handles this |

## Testing Requirements for This Phase

- [ ] `accumulateFocusedMs` sums gaps only where the earlier beat was focused
- [ ] `accumulateFocusedMs` credits one interval, not the full gap, when a gap exceeds 45s
- [ ] `accumulateFocusedMs` returns 0 for a single beat, and 0 for an empty array
- [ ] `isValidNextBeat` rejects a `seq` equal to or below the last one
- [ ] `isValidNextBeat` rejects beats arriving faster than half the interval
- [ ] Starting a session while one is active returns the existing session rather than creating a second
- [ ] **Ending a session with zero heartbeats awards zero** ← the headline anti-cheat test
- [ ] **Replaying a heartbeat `seq` is rejected** ← DB constraint
- [ ] **200 heartbeats submitted in one second credit at most one interval** ← cadence
- [ ] A session under `MIN_SESSION_MS` completes successfully with zero payout and no thrown error
- [ ] The daily cap clamps credited time and sets `cappedByDailyLimit: true`
- [ ] Currency award and session update are atomic — a forced failure mid-transaction rolls back both
- [ ] Ending another user's session throws `NOT_FOUND`
- [ ] The stale sweeper credits up to the last heartbeat, not to `now()`

**Test type guidance:**
- Everything in `src/domain/session/` → **unit tests**, no mocks, no DB
- Service tests including the anti-cheat probes → **integration tests against a real test Postgres**. Do not mock the DB — the unique constraints *are* the anti-cheat, so mocking them tests nothing.
- Timer UI → **RTL integration**: "clicking Start shows a running timer," "switching tabs shows the Away indicator." Never assert on internal hook state.
- E2E deferred to Phase 9.

## Acceptance Criteria

- [ ] Clicking Start creates one `focus_sessions` row with `status = 'active'` and a server-side `started_at`
- [ ] Heartbeats appear in `session_heartbeats` roughly every 15s while the tab is focused
- [ ] Switching to another tab sets `focused: false` on subsequent beats and the UI shows the Away state
- [ ] Ending the session credits approximately the focused time, excluding away periods
- [ ] `user_stats.focus_balance` increases and the HUD updates without a manual refresh
- [ ] Refreshing mid-session resumes the same session with the timer continuing correctly
- [ ] Closing the tab and returning later shows the session swept and credited up to its last heartbeat
- [ ] `POST /api/session/end` called directly with no prior heartbeats awards zero
- [ ] No 3D or three.js dependency exists in the codebase yet

**Verification commands:**
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

**Manual anti-cheat probe** — run these in the browser console and confirm each fails:
```javascript
await fetch('/api/session/start', { method: 'POST' }).then(r => r.json())
```
Then immediately, with the returned id, call `/api/session/end`. Confirm the award is **0**.

**Smoke test:** Sign in, go to `/study`, click Start. Watch the timer run and confirm heartbeat requests every ~15s in the Network tab. Switch to another tab for 30 seconds, come back — the indicator showed "Away" and beats reported `focused: false`. Let it run past 5 minutes total, click End. The result screen shows credited time *less* than wall-clock elapsed by roughly your away duration, and the Focus balance in the HUD increased by `creditedMinutes × 10`.

## Handoff to Next Phase

Phase 2 delivers a fully working, server-authoritative focus session engine. `POST /api/session/{start,beat,end}` plus `GET /api/session/active` are live. `src/domain/session/` holds the pure cadence and accumulation rules; `src/server/services/focus-session.ts` composes them into transactional payouts. The client hook `use-focus-session.ts` tracks Page Visibility and window focus, beats every 15s, recovers in-flight sessions on mount, and best-effort-ends on unload. A stale sweeper reclaims crashed sessions lazily. `/study` is a complete, plain 2D timer with idle/running/away/break/ended states. TanStack Query is wired and the currency HUD updates live.

**Codebase state:** the economy works end to end and is verifiably not cheatable through the normal client. No 3D exists — `src/game/` is still empty and three.js is not installed.

**Known shortcuts taken:**
- `quiz_multiplier` is written to the schema and read by `endSession` but always 1.00 — Phase 7 sets it.
- No cache/loot is generated on session end. `loot_seed` is stored and unused — Phase 5 consumes it.
- The session-result screen has a deliberate empty slot where the chest reveal will mount.

**Phase 3 should start with** the asset optimization script and generated manifest, *before* writing any R3F code. The manifest is what gives the scene code compile-time safety, and building the scene against hand-typed asset ids will need redoing.

**Open questions for next phase:**
- Heartbeat write volume: a 45-minute session writes ~180 rows. If this becomes a cost concern, only the last ~5 heartbeats are needed for cadence validation — older rows can be pruned on session end after `focused_ms` is computed. Not urgent at current scale; flagging before it becomes a migration.
- 🟡 **Art direction must be decided before Phase 3's asset generation** — low-poly stylized vs semi-realistic vs Ghibli-ish. It determines the Tripo3D prompt template and the entire lighting/post-processing setup, and regenerating a prop library is expensive.
