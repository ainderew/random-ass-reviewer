# Phase 7: Review System (FSRS + Quiz Gate)

> **Feature:** Aloft — 3D Study Game
> **Phase:** 7 of 9
> **Depends on:** `05-phase-reward-juice.md`, `06-phase-notes-ai.md`
> **Estimated scope:** Medium (2–3 hours)

## Context from Previous Phases

**What Aloft is:** a web app that turns studying into a game. Verified focus minutes pay **Focus ⚡**; correct recall on the student's own notes pays **Insight 💎**. Both are spent building a persistent 3D floating island.

**This phase closes the loop.** Until now, studying and the game are two adjacent systems. This phase makes recall the thing that pays for the objects players actually want.

**What already exists:**

**Phase 1** — Next.js 15 App Router, React 19, TypeScript strict, Tailwind, Drizzle + Neon Postgres, Auth.js v5. ESLint enforces `app → server → domain`; `domain` imports nothing; `game` never imports `server`. `ts-fsrs` is **already installed** (Phase 1 dependency) and unused.

**Phase 2** — server-authoritative focus sessions. `/api/session/{start,beat,end,active}`. `src/server/services/focus-session.ts` computes credited time and awards currency in one transaction. `focus_sessions.quiz_multiplier` is numeric(3,2), **written to the schema, read by `endSession`, and always 1.00** — this phase sets it.

**Phase 5** — the reward layer. `src/domain/economy/` holds `rng.ts` (seeded `mulberry32`), `loot.ts` (tables + pity), `streak.ts`, `currency.ts`. `src/game/systems/juice/` exports `useHitStop`, `useScreenShake`, `useSpringPop`, and `playPitched(buffer, { semitones })` — **all four no-op when `worldState.reducedMotion` is true, and this phase must use them rather than writing new animations.**

**Phase 6** — the AI pipeline. Cards exist in the `cards` table with `next_due_at = now()` and an initial FSRS state. `src/server/llm/` holds the `LlmProvider` interface and three implementations. `/notes` supports upload and card editing. **Nothing reviews the cards yet.**

**Database tables relevant to this phase** (migrated in Phase 1):

`cards` — `id` uuid PK, `user_id`, `chunk_id` FK, `question`, `answer`, `source_quote`, `tags` text[], `next_due_at` timestamptz, `fsrs_state` jsonb, `suspended` bool default false.
**Index on `(user_id, next_due_at)`** — this is the review-queue query.

`card_reviews` — `id` uuid PK, `card_id` FK cascade, `session_id` FK → `focus_sessions` **nullable**, `reviewed_at`, `rating` smallint (FSRS 1–4), `elapsed_ms` int.
Index on `(card_id, reviewed_at DESC)`.

`user_stats` — `insight_balance` (server-written only), `xp`, `level`.

## Existing Codebase Context

- `src/server/services/focus-session.ts` — `endSession()` reads `quiz_multiplier`; this phase writes it
- `src/domain/economy/currency.ts` — Insight award math joins the existing currency module here
- `src/game/systems/juice/play-pitched.ts` — **reuse for the answer-streak pitch ladder**; do not write a second implementation
- `src/app/(app)/study/_components/session-result.tsx` — the post-session screen; the quiz mounts into it
- `src/server/repositories/card.ts` — the only place allowed to query `cards`

## Objective

Build spaced-repetition review with FSRS, and wire the post-session quiz that converts recall into the Insight currency and the session payout multiplier.

Sequenced last of the feature phases because it depends on cards existing (Phase 6) and on the reward vocabulary being established (Phase 5).

## Architecture Decisions

### Decision: `ts-fsrs` behind a narrow domain wrapper
- **Choice:** `src/domain/review/scheduler.ts` exposes exactly two functions. `ts-fsrs` is imported nowhere else.
- **Alternatives considered:** Calling `ts-fsrs` directly from the service; hand-rolling SM-2
- **Rationale:** FSRS-6 needs ~20–30% fewer reviews than SM-2 for the same retention, validated against 500M+ Anki reviews — hand-rolling is strictly worse. Wrapping it keeps the library swappable and gives one place to test the domain's scheduling contract.
- **Tradeoff:** A thin layer of indirection over a library that's already good.

