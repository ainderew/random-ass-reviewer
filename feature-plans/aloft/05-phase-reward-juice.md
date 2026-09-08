# Phase 5: Reward & Juice

> **Feature:** Aloft — 3D Study Game
> **Phase:** 5 of 9
> **Depends on:** `02-phase-focus-session-engine.md`, `03-phase-3d-world-foundation.md`, `04-phase-aliveness.md`
> **Estimated scope:** Medium–Large (3–4 hours)

## Context from Previous Phase

**What Aloft is:** a web app that turns studying into a game. Students run verified focus sessions; verified minutes pay **Focus ⚡** and correct recall pays **Insight 💎**. Both are spent building a persistent 3D floating island. Target users are students, board-exam takers, and grad students who want to study but can't hold focus.

**Phase 1** built the skeleton: Next.js 15 App Router, React 19, TypeScript strict, Tailwind, Drizzle + Neon Postgres, Auth.js v5. ESLint enforces `domain` imports nothing and **`game` may never import `server`**.

**Phase 2** built the server-authoritative focus session engine:
- `/api/session/{start,beat,end,active}` — server owns the clock; the client never sends timestamps
- `src/server/services/focus-session.ts` — `endSession()` computes credited time, applies daily caps, and awards Focus + XP in **one transaction**
- `src/domain/economy/currency.ts` — `calculateFocusAward`, `applyDailyCap`
- `src/domain/economy/xp.ts` — `xpForLevel(n) = 100 * n^1.5`
- `src/app/(app)/study/_components/session-result.tsx` — the post-session summary, built with **a deliberate empty slot where the chest reveal mounts**
- `focus_sessions.loot_seed` — a UUID generated server-side at session start, **stored and still unused**. This phase consumes it.
- `focus_sessions.quiz_multiplier` — numeric, always 1.00 so far. Phase 7 sets it.

**Phase 3** built the 3D island:
- `src/game/assets/manifest.generated.ts` — `ASSET_MANIFEST` + the `AssetId` union type; every asset id is compile-time checked
- `src/domain/island/grid.ts` — grid math shared by client and server
- `src/game/entities/placed-props.tsx` — one `InstancedMesh` per asset type
- `src/server/services/island.ts` — server-authoritative placement with transactional currency debit
- Draw-call budget: **under 100**, with a dev overlay reading `gl.info.render.calls`

**Phase 4** made the world alive:
- `src/game/systems/world-state.ts` — mutable `worldState` with `elapsed`, `windPhase`, `sunAltitude`, `dayFactor`, `reducedMotion`
- `src/game/systems/world-clock.tsx` — the single `useFrame` that advances it
- Day/night from the user's real timezone; staggered emissive ignition at dusk
- Vertex-shader wind; instanced wandering scholars; GPU particles; positional audio (muted by default, `localStorage` preference)
- `src/game/systems/camera-controller.tsx` — orbit controls plus idle drift, driven via `controls.setAzimuthalAngle()`
- `src/game/entities/placement-reveal.tsx` — placements younger than 8 seconds spring in with a dust puff
- **Every animated system checks `worldState.reducedMotion`.** This phase must too.

**Database tables relevant to this phase** (migrated in Phase 1):

`caches` — `id` uuid PK, `user_id`, `session_id` FK **unique** (one cache per session), `rarity` enum `('common','uncommon','rare','epic')`, `contents` jsonb `{ assetIds, focus, insight }`, `opened_at` timestamptz nullable.

`user_stats` — `focus_balance`, `insight_balance`, `xp`, `level`, `streak_days`, `streak_freezes` (default 2), `last_session_date` date, **`pity_counter` int default 0** — caches opened since the last rare. Unused so far.

## Existing Codebase Context

- `src/server/services/focus-session.ts` — `endSession()` is where cache generation hooks in, inside the existing transaction
- `src/app/(app)/study/_components/session-result.tsx` — the reveal mounts into its reserved slot
- `src/domain/economy/` — loot and streak modules join the existing currency and XP modules here
- `src/game/entities/placement-reveal.tsx` — the spring/overshoot vocabulary to match, so reward animations feel like one family
- `src/game/systems/world-state.ts` — read `reducedMotion` from here, do not re-query `matchMedia`

## Objective

Build the reward layer: server-rolled loot with a pity timer, a chest-opening sequence with real anticipation, streaks with forgiveness built in, and the moment-to-moment feedback juice that makes every interaction feel good.

Sequenced last of the game phases because it depends on the economy (Phase 2), the world to place rewards into (Phase 3), and a living backdrop to reveal them against (Phase 4).

**End of this phase is first playable.** The complete loop works: study → verified time → currency + loot → build → a world that visibly grew.

## The dopamine architecture — read this before implementing

| Mechanic | Schedule | Why |
|---|---|---|
| Focus per minute | **Fixed — always paid** | Reliability is what builds a habit. **Never randomize the base reward.** |
| Session-end cache | **Variable ratio** — roughly 1 in 12 is exciting | Variable-ratio reinforcement produces the most extinction-resistant behavior of any schedule |
| Pity timer | Guaranteed rare within N caches | More ethical *and* better retention — rarity droughts are a top churn cause |
| Streak | Free freeze, 2 per month, auto-applied | Streak anxiety is a documented churn driver |
| XP / level | Shallow early curve | Early-level velocity is the strongest onboarding retention lever available |

**Deliberately excluded — these are the actual gambling dark patterns:**

- ❌ **No fake near-miss animations.** The reel must not "almost" land on epic. This is directly linked to compulsive behavior in the loot-box literature, and it is the single most important thing on this list to get right.
- ❌ **No real-money purchase of caches.** With a student and minor userbase this is a legal line, not a preference.
- ❌ **No loss of earned progress, ever.** No decay, no expiry, no punishment for missed days.

**Guardrails that ship as features:**
- The 8h daily creditable cap from Phase 2 already prevents rewarding self-destructive cramming
- The 50-minute break prompt from Phase 2 stays
- A weekly honest summary — "you studied X hours" — including a gentle note if hours spike unhealthily

## Architecture Decisions

### Decision: Loot is rolled server-side from the stored seed, deterministically
- **Choice:** `endSession` rolls the cache using a seeded PRNG initialized from `focus_sessions.loot_seed`, inside the same transaction that awards currency.
- **Alternatives considered:** Rolling client-side; rolling lazily when the chest is opened
- **Rationale:** The seed was generated at session *start*, before the user knew anything about the outcome, so the result is fixed before it can be gamed. Deterministic rolling also means a re-request returns the same cache — idempotency for free.
- **Tradeoff:** Loot tables cannot be retuned retroactively for already-rolled caches. Correct — a user's earned reward should not change under them.

### Decision: The pity counter is a real column, not a computed heuristic
- **Choice:** `user_stats.pity_counter` increments per cache and resets to 0 on any rare-or-better roll. At `PITY_THRESHOLD`, the next roll is guaranteed rare.
- **Alternatives considered:** Computing drought length from cache history at roll time
- **Rationale:** A single integer read is trivially cheap, and it makes the guarantee auditable and testable. Deriving it from history is an N-row scan for a value that must be exactly right.
- **Tradeoff:** Another column to keep consistent — mitigated by only ever writing it inside the roll transaction.

### Decision: Two-stage reveal — 2D immediately, 3D on next island visit
- **Choice:** The chest opens on the `/study` result screen in 2D (no canvas load, no navigation). The won item then appears on the island with the Phase 4 reveal animation the next time the user visits.
- **Alternatives considered:** Redirecting to `/island` for a fully 3D opening
- **Rationale:** Immediacy matters more than fidelity at the moment of reward — a 3-second canvas load between finishing studying and getting paid is the worst possible place for latency. Splitting it yields **two** dopamine hits from one drop.
- **Tradeoff:** The reveal is a 2D animation rather than a 3D set piece. Compensated with strong motion design and audio.