### Decision: FSRS state is a JSONB blob, `next_due_at` is a real column
- **Choice:** The full FSRS card object lives in `cards.fsrs_state`; only `next_due_at` is promoted to an indexed column.
- **Rationale:** The queue query is `WHERE user_id = ? AND next_due_at <= now() ORDER BY next_due_at`. That needs an index. The rest of the FSRS state is never filtered on, so JSONB avoids five columns that would need a migration every time FSRS adds a parameter.
- **Tradeoff:** `fsrs_state` can drift from the library's shape across versions. Phase 9 adds a test that round-trips real `ts-fsrs` objects through the DB.

### Decision: Recall pays Insight; time pays Focus — and never the reverse
- **Choice:** `insight_balance` increases **only** from correct card reviews and quiz results. There is no path from focus minutes to Insight.
- **Rationale:** This is the design's load-bearing idea. Time buys quantity; recall buys quality. It makes genuine studying the only route to the objects players want, without any punishment mechanic.
- **Tradeoff:** A student who studies with the timer but never reviews caps out on cosmetics. That's the intended pressure — and it's pressure toward learning, not away from missing days.

### Decision: The post-session quiz is optional and only ever adds
- **Choice:** After a focus session, the result screen offers a short quiz. Skipping it leaves `quiz_multiplier` at 1.00 and forfeits nothing already earned.
- **Alternatives considered:** Requiring the quiz to release the session payout
- **Rationale:** The no-punishment principle. A bonus you can decline is a bonus; a payout you must earn twice is a tax. Research is consistent that punishment-shaped mechanics drive off exactly the uncommitted users this product exists to hook.
- **Tradeoff:** Some users always skip. The multiplier is sized so that taking it is clearly worth 90 seconds.

### Decision: The multiplier is applied at session end, not retroactively
- **Choice:** The quiz runs **before** `/api/session/end` is called. Its result writes `quiz_multiplier`, then `endSession` computes the payout once.
- **Alternatives considered:** Paying out on end, then topping up after the quiz
- **Rationale:** One transaction, one payout, no top-up path to get wrong. It also puts the quiz before the chest reveal, which is better pacing — earn the multiplier, *then* open the box.
- **Tradeoff:** The result screen has an extra step before the reward moment. Deliberate: it's anticipation, which Phase 5 established as the mechanic.

---

## Implementation Steps

### Step 1: FSRS domain wrapper

**What:** The scheduling contract. Pure, no I/O.

**File(s):** `src/domain/review/scheduler.ts`, `src/domain/review/types.ts`

**Details:**

```ts
import { fsrs, generatorParameters, createEmptyCard, type Card as FsrsCard } from 'ts-fsrs';

export type Rating = 1 | 2 | 3 | 4;   // Again | Hard | Good | Easy

export function initialCardState(nowMs: number): FsrsState;

export function scheduleReview(input: {
  state: FsrsState;
  rating: Rating;
  nowMs: number;
}): { state: FsrsState; nextDueAtMs: number; intervalDays: number };
```

Configure with `generatorParameters({ request_retention: 0.9, enable_fuzz: true })`.

`enable_fuzz` matters more than it looks: it jitters intervals so a batch of cards created together doesn't all come due on the same day forever. Without it, a student who uploads one lecture gets a 200-card wall three weeks later and stops reviewing.

`nowMs` is a **parameter**, not `Date.now()` inside the function. That's what makes the scheduling logic testable across simulated months.

> **ANTI-PATTERN: Hand-rolling SM-2**
> ❌ Don't: implement the ease-factor algorithm from a blog post.
> ✅ Instead: `ts-fsrs`, wrapped.
> 💡 Why: FSRS is a fitted statistical model validated on hundreds of millions of reviews. A hand-rolled SM-2 is more code, worse retention, and no way to know it's wrong.