### Decision: Juice primitives are shared, framework-agnostic hooks
- **Choice:** `useHitStop`, `useScreenShake`, `useSpringPop`, and a `playPitched()` audio helper live in `src/game/systems/juice/` and work in both 2D React and R3F contexts.
- **Rationale:** The reward vocabulary must feel identical whether it fires on the 2D result screen or in the 3D scene. Two implementations guarantees two different feels.
- **Tradeoff:** Slightly more abstract than inlining animations. Worth it — consistency of feel is what makes a game read as polished.

---

## Implementation Steps

### Step 1: Seeded RNG

**What:** Deterministic randomness the server controls.

**File(s):** `src/domain/economy/rng.ts`

**Details:**

```ts
export function createRng(seed: string): { next(): number; pick<T>(items: readonly T[]): T; weighted<T>(entries: ReadonlyArray<{ item: T; weight: number }>): T };
```

Use a small, well-understood PRNG — `mulberry32` seeded from a hash of the seed string. **Do not use `Math.random()`** anywhere in the loot path; it is unseedable and makes every roll untestable and non-reproducible.

> **ANTI-PATTERN: `Math.random()` in the reward path**
> ❌ Don't: `if (Math.random() < 0.05) rarity = 'epic'`.
> ✅ Instead: `createRng(session.lootSeed).weighted(RARITY_TABLE)`.
> 💡 Why: seeded RNG makes loot tests deterministic and makes a repeated request return the same cache instead of rerolling.

---

### Step 2: Loot tables and the pity timer

**What:** What's in the chest, and the guarantee that prevents droughts.

**File(s):** `src/domain/economy/loot.ts`, `src/domain/economy/loot-tables.ts`

**Details:**

```ts
// loot-tables.ts
export const RARITY_WEIGHTS = [
  { item: 'common', weight: 62 },
  { item: 'uncommon', weight: 27 },
  { item: 'rare', weight: 9 },
  { item: 'epic', weight: 2 },
] as const;

export const PITY_THRESHOLD = 12;   // guaranteed rare+ within 12 caches
export const MIN_MS_FOR_CACHE = 15 * 60 * 1000;  // no cache under 15 minutes
```

```ts
// loot.ts
export function rollCache(input: {
  seed: string;
  creditedMs: number;
  pityCounter: number;
  ownedAssetIds: ReadonlyArray<AssetId>;
}): { rarity: Rarity; contents: CacheContents; nextPityCounter: number } | null;
```

Rules:
1. Return `null` below `MIN_MS_FOR_CACHE` — no cache, and this is **not** an error
2. If `pityCounter >= PITY_THRESHOLD`, force rarity to at least `rare`
3. Otherwise roll `RARITY_WEIGHTS`
4. Longer sessions shift the weights modestly toward better rarity — cap the bonus so a marathon session can't be farmed
5. **Prefer unowned assets** when picking cosmetic contents; fall back to a currency bundle when the user owns everything at that rarity
6. `nextPityCounter` = 0 if rarity is rare or better, else `pityCounter + 1`

Every cache also contains a small currency bonus so a common cache is never *nothing*. "You opened it and got nothing" is the worst possible outcome and must be structurally impossible.

> **ANTI-PATTERN: Duplicate drops with no fallback**
> ❌ Don't: award an asset the user already owns and call it done.
> ✅ Instead: filter to unowned first; fall back to a currency bundle.
> 💡 Why: a duplicate reads as a failed roll. In a game with no trading or dust system, it is pure disappointment.

> **ANTI-PATTERN: Rarity that scales without a ceiling**
> ❌ Don't: `epicWeight = 2 + creditedMinutes / 10`.
> ✅ Instead: cap the session-length bonus.
> 💡 Why: uncapped scaling rewards single marathon sessions over consistent daily study — the exact opposite of the behavior this product exists to build.

---

### Step 3: Streaks with forgiveness

**What:** Daily-return pressure without the anxiety that causes churn.

**File(s):** `src/domain/economy/streak.ts`

**Details:**

```ts
export function updateStreak(input: {
  lastSessionDate: string | null;   // YYYY-MM-DD in the user's timezone
  todayDate: string;
  currentStreak: number;
  freezesRemaining: number;
}): { streak: number; freezesRemaining: number; freezeUsed: boolean; milestone: number | null };
```

Rules:
- Same day → no change
- Consecutive day → `streak + 1`
- Exactly one day missed **and** a freeze is available → freeze is consumed **automatically**, streak preserved
- Otherwise → streak resets to 1 (not 0 — today counts)
- Freezes refill to 2 at the start of each calendar month
- `milestone` is non-null at 3, 7, 14, 30, 60, 100 days

**Dates are computed in the user's timezone**, not UTC. A student in Manila studying at 1am must not lose a streak to a server in UTC.

**Freezes are automatic and silent-until-after.** Do not prompt "use a freeze?" — that turns a moment of relief into a decision under stress. Tell them afterward: "Streak freeze used — you're still on 12 days. 1 freeze left this month."

> **ANTI-PATTERN: UTC date math for user-facing streaks**
> ❌ Don't: `new Date().toISOString().slice(0, 10)`.
> ✅ Instead: format in the user's stored timezone with `date-fns-tz`.
> 💡 Why: for a user in UTC+8, a UTC-based "today" rolls over at 8am local — losing streaks mid-morning, which is the most infuriating possible bug.

---

### Step 4: Wire loot and streaks into session end

**What:** Extend the existing transaction. Do not create a second one.

**File(s):** `src/server/services/focus-session.ts` (extend), `src/server/repositories/cache.ts` (new)

**Details:**

Inside the existing `endSession` transaction, after the currency award:
1. `updateStreak(...)` using the user's timezone → write `streak_days`, `streak_freezes`, `last_session_date`
2. `rollCache({ seed: session.lootSeed, creditedMs, pityCounter, ownedAssetIds })`
3. If non-null → insert into `caches` (unopened) and write `nextPityCounter`
4. Return an extended `SessionResult`:
   ```ts
   {
     creditedMs, focusAwarded, xpAwarded, leveledUp: boolean,
     streak: { days, freezeUsed, milestone },
     cache: { id, rarity } | null,   // rarity revealed only on open
     cappedByDailyLimit: boolean,
   }
   ```

**`contents` is not returned here.** The result says a cache exists and nothing more. Contents come from `POST /api/cache/:id/open`. Anticipation is the mechanic — leaking the payload to devtools before the animation plays destroys it.

> **ANTI-PATTERN: A second transaction for loot**
> ❌ Don't: end the session, then open a new transaction to insert the cache.
> ✅ Instead: one transaction covering currency, streak, and cache.
> 💡 Why: Atomicity. A crash between them leaves a user credited with no cache, or a cache with no credit.

> **ANTI-PATTERN: Returning cache contents with the session result**
> ❌ Don't: include `contents` in the `endSession` response.
> ✅ Instead: return only `{ id, rarity: undefined }`; reveal on open.
> 💡 Why: anyone with the Network tab open sees the prize before the animation. The anticipation *is* the reward.

---

### Step 5: Cache open endpoint

**What:** Server-authoritative reveal.

**File(s):** `src/app/api/cache/[id]/open/route.ts`, `src/server/services/cache.ts`

**Details:**

`openCache({ userId, cacheId })`:
1. Load; `NOT_FOUND` if missing or not owned
2. If `opened_at` is already set, return the same contents — **idempotent**, so a double-click or retry never double-credits
3. Set `opened_at`, credit any currency in `contents`, grant asset ids to the user's inventory
4. Return `{ rarity, contents }`

Asset ownership is derivable from opened caches plus starter assets. A dedicated inventory table is not needed yet — a `getOwnedAssetIds(userId)` repository function that unions starter assets with opened-cache contents is sufficient and avoids a table that would need backfilling.