> **ANTI-PATTERN: `Date.now()` inside domain logic**
> ❌ Don't: read the clock inside `scheduleReview`.
> ✅ Instead: take `nowMs` as an argument.
> 💡 Why: you cannot test "this card comes due in 6 days" against a function that reads the wall clock.

---

### Step 2: Queue selection

**What:** Decide which cards to show and in what order. Pure.

**File(s):** `src/domain/review/queue.ts`, `src/domain/review/constants.ts`

**Details:**

```ts
export const MAX_NEW_CARDS_PER_DAY = 20;
export const MAX_REVIEWS_PER_SESSION = 60;
export const QUIZ_CARD_COUNT = 8;
export const QUIZ_PASS_THRESHOLD = 0.75;
export const MAX_QUIZ_MULTIPLIER = 2.0;

export function selectQueue(input: {
  due: CardSummary[];
  newCards: CardSummary[];
  newCardsSeenToday: number;
  nowMs: number;
}): CardSummary[];

export function selectQuizCards(input: {
  candidates: CardSummary[];
  count: number;
  seed: string;
}): CardSummary[];
```

`selectQueue`: overdue cards first (most overdue leading), then new cards up to the daily cap, then the rest of the due set. Cap the whole thing at `MAX_REVIEWS_PER_SESSION` — an unbounded queue after a week away is how students quit.

`selectQuizCards` is **seeded** so a page refresh mid-quiz doesn't reroll into a different set. Use `createRng` from `src/domain/economy/rng.ts` (Phase 5) rather than adding a second PRNG.

> **ANTI-PATTERN: Unbounded review queues**
> ❌ Don't: return every due card.
> ✅ Instead: cap at 60 per session and 20 new per day.
> 💡 Why: coming back after a week to "347 cards due" is the single most reliable way to make someone abandon spaced repetition.

---

### Step 3: Insight award math

**What:** Extend the economy module. Pure.

**File(s):** `src/domain/economy/insight.ts`, and add constants to `src/domain/economy/constants.ts`

**Details:**

```ts
export const INSIGHT_PER_CORRECT = 3;
export const INSIGHT_HARD_BONUS = 2;      // cards rated 'hard' that you still got right
export const INSIGHT_STREAK_BONUS_AT = 5; // consecutive correct

export function calculateReviewInsight(input: {
  rating: Rating;
  difficulty: 'easy' | 'medium' | 'hard';
  consecutiveCorrect: number;
}): number;

export function calculateQuizMultiplier(input: {
  correct: number;
  total: number;
}): number;   // 1.0 → MAX_QUIZ_MULTIPLIER, ramped above the pass threshold
```

`calculateQuizMultiplier` returns 1.0 below `QUIZ_PASS_THRESHOLD` and ramps linearly to `MAX_QUIZ_MULTIPLIER` at 100%. **Never below 1.0** — a bad quiz must not reduce what was already earned.

Rating 1 (Again) pays zero Insight. It does not pay *negative*, and it does not deduct.

> **ANTI-PATTERN: A multiplier that can go below 1.0**
> ❌ Don't: `multiplier = correct / total`.
> ✅ Instead: clamp the floor to 1.0.
> 💡 Why: a student who tries the optional quiz and does badly must never end up worse off than one who skipped it. That single rule is what keeps the quiz feeling safe to attempt.

---

### Step 4: Review service

**What:** Orchestration — queue, answer, quiz.

**File(s):** `src/server/services/review.ts`

**Details:**

```ts
export async function getReviewQueue(userId: string): Promise<QueuedCard[]>;
export async function submitAnswer(input: {
  userId: string; cardId: string; rating: Rating;
  elapsedMs: number; sessionId?: string;
}): Promise<AnswerResult>;
export async function getSessionQuiz(input: { userId: string; sessionId: string }): Promise<QuizCard[]>;
export async function submitSessionQuiz(input: {
  userId: string; sessionId: string;
  answers: Array<{ cardId: string; correct: boolean }>;
}): Promise<{ multiplier: number; insightAwarded: number; correct: number; total: number }>;
```