> **ANTI-PATTERN: Non-idempotent reward endpoints**
> ❌ Don't: unconditionally credit contents on every call.
> ✅ Instead: check `opened_at` and return the same result.
> 💡 Why: network retries and double-clicks are normal. A non-idempotent reward endpoint is a currency duplication bug waiting to happen.

---

### Step 6: Juice primitives

**What:** The shared feedback vocabulary.

**File(s):**
- `src/game/systems/juice/use-hit-stop.ts`
- `src/game/systems/juice/use-screen-shake.ts`
- `src/game/systems/juice/use-spring-pop.ts`
- `src/game/systems/juice/play-pitched.ts`
- `src/game/systems/juice/constants.ts`

**Details:**

**Hit-stop** — freeze everything for 50–120ms before a reward resolves. The cheapest weight you will ever add to an interface. Implement by setting a `frozen` flag on `worldState` that `useFrame` consumers respect, plus a CSS `animation-play-state: paused` toggle for 2D.

**Screen shake** — 0.1–0.3s, directional, **exponential decay**. Linear decay reads as a wobble; exponential reads as an impact.
```ts
const shake = amplitude * Math.exp(-decay * t) * Math.sin(t * frequency);
```
In 2D, apply as a CSS transform on a wrapper. In 3D, offset the camera *after* `OrbitControls` updates, so the two don't fight.

**Spring pop** — scale from 0 with overshoot for anything appearing. Match the curve already used by `placement-reveal.tsx` so the vocabulary is one family.

**Pitched audio** — each consecutive success plays one semitone higher:
```ts
playPitched(buffer, { semitones: Math.min(streakIndex, 12) });
```
Set `playbackRate = 2 ** (semitones / 12)`. Nearly free, disproportionately effective, and Phase 7's flashcard streaks reuse it directly.

**Every primitive checks `worldState.reducedMotion` and no-ops.** Screen shake in particular is a genuine accessibility and nausea concern.

> **ANTI-PATTERN: Bespoke animation per feature**
> ❌ Don't: hand-write a different pop animation for the chest, the level-up, and the currency badge.
> ✅ Instead: one `useSpringPop` with tunable params.
> 💡 Why: inconsistent motion is the clearest possible signal of an unpolished product, and users feel it without being able to name it.

---

### Step 7: The chest reveal sequence

**What:** The centerpiece. This single interaction carries the product's whole reward promise.

**File(s):**
- `src/app/(app)/study/_components/cache-reveal.tsx` — mounts into the Phase 2 result-screen slot
- `src/app/(app)/study/_components/rarity-burst.tsx`

**Details:**

The sequence, in order — **the timing is the design**:

| t (ms) | Beat |
|---|---|
| 0 | Chest appears with a spring pop. Result screen dims. Ambient audio ducks. |
| 300 | **Wobble 1** — small rotation, low thud |
| 700 | **Wobble 2** — larger, faster, higher pitch |
| 1000 | **Wobble 3** — largest, fastest, higher still. Light builds under the lid. |
| 1250 | **Hit-stop, 100ms.** Everything freezes. |
| 1350 | Burst — particles, screen shake scaled by rarity, light flash |
| 1500 | **Stage 1:** rarity glow color resolves |
| 1750 | **Stage 2:** item silhouette rises out |
| 2000 | **Stage 3:** name and rarity label pop in |
| 2200 | Currency counters tick up with per-digit pops |

Accelerating wobbles are the entire anticipation mechanic. Do not shorten this.

**Rarity scaling:** common gets a modest burst and no shake. Epic gets a large burst, screen shake, chromatic aberration, and a distinct fanfare. **Rationing intensity is what makes rare feel rare** — if common already shakes the screen, epic has nowhere to go.

> **ANTI-PATTERN: The fake near-miss**
> ❌ Don't: animate the rarity glow through epic before "settling" on common.
> ✅ Instead: the glow resolves directly to the actual rarity.
> 💡 Why: this is *the* loot-box dark pattern. It is directly linked to compulsive behavior, and this product's users are students and minors. Non-negotiable.