`submitAnswer`, in **one transaction**:
1. Load the card; `NOT_FOUND` if missing or not owned
2. `scheduleReview({ state, rating, nowMs })`
3. Update `fsrs_state` and `next_due_at`
4. Insert `card_reviews`
5. Compute `consecutiveCorrect` from the recent review history
6. `calculateReviewInsight` → `incrementBalances(tx, userId, { insight, xp })`
7. Return the new interval so the UI can show "next in 4 days"

`getSessionQuiz` draws from cards the user has seen at least once, seeded by the session's id. If the user has fewer than `QUIZ_CARD_COUNT` eligible cards, return what exists — and if there are zero, return an empty array so the UI skips the quiz entirely rather than showing an empty one.

`submitSessionQuiz`:
1. Verify the session is `active` and owned by the user; `INVALID_STATE` otherwise
2. **Verify `quiz_multiplier` is still 1.00** — a session's quiz can only be submitted once
3. `calculateQuizMultiplier` → write `quiz_multiplier`
4. Award Insight for correct answers
5. Insert `card_reviews` rows with `session_id` set — this is what links recall to a focus session

> **ANTI-PATTERN: Trusting the client's correctness judgment**
> ❌ Don't: accept `{ correct: true }` at face value for a multiple-choice quiz.
> ✅ Instead: the server generated the options and knows the right answer — grade server-side by option index.
> 💡 Why: the whole quiz exists to gate a payout multiplier. A client-graded gate is not a gate.

> **ANTI-PATTERN: Re-submittable quizzes**
> ❌ Don't: let `submitSessionQuiz` run twice for one session.
> ✅ Instead: guard on `quiz_multiplier === 1.00`.
> 💡 Why: otherwise a retry loop farms Insight from one session indefinitely.

---

### Step 5: API routes

**File(s):**
- `src/app/api/review/queue/route.ts` — `GET`
- `src/app/api/review/answer/route.ts` — `POST`
- `src/app/api/review/session-quiz/route.ts` — `GET` (fetch), `POST` (submit)
- `src/app/api/review/stats/route.ts` — `GET` retention, streak, due-count

**Details:**

Standard shape: `handleRoute()` wrapper, auth from `await auth()`, Zod-parse the body, delegate to the service.

**The quiz `GET` must not include the correct answer.** Send question text plus shuffled options; the server holds the key. Sending the answer to the client and asking it not to look is not a design.

---

### Step 6: Review UI

**What:** The card review flow.

**File(s):**
- `src/app/(app)/review/page.tsx` — Server Component; fetches queue and stats
- `src/app/(app)/review/_components/review-session.tsx` — `'use client'`, the flow controller
- `src/app/(app)/review/_components/flashcard.tsx` — flip animation, question → answer
- `src/app/(app)/review/_components/rating-buttons.tsx` — Again / Hard / Good / Easy
- `src/app/(app)/review/_components/review-complete.tsx` — summary

**Details:**

The loop: show question → user recalls → click "Show answer" → card flips → rate 1–4 → next card.

**Keyboard is the primary interface.** Space to reveal, 1–4 to rate. Serious users review hundreds of cards and will not click through it. Show the shortcuts on screen — discoverable, not hidden.

Each rating button shows its projected interval ("Good — 4 days"). This is the single highest-value affordance in a spaced-repetition UI: it makes the algorithm legible instead of arbitrary.

**Show the `source_quote`** on the answer side, as in Phase 6. Same trust reasoning.

**Juice, reusing Phase 5's primitives** — do not write new ones:
- `playPitched` on each consecutive correct answer, climbing one semitone (capped at 12)
- `useSpringPop` on the Insight counter when it increments
- Card flip is a CSS 3D transform, ~250ms
- Everything no-ops under `prefers-reduced-motion` because the primitives already do

Empty state: "No cards due — nice work. Upload notes to build your deck." with a link to `/notes`.

> **ANTI-PATTERN: Rewriting the juice primitives**
> ❌ Don't: hand-roll a pitch ladder or a pop animation in the review UI.
> ✅ Instead: import from `src/game/systems/juice/`.
> 💡 Why: the review screen must feel like the same product as the island. Two implementations means two feels, and users notice without being able to name it.

> **ANTI-PATTERN: Optimistic Insight updates**
> ❌ Don't: increment the displayed balance on click.
> ✅ Instead: show the server's number after the answer resolves.
> 💡 Why: same rule as Phase 3's placement — visuals can be optimistic, money cannot.

---

### Step 7: Post-session quiz

**What:** The loop-closer. Mounts into the Phase 2 result screen.

**File(s):**
- `src/app/(app)/study/_components/session-quiz.tsx`
- `src/app/(app)/study/_components/quiz-result.tsx`

**Details:**

Ordering on the result screen is the design:
1. Session ends → credited time and Focus shown
2. **Quiz offered** — "Answer 8 questions to double your rewards" with a visible Skip
3. Quiz runs — 8 multiple-choice questions, 4 options each, from cards the user has seen
4. Result — score, multiplier earned, Insight awarded
5. **Then** `/api/session/end` fires, and the Phase 5 chest sequence plays with the multiplier applied

Skipping jumps straight to step 5 with `quiz_multiplier = 1.00`.

Distractor options come from other cards' answers in the same deck — plausible, and free. Shuffle with the session-seeded RNG so a refresh doesn't reroll.

Show the multiplier building live as answers land ("×1.4"). Watching the number climb is the reward loop in miniature.

> **ANTI-PATTERN: A forced quiz**
> ❌ Don't: block the session payout until the quiz is done.
> ✅ Instead: make Skip a visible, first-class option.
> 💡 Why: no-punishment principle. A student too tired to quiz should still get their Focus, or they stop starting sessions at all.

---

### Step 8: Wire the multiplier into session end

**What:** Connect Phase 2's payout to Phase 7's quiz.

**File(s):** `src/server/services/focus-session.ts` (verify, likely no change)

**Details:**

`endSession` already reads `session.quiz_multiplier` and passes it to `calculateFocusAward`. This step is mostly **verification** that the wiring works now that the value can be something other than 1.00:

- A quiz taken before `end` → the multiplier applies to the Focus award
- A quiz submitted after `end` → rejected with `INVALID_STATE` (the session isn't `active`)
- The daily cap in `applyDailyCap` is applied to **credited milliseconds**, before the multiplier — otherwise a 2× multiplier doubles past the 8-hour guardrail, which defeats the guardrail's purpose

That last point is the one to check carefully. Cap time, then multiply the award.

---

### Step 9: Review stats

**What:** Make progress legible.

**File(s):** `src/app/(app)/review/_components/review-stats.tsx`, `src/server/services/review-stats.ts`

**Details:**

- Cards due today, cards reviewed today
- Retention rate — proportion of reviews rated 3–4 over the last 30 days
- A forecast: how many cards come due each of the next 7 days
- Total cards, split new / learning / mature (interval ≥ 21 days)

The 7-day forecast is worth the effort. It's the thing that makes a student review 20 cards today to avoid 80 on Thursday — self-regulation the app doesn't have to enforce.

---

## State Management for This Phase

| State | Category | Location | Source of truth | Persistence |
|---|---|---|---|---|
| Review queue | Server data | TanStack Query, fetched once per session | Postgres `cards` | DB |
| Current card index | Ephemeral UI | `useState` in `review-session.tsx` | Client | None — queue refetches on reload |
| Card revealed / hidden | Ephemeral UI | `useState` | Client | None |
| Consecutive-correct counter | Ephemeral UI | `useState` (display); server recomputes for awards | Client for the pitch ladder | None |
| Insight balance | Server data | TanStack Query, invalidated after each answer | Postgres `user_stats` | DB |
| Quiz questions | Server data | Fetched once, seeded by session id | Server-generated | Stable across refresh via seed |
| Quiz answers so far | Ephemeral UI | `useState` | Client | None — a refresh restarts the quiz |
| `quiz_multiplier` | Server data | Written once by `submitSessionQuiz` | Postgres `focus_sessions` | DB, single-write |

## Error Handling

| Operation | Failure mode | User-facing behavior | Recovery strategy |
|---|---|---|---|
| Load queue | No cards exist | Empty state linking to `/notes` | Not an error |
| Load queue | No cards due | "You're caught up" + next-due date | Not an error — this is success |
| Submit answer | Network failure | Card stays, retry button, no progress lost | Retry with backoff; queue position is client-side |
| Submit answer | Card deleted mid-review | Skip to the next card silently | `NOT_FOUND` → drop from the local queue |
| Submit answer | Not owned by user | 404 | Ownership checked in the service |
| Fetch quiz | Fewer than 8 eligible cards | Run with what exists | Return the shorter set |
| Fetch quiz | Zero eligible cards | Skip the quiz entirely, no UI shown | Empty array → result screen proceeds |
| Submit quiz | Session already ended | "Session already completed" | `INVALID_STATE`; result screen still shows the payout |
| Submit quiz | Already submitted | Show the existing result | Guard on `quiz_multiplier !== 1.00` |
| Submit quiz | Network failure | Retry; Skip remains available | Skipping forfeits only the bonus |
| FSRS | Corrupt `fsrs_state` JSON | Reset that card to a fresh state, log it | Never crash the queue over one bad row |

## Testing Requirements for This Phase

- [ ] `initialCardState` produces a card due immediately
- [ ] `scheduleReview` with rating 1 (Again) shortens the interval
- [ ] `scheduleReview` with rating 4 (Easy) lengthens it more than rating 3 (Good)
- [ ] Repeated Good ratings produce monotonically increasing intervals
- [ ] `scheduleReview` is deterministic given the same `nowMs` (with fuzz seeded)
- [ ] `selectQueue` puts the most overdue card first
- [ ] `selectQueue` caps new cards at `MAX_NEW_CARDS_PER_DAY`
- [ ] `selectQueue` caps the total at `MAX_REVIEWS_PER_SESSION`
- [ ] `selectQuizCards` returns the same set for the same seed
- [ ] `calculateReviewInsight` pays zero for rating 1 and never negative
- [ ] `calculateQuizMultiplier` returns exactly 1.0 below the pass threshold
- [ ] **`calculateQuizMultiplier` never returns below 1.0** ← the no-punishment rule
- [ ] `calculateQuizMultiplier` reaches `MAX_QUIZ_MULTIPLIER` at 100%
- [ ] `submitAnswer` updates FSRS state and inserts a review row atomically
- [ ] `submitAnswer` on another user's card throws `NOT_FOUND`
- [ ] **`submitSessionQuiz` twice for one session is rejected**
- [ ] `submitSessionQuiz` on a completed session throws `INVALID_STATE`
- [ ] **The daily cap is applied to credited time before the multiplier** ← guardrail integrity
- [ ] `GET /api/review/session-quiz` response contains no correct-answer field
- [ ] A corrupt `fsrs_state` row resets rather than crashing the queue
- [ ] An FSRS card object round-trips through JSONB storage unchanged

**Test type guidance:**
- `src/domain/review/` and `src/domain/economy/insight.ts` → **unit tests**, exhaustive. Simulate 90 days of reviews and assert intervals grow. Highest value in the phase.
- Service tests including double-submit and the cap-before-multiply ordering → **integration against a real Postgres**.
- Review UI → **RTL**: "pressing Space reveals the answer", "pressing 3 rates Good and advances".
- **Test the answer-leak explicitly** — assert the quiz response body has no correct-answer key. It's the kind of thing a refactor reintroduces silently.

## Acceptance Criteria

- [ ] `/review` shows cards due now, most overdue first
- [ ] Space reveals the answer; 1–4 rate and advance
- [ ] Each rating button shows its projected interval
- [ ] The answer side shows the card's source quote
- [ ] Rating a card updates `next_due_at` per FSRS and awards Insight
- [ ] Consecutive correct answers play an ascending pitch ladder
- [ ] The Insight balance updates in the HUD without a refresh
- [ ] Reviewing every due card shows a completion summary
- [ ] The stats panel shows retention and a 7-day forecast
- [ ] Ending a focus session offers an 8-question quiz with a visible Skip
- [ ] The multiplier climbs visibly as correct answers land
- [ ] Skipping goes straight to the reward with `quiz_multiplier = 1.00`
- [ ] A passed quiz increases the Focus payout and awards Insight
- [ ] A failed quiz still pays the base Focus — **never less than skipping**
- [ ] The quiz cannot be submitted twice
- [ ] The quiz API response never contains the correct answer
- [ ] Insight can be spent on premium island assets that Focus cannot buy
- [ ] Under `prefers-reduced-motion`, the review flow works with no animation

**Verification commands:**
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

**Answer-leak check:** open DevTools Network, start a session quiz, and inspect the `GET /api/review/session-quiz` response. It must contain question text and options and **no** field identifying the correct one.

**Cap-before-multiply check:** with a user near the 8-hour daily cap, complete a session and pass the quiz. The credited time must still clamp at the cap; only the resulting award is multiplied.

**Smoke test:** Upload notes at `/notes` and let cards generate. Go to `/review` — cards appear with keyboard hints. Press Space, then 3. The card schedules forward and Insight increases. Get five right in a row and hear the pitch climb. Finish the queue and see the summary with a 7-day forecast. Now run a focus session on `/study`; at the end, take the quiz, watch the multiplier climb to ~×1.6, and see the chest sequence play with the boosted payout. Go to `/island` and buy something that requires Insight — it should have been unaffordable before reviewing.

## Handoff to Next Phase

**Phase 7 closes the loop.** The full product works: upload your own notes → AI generates verified flashcards → study with a focus timer → review cards to earn Insight → take the post-session quiz to multiply your payout → spend both currencies building a living 3D island.

Delivered: `src/domain/review/scheduler.ts` wraps `ts-fsrs` (FSRS-6, 0.9 target retention, fuzz enabled) behind two pure functions that take `nowMs` as a parameter. `queue.ts` bounds the queue at 60 per session and 20 new per day and seeds quiz selection from the Phase 5 RNG. `insight.ts` pays Insight only for recall and clamps the quiz multiplier's floor to 1.0. `submitAnswer` and `submitSessionQuiz` are transactional and single-write. `/review` is a keyboard-first flow reusing Phase 5's juice primitives, showing projected intervals and source quotes. The post-session quiz is optional, server-graded, and sets `quiz_multiplier` before `endSession` computes the payout — with the daily cap applied to time before the multiplier applies to the award.

**Codebase state:** feature-complete. What remains is polish (Phase 8) and the test suite (Phase 9).

**Known shortcuts taken:**
- No card suspension/burying UI, though the `suspended` column exists
- No manual deck organization — tags are stored and unused for filtering
- Quiz distractors come from other cards' answers, which occasionally produces an implausible option. Acceptable; better distractor generation is an LLM call per quiz and not worth it yet.
- FSRS parameters are the library defaults. Per-user optimization needs hundreds of reviews of history; revisit once real data exists.
- The consecutive-correct counter for the pitch ladder is client-side; the server recomputes independently for awards. Two sources, but only one is authoritative for money.

**Phase 8 should start with** the error and loading states, since they're the most-missed surfaces and touch every route. Then the perf budget and reduced-motion audit.

**Open questions for next phase:**
- Whether to expose FSRS's target retention as a user setting. Anki does; it confuses most users. Recommendation: leave it at 0.9 and revisit if power users ask.
- Whether cards should be shareable between users (deck import/export). It changes the data model meaningfully — separate plan, not a Phase 8 item.