> **ANTI-PATTERN: A skip button that skips the anticipation**
> ❌ Don't: nothing — **do** provide a skip.
> ✅ Instead: clicking during the sequence jumps to the final state instantly.
> 💡 Why: on the 200th cache, a forced 2.2s animation is friction, not delight. Respecting a user's time is what keeps the animation welcome on cache 500.

Under reduced motion: skip straight to the final state with a simple fade.

---

### Step 8: Level-up and milestone moments

**What:** The secondary reward beats.

**File(s):** `src/app/(app)/_components/level-up-toast.tsx`, `src/app/(app)/_components/streak-milestone.tsx`

**Details:**

**Level-up** fires after the cache reveal, never during — two simultaneous celebrations cancel each other out. Full-width banner, spring pop, ascending arpeggio, and a concrete statement of what unlocked. "Level 5" alone means nothing; "Level 5 — Greenhouse unlocked" is a reward.

**Streak milestones** (3, 7, 14, 30, 60, 100) get their own moment with a bonus Insight grant. Milestone rewards are the strongest lever for pushing a user past the first-week cliff.

**Freeze-used notice** is quiet and warm: "Streak freeze used — still going, 12 days. 1 left this month." Never framed as a warning or a near-loss.

---

### Step 9: Post-processing for rare drops

**What:** Reserved visual intensity.

**File(s):** `src/game/scene/post-processing.tsx`

**Details:**

```bash
pnpm add @react-three/postprocessing postprocessing
```

`<EffectComposer>` with `<Bloom>` at a low baseline. On a rare-or-better placement reveal, spike bloom intensity and briefly add chromatic aberration, decaying over ~600ms.

**Keep the baseline subtle.** Permanently heavy bloom looks amateurish and removes the headroom that makes a spike register.

Disable the composer entirely on low-end devices — Phase 8 owns that detection, but structure the component to accept an `enabled` prop now.

---

### Step 10: Weekly honest summary

**What:** The guardrail that ships as a feature.

**File(s):** `src/app/(app)/study/_components/weekly-summary.tsx`, `src/server/services/stats.ts`

**Details:**

On the first visit each week, a small card: hours studied, sessions completed, cards reviewed, best day. Plain and factual.

If the week's hours exceed a healthy threshold (say 45h) or any single day exceeded 10h, add one calm line: "That's a lot of hours — rest is part of learning." No modal, no blocking, no guilt.

This is deliberate. A product engineered around dopamine has an obligation to tell the truth about the behavior it produces, and doing it well is a differentiator rather than a cost.

---

## State Management for This Phase

| State | Category | Location | Source of truth | Persistence |
|---|---|---|---|---|
| Cache existence + id | Server data | `SessionResult` → `useState` on the result screen | Postgres `caches` | DB |
| Cache contents | Server data | TanStack Query mutation on open | Postgres `caches.contents` | DB; idempotent |
| Reveal animation stage | Ephemeral UI | `useState` in `cache-reveal.tsx` | Client | None |
| Hit-stop frozen flag | Per-frame | `worldState.frozen` | Client | None |
| Screen shake amplitude | Per-frame | Ref inside the shake hook | Client | None |
| Streak, freezes | Server data | TanStack Query | Postgres `user_stats` | DB |
| Pity counter | Server data | **Never sent to the client** | Postgres `user_stats.pity_counter` | DB |
| Owned asset ids | Server data | TanStack Query | Derived from opened caches | DB |
| Weekly summary seen | UI preference | `localStorage` keyed by ISO week | Client | Survives refresh |

**`pity_counter` must never reach the client.** Exposing it lets users time their sessions to farm guaranteed rares, which converts a fairness mechanism into an exploit.

## Error Handling

| Operation | Failure mode | User-facing behavior | Recovery strategy |
|---|---|---|---|
| Roll cache | Session under 15 min | No cache; result screen shows currency only | Normal path, **not an error** — never show an error for a short session |
| Roll cache | User owns every asset at that rarity | Currency bundle instead | Fallback inside `rollCache` |
| Open cache | Already opened | Returns the same contents | Idempotent by `opened_at` |
| Open cache | Not owned by user | 404 | Ownership checked in the service |
| Open cache | Network failure | Chest stays closed with a retry button | Cache persists in the DB; openable from `/island` later |
| Cache reveal | User navigates away mid-animation | Cache remains unopened, retrievable | Never mark opened client-side |
| Streak update | Missing/invalid timezone | Fall back to UTC and log | Never crash session end over a timezone |
| Streak update | Clock skew / user changes device timezone | Compute from stored tz, not device tz | Server-side, using `users.timezone` |
| Post-processing | Shader compile failure | Composer disabled, scene renders unaffected | Error boundary around `<EffectComposer>` |
| Screen shake | Reduced motion enabled | No shake | Every primitive checks `worldState.reducedMotion` |

## Testing Requirements for This Phase

- [ ] `createRng` produces identical sequences for identical seeds
- [ ] `createRng` produces different sequences for different seeds
- [ ] `weighted` respects the distribution across 10,000 samples within tolerance
- [ ] `rollCache` returns `null` below 15 minutes credited
- [ ] `rollCache` is deterministic — same inputs, same output, every time
- [ ] `rollCache` forces rare-or-better at `pityCounter >= PITY_THRESHOLD`
- [ ] `nextPityCounter` resets to 0 on rare+, increments otherwise
- [ ] **Across 12 consecutive rolls, at least one is rare or better** ← the pity guarantee
- [ ] `rollCache` never returns an asset already in `ownedAssetIds` while unowned ones remain
- [ ] `rollCache` falls back to currency when everything at that rarity is owned
- [ ] Every cache contains at least some currency — no empty cache is possible
- [ ] `updateStreak` increments on consecutive days
- [ ] `updateStreak` auto-consumes a freeze on exactly one missed day
- [ ] `updateStreak` resets to 1 when two days are missed
- [ ] `updateStreak` resets to 1, never 0
- [ ] `updateStreak` uses the user's timezone — a UTC+8 user studying at 1am local keeps their streak
- [ ] Freezes refill to 2 at month boundaries
- [ ] Milestones fire at exactly 3, 7, 14, 30, 60, 100
- [ ] `endSession` writes currency, streak, and cache in one transaction — a forced failure rolls back all three
- [ ] `endSession` does **not** return cache contents
- [ ] **Opening a cache twice credits currency once** ← idempotency
- [ ] Opening another user's cache returns 404
- [ ] Every juice primitive no-ops under reduced motion

**Test type guidance:**
- `src/domain/economy/{rng,loot,streak}.ts` → **unit tests**, exhaustive. Pure, deterministic, and this is where real-money-equivalent bugs live. Highest-value tests in the whole project.
- The pity guarantee and distribution → **statistical unit tests** over many seeded samples.
- Transaction atomicity and open-idempotency → **integration tests against a real Postgres**. Do not mock — the transaction boundary *is* the thing under test.
- Reveal sequence → **RTL**: assert the final state renders and that clicking skips ahead. Do not assert on intermediate animation frames.
- Reduced-motion no-ops → **unit tests** on each primitive.

## Acceptance Criteria

- [ ] A 45-minute session ends with currency, XP, a streak update, and (usually) a cache
- [ ] A 10-minute session ends with currency and no cache, and shows no error
- [ ] The chest wobbles three times with accelerating tempo and rising pitch before opening
- [ ] There is a perceptible freeze right before the burst
- [ ] Rarity reveals in three stages: glow → silhouette → name
- [ ] The rarity glow **never** passes through a higher rarity before settling
- [ ] Common produces a modest burst; epic produces shake, heavy bloom, and a distinct fanfare
- [ ] Clicking during the sequence skips to the final state immediately
- [ ] Won items appear on the island with the Phase 4 reveal animation on next visit
- [ ] Reopening an already-opened cache does not credit currency again
- [ ] Studying on consecutive days increments the streak
- [ ] Skipping exactly one day consumes a freeze automatically and preserves the streak, with a warm after-the-fact notice
- [ ] Skipping two days resets the streak to 1
- [ ] Level-up fires after the cache reveal, never simultaneously
- [ ] Level-up names a concrete unlock, not just a number
- [ ] The weekly summary appears once per week with honest numbers
- [ ] Under reduced motion: no shake, no hit-stop, no wobble — the result appears with a simple fade
- [ ] Draw calls stay under 100 with post-processing active
- [ ] `pity_counter` never appears in any network response

**Verification commands:**
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

**Pity verification:**
```bash
pnpm test -- loot.test.ts --verbose
```
Confirm the 12-roll guarantee test passes across many distinct seeds.

**Leak check:** open the Network tab, end a session, and inspect the `/api/session/end` response. It must contain a cache `id` and **no** `contents` and **no** `pity_counter`.

**Smoke test:** Run a 20-minute session (or shorten `MIN_SESSION_MS` in dev). End it. The result screen shows credited time and Focus earned, then a chest springs in. It wobbles three times, faster and higher-pitched each time. Everything freezes for a beat. The burst fires, a glow resolves to a rarity color, an item rises, its name pops in, and currency counters tick up. Go to `/island` — the new item is there, springing in with a dust puff. Return tomorrow and study again: the streak reads 2. Skip a day, then study: a freeze is consumed automatically and the streak survives. Enable OS reduced motion and repeat: the result appears with a plain fade, no shake, no wobble.

## Handoff to Next Phase

**Phase 5 completes first playable.** The full loop works end to end: study with verified focus → earn Focus and XP → receive a cache → open it with a real anticipation sequence → place the won item on a living island that grows visibly.

Delivered: a seeded PRNG (`src/domain/economy/rng.ts`) that makes every roll deterministic and testable; loot tables with a hard pity guarantee at 12 caches and no possible empty cache; timezone-correct streaks with automatic, silent-until-after freezes; all of it written inside `endSession`'s existing single transaction. `POST /api/cache/:id/open` is idempotent. A shared juice vocabulary (`useHitStop`, `useScreenShake`, `useSpringPop`, `playPitched`) is used identically by 2D and 3D surfaces and no-ops under reduced motion. The chest sequence runs a 2.2-second choreographed reveal with accelerating wobbles, a hit-stop, and three-stage rarity resolution — with a skip. Bloom and chromatic aberration are rationed to rare drops. A weekly honest summary ships as a guardrail.

**Codebase state:** a complete, satisfying game. What it does not yet have is any actual study content — the "study" is still just a timer.

**Known shortcuts taken:**
- Asset ownership is derived from opened caches plus starters rather than a dedicated inventory table. Revisit if trading, crafting, or gifting is ever added.
- `quiz_multiplier` remains 1.00 — Phase 7 sets it, and the loot and currency paths already read it, so no changes are needed there.
- The two-stage scaffolding reveal for large structures (deferred from Phase 4) is still deferred.
- Post-processing has no low-end device detection yet; the `enabled` prop exists and Phase 8 wires it.

**Phase 6 should start with** the `LlmProvider` interface in `src/server/llm/`, before any ingestion or UI work. Every downstream piece depends on that abstraction, and building ingestion against a concrete Anthropic client will need unwinding.

**Open questions for next phase:**
- 🟡 **Note formats.** The plan assumes paste, `.md`/`.txt`, `.pdf`, and photos of handwriting. Notion, Google Docs, and YouTube transcripts each need their own adapter. **Confirm before starting Phase 6.**
- Whether card generation should run synchronously with a progress UI or as a background job. Recommendation: synchronous with streaming progress for the first release — a job queue is real infrastructure, and generation for a typical lecture note takes 10–30 seconds, which is tolerable with honest progress feedback.
