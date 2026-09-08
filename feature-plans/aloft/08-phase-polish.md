# Phase 8: Polish & Resilience

> **Feature:** Aloft — 3D Study Game
> **Phase:** 8 of 9
> **Depends on:** all prior phases
> **Estimated scope:** Medium–Large (3–4 hours)

## Context from Previous Phases

**What Aloft is:** a web app that turns studying into a game. Students upload their own notes; Claude generates verified flashcards. Verified focus minutes pay **Focus ⚡**; correct recall pays **Insight 💎**. Both are spent building a persistent 3D floating island that grows and lights up at the student's real local nighttime.

**The product is feature-complete after Phase 7.** This phase makes it survive contact with real users on real hardware.

**What exists:**

- **Phase 1** — Next.js 15 App Router, React 19, TS strict, Tailwind, Drizzle + Neon, Auth.js v5 + Google. ESLint enforces `app → server → domain`; `domain` imports nothing; `game` never imports `server`. `AppError` + `handleRoute()`. Jest (node + jsdom projects) and Playwright configured.
- **Phase 2** — server-authoritative focus sessions. `/api/session/{start,beat,end,active}`, Page Visibility tracking, heartbeat cadence validation, daily caps, stale-session sweeper. `/study` is a plain 2D timer.
- **Phase 3** — the 3D island. `scripts/optimize-assets.ts` + `ASSET_MANIFEST` with the `AssetId` union. `/island` lazy-loads an R3F canvas (`next/dynamic`, `ssr: false`), instanced props (one draw call per asset type), raycast placement, server-authoritative purchase. A **dev-only overlay** reads `gl.info.render.calls`.
- **Phase 4** — aliveness. `worldState` (mutable, per-frame) with `dayFactor`, `windPhase`, `reducedMotion`. Day/night from `users.timezone`, wind vertex shader, instanced scholars, GPU particles, positional audio (muted by default), idle camera drift. **A dev-only time scrubber exists and must not ship.**
- **Phase 5** — rewards. Seeded RNG, loot tables with a pity timer at 12, timezone-correct streaks with auto-freezes, the chest reveal sequence, and `src/game/systems/juice/` (`useHitStop`, `useScreenShake`, `useSpringPop`, `playPitched`) — all reduced-motion aware. `<EffectComposer>` accepts an **`enabled` prop that nothing sets yet.**
- **Phase 6** — the AI pipeline. `LlmProvider` × 3, ingestion (paste/md/pdf/image), semantic chunking, structured card generation with a verbatim `sourceQuote` guard, quota enforcement, prompt caching.
- **Phase 7** — review. `ts-fsrs` behind a domain wrapper, bounded queues, keyboard-first review UI, the optional server-graded post-session quiz that sets `quiz_multiplier`.

## Existing Codebase Context

- `src/lib/api-response.ts` — `handleRoute()`; error shaping happens here
- `src/game/scene/post-processing.tsx` — has an unused `enabled` prop; this phase wires it
- `src/game/systems/world-state.ts` — `reducedMotion` lives here
- `src/game/island-canvas.tsx` — the `next/dynamic` boundary
- `src/app/(app)/layout.tsx` — the authed shell where global error boundaries belong

## Objective

Handle the paths that aren't the happy one: error and loading states across every route, session recovery, a device-tier system that keeps the island at 60fps on a student's cheap laptop, a full accessibility pass, and removing dev-only surfaces from the production bundle.

## Architecture Decisions

### Decision: Route-segment `error.tsx` and `loading.tsx`, not a single global boundary
- **Choice:** Every route segment that fetches data gets both files.
- **Rationale:** In App Router, `error.tsx` scopes recovery to its segment — a failed island render must not take down the nav or make `/study` unreachable. `loading.tsx` enables streaming, so the shell paints while data resolves.
- **Tradeoff:** More files. Each is ~15 lines.

### Decision: Device tier detected once at canvas mount, not adaptively per-frame
- **Choice:** Probe GPU capability and measured FPS over the first ~2 seconds, assign `low | medium | high`, and configure the scene once.
- **Alternatives considered:** Continuous adaptive quality that adjusts every frame
- **Rationale:** Continuous adaptation produces visible oscillation — shadows popping on and off as the frame rate hovers at a threshold — which reads worse than consistently lower quality. One decision, stable result.
- **Tradeoff:** A device that thermally throttles ten minutes in stays at its initial tier. Acceptable; offer a manual quality override in settings.

### Decision: `prefers-reduced-motion` is enforced by a lint rule plus a test, not by discipline
- **Choice:** An ESLint rule flags animation primitives used outside `src/game/systems/juice/`, and a test asserts every exported primitive no-ops when `reducedMotion` is true.
- **Rationale:** Six phases introduced motion. This is exactly the requirement that erodes as new animations get added.
- **Tradeoff:** Some false positives on legitimate CSS transitions. Tune the rule to the animation primitives specifically.

### Decision: Dev-only surfaces are excluded at build time, not hidden at runtime
- **Choice:** The time scrubber and draw-call overlay are behind `process.env.NODE_ENV !== 'production'` checks that the bundler statically eliminates.
- **Rationale:** A runtime `if` still ships the code — and the time scrubber lets a user fake nighttime, which is a (minor) integrity issue on top of the bundle cost.
- **Tradeoff:** None. Verify with a bundle grep.

---

## Implementation Steps

### Step 1: Error and loading boundaries

**What:** Every data-fetching route segment gets both.

**File(s):**
- `src/app/(app)/error.tsx` — shell-level fallback
- `src/app/(app)/study/{error,loading}.tsx`
- `src/app/(app)/island/{error,loading}.tsx`
- `src/app/(app)/notes/{error,loading}.tsx`
- `src/app/(app)/notes/[id]/{error,loading}.tsx`
- `src/app/(app)/review/{error,loading}.tsx`
- `src/app/global-error.tsx`
- `src/components/ui/error-state.tsx` — shared presentational component

**Details:**

`error.tsx` files are Client Components receiving `{ error, reset }`. Use one shared `<ErrorState>` so failures look consistent.

**Never render `error.message` directly.** It can contain a stack trace or a connection string. Show a friendly message plus `error.digest` for support, and log the real error server-side.

`loading.tsx` renders a Tailwind skeleton matching the page's actual layout — not a centered spinner. A skeleton that matches the shape prevents layout shift when content arrives.

`/island` is the exception: its loading state already exists from Phase 3 (drei's `useProgress`) because asset loading dominates. `loading.tsx` there covers only the server fetch of island data.

> **ANTI-PATTERN: Leaking internal errors to the client**
> ❌ Don't: `<p>{error.message}</p>`.
> ✅ Instead: a fixed friendly message + `error.digest`.
> 💡 Why: Next.js digests production errors precisely so internals don't leak. Rendering the message defeats it.

---

### Step 2: Empty states for every collection

**What:** First-run and zero-data screens.

**File(s):** `src/components/ui/empty-state.tsx`, plus per-route usage

**Details:**

| Route | Empty condition | What it should say |
|---|---|---|
| `/notes` | No sources | "Upload your lecture notes and we'll turn them into flashcards" + sample file |
| `/notes/[id]` | Generation produced zero cards | "We couldn't find anything testable in these notes" + link to edit |
| `/review` | No cards at all | "No cards yet — upload notes to build your deck" → `/notes` |
| `/review` | Cards exist, none due | "You're caught up. Next review: Thursday." + forecast |
| `/island` | No placements | "Study to earn Focus, then build your first structure" → `/study` |
| `/study` | First-ever visit | Short explainer: how a session works, what it earns |

The distinction between "no cards" and "none due" matters. The first is a task; the second is an achievement. Rendering the same screen for both makes success look like emptiness.

---

### Step 3: Device-tier detection and quality scaling

**What:** Keep 60fps on a student's laptop.

**File(s):**
- `src/game/systems/device-tier.ts`
- `src/game/systems/quality-settings.ts`
- `src/app/(app)/settings/_components/quality-override.tsx`

**Details:**

`detectDeviceTier()` combines:
- `WEBGL_debug_renderer_info` for the GPU string (Intel integrated / Apple Silicon / discrete)
- `navigator.hardwareConcurrency`
- `navigator.deviceMemory` where available
- A measured FPS sample over the first ~2 seconds after mount

| Setting | low | medium | high |
|---|---|---|---|
| Shadows | off | soft, 512 map | soft, 1024 map |
| Post-processing | **disabled** | bloom only | bloom + chromatic aberration |
| Particles | 0 | 80 | 200 |
| Scholars | 3 max | 6 max | 8 max |
| DPR cap | 1 | 1.5 | 2 |
| Wind shader | off | on | on |

**This is what the `enabled` prop on `<EffectComposer>` from Phase 5 was for.** Wire it now.

Store the manual override in `localStorage`; a user who knows their machine should be able to force `high`.

The tier applies to the 3D scene only. `/study`, `/review`, and `/notes` are unaffected — they have no 3D dependency by design.

> **ANTI-PATTERN: Adaptive quality that changes every frame**
> ❌ Don't: raise and lower shadow quality as FPS crosses a threshold.
> ✅ Instead: decide once at mount; offer a manual override.
> 💡 Why: oscillating quality is more distracting than consistently lower quality, and it makes performance bugs impossible to reproduce.

---

### Step 4: Reduced-motion audit

**What:** Verify every animated system honors the OS setting — mechanically.

**File(s):** `src/game/systems/use-reduced-motion.ts`, `eslint.config.mjs`, `src/app/globals.css`

**Details:**

1. Audit every system introduced in Phases 4, 5, and 7 against the checklist below.
2. Add a global CSS fallback:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```
3. Add an ESLint rule flagging imports of the juice primitives outside `src/game/systems/juice/` that don't route through the reduced-motion-aware wrappers.

Coverage checklist — each must be verified by hand and by test:

| System | Phase | Reduced-motion behavior |
|---|---|---|
| Wind vertex shader | 4 | Amplitude → 0 |
| Ambient scholars | 4 | Static, no bob |
| Particles | 4 | Not rendered |
| Idle camera drift | 4 | Disabled |
| Day/night transition | 4 | Instant, not animated |
| Placement reveal | 4 | Instant appear |
| Hit-stop | 5 | No freeze |
| Screen shake | 5 | No shake |
| Spring pop | 5 | Instant appear |
| Chest wobble sequence | 5 | Skip to final state |
| Post-processing spike | 5 | No spike |
| Card flip | 7 | Instant flip |
| Insight counter pop | 7 | Instant update |

`prefers-reduced-motion` is a genuine accessibility need — vestibular disorders make screen shake and camera drift physically unpleasant, not merely annoying.

---

### Step 5: Keyboard navigation and screen readers

**What:** The study features must be fully usable without a mouse or sighted navigation.

**File(s):** across `src/components/` and `src/app/(app)/`

**Details:**

Scope, in priority order:

1. **`/review` — must be perfect.** Already keyboard-first from Phase 7. Add: visible focus rings, `aria-live="polite"` on the answer reveal so a screen reader announces it, and `aria-label`s on rating buttons that include the projected interval.
2. **`/notes`** — the dropzone needs a keyboard-reachable file input, not just drag-and-drop. Generation progress needs `aria-live` and `role="status"`.
3. **`/study`** — the timer needs `role="timer"` and `aria-live="off"` (announcing every second is torture); announce only state changes.
4. **Nav and modals** — focus trapping in dialogs, Escape to close, focus restored to the trigger on close.
5. **`/island`** — a canvas is inherently hard to make accessible. Provide the Phase 3 2D fallback as an explicit, discoverable alternative rather than pretending the canvas is navigable.

Run `axe` in dev and fix every violation on `/study`, `/review`, and `/notes`. The island can carry documented, justified exceptions.

Check color contrast on the currency badges and rarity colors — rarity is currently communicated by color alone, which fails for colorblind users. Add a shape or label alongside.

> **ANTI-PATTERN: Rarity communicated by color alone**
> ❌ Don't: rely on the glow hue to mean "epic".
> ✅ Instead: pair color with a label and a distinct shape or icon.
> 💡 Why: ~8% of men have some form of color vision deficiency. The whole rarity system is invisible to them otherwise.

---

### Step 6: Session recovery and offline resilience

**What:** Don't lose a student's work to a flaky connection.

**File(s):**
- `src/app/(app)/study/_hooks/use-focus-session.ts` (harden)
- `src/app/(app)/review/_components/review-session.tsx` (harden)
- `src/components/ui/connection-status.tsx`

**Details:**

- **Offline banner:** listen to `online` / `offline`; show a non-blocking banner. Don't disable the UI — a running timer can keep running.
- **Heartbeat resilience:** on failure, keep counting locally and retry on the next tick. Do not surface heartbeat failures; they're routine, and the credit-loss ceiling is one interval per drop.
- **Review answer queue:** if `/api/review/answer` fails, keep the answer in a local queue and retry. The student should keep moving through cards; drop the queue only if it exceeds ~20 entries, then show a real error.
- **Session end retry:** up to 3 attempts with backoff, then rely on the Phase 2 stale sweeper. Tell the user their session was saved.
- **Tab restore:** `/api/session/active` on mount already handles this from Phase 2. Verify it works after a *browser restart*, not just a tab refresh.

---

### Step 7: Performance budget enforcement

**What:** Make the budget mechanical.

**File(s):** `scripts/check-bundle.ts`, `package.json`, `next.config.ts`

**Details:**

`pnpm check:bundle` runs after `next build`, parses the build output, and **fails** if:
- The `/study` route's first-load JS exceeds 300 KB
- three.js appears in any route's bundle other than `/island`
- Any optimized GLB in `public/models/` exceeds 150 KB

That second check is the important one — an accidental static import of anything from `src/game/` into a study component silently adds ~600 KB to a page that never renders 3D.

Also in this step:
- Add `next/font` for self-hosted fonts (no render-blocking Google Fonts request)
- Add `sizes` and explicit dimensions to every `next/image` to stop layout shift
- Set long `Cache-Control` on `/models/*` (content-hashed filenames make this safe)

Target Lighthouse scores on `/study` (the route that must be fast): Performance ≥ 90, Accessibility ≥ 95.

---

### Step 8: Remove dev-only surfaces from production

**What:** The time scrubber and the draw-call overlay must not ship.

**File(s):** `src/game/systems/world-clock.tsx`, `src/game/dev/`, `scripts/check-bundle.ts`

**Details:**

Move all dev tooling under `src/game/dev/` and import it behind a statically-analyzable check:
```ts
{process.env.NODE_ENV !== 'production' && <DevPanel />}
```
Next.js eliminates that branch at build time. A runtime flag read from a variable does not get eliminated — the check must be literal.

Add a bundle assertion: grep the production build output for `TimeScrubber` and fail if present.

The time scrubber in particular lets a user set the in-game clock arbitrarily. Minor, but it's a real integrity hole in a system where nighttime is meant to reflect the student's actual life.

---

### Step 9: Rate limiting and abuse guards

**What:** Bound what a single account can cost you.

**File(s):** `src/server/rate-limit.ts`, applied in route handlers

**Details:**

Per-user, per-window limits on the endpoints where abuse is expensive:

| Endpoint | Limit |
|---|---|
| `POST /api/notes` | 20 / hour |
| `POST /api/session/start` | 12 / day (already enforced in Phase 2) |
| `POST /api/island/place` | 120 / minute |
| `POST /api/review/answer` | 300 / minute |
| `PUT /api/settings/api-key` | 5 / hour |

A simple Postgres-backed counter is sufficient at this scale — Redis is more infrastructure than the problem needs. On breach, return `RATE_LIMITED` with a `Retry-After` header.

The `/api/notes` limit is the one that matters: it's the only endpoint that costs real money per call, and Phase 6's quota is a monthly ceiling, not a burst guard.

---

### Step 10: Onboarding

**What:** A first-run experience that gets a student to their first reward.

**File(s):** `src/app/(app)/_components/onboarding-tour.tsx`, plus a `users.onboarded_at` column

**Details:**

Four steps, skippable at any point:
1. **Set timezone** — auto-detect via `Intl.DateTimeFormat().resolvedOptions().timeZone`, confirm. This is what makes day/night reflect the student's real life; it's worth one screen.
2. **Upload your first notes** — or "skip for now"
3. **Run a 5-minute focus session** — shortened just for onboarding, so the first reward arrives inside the first session
4. **Place your first building** — the payoff

Do not build a modal-driven tour with a dimming overlay and arrows. Use inline contextual hints on each route that dismiss on completion. Overlay tours get dismissed reflexively and teach nothing.

Track completion in `users.onboarded_at`.

---

### Step 11: Weekly summary and honesty pass

**What:** Finish the guardrails introduced in Phase 5.

**File(s):** `src/app/(app)/study/_components/weekly-summary.tsx` (extend), `src/app/(app)/settings/page.tsx`

**Details:**

- The weekly summary already exists from Phase 5. Extend it with review counts and retention from Phase 7 so it reflects learning, not just hours.
- Add a settings page with: daily creditable cap (user-adjustable **downward** only, never above 8h), break-reminder interval, audio preference, motion preference, quality override, BYOK key, and a data export.
- Add a plain-language "how rewards work" page. A product built on variable-ratio reinforcement should be able to explain its own mechanics without embarrassment — and being able to is a meaningful differentiator from the loot-box products this borrows from.

---

## State Management for This Phase

| State | Category | Location | Source of truth | Persistence |
|---|---|---|---|---|
| Device tier | Ephemeral, computed once | `useState` at canvas mount | Client detection | None; override in `localStorage` |
| Quality override | User preference | `localStorage` | Client | Survives refresh |
| Online / offline | Ephemeral | `useState` + `online`/`offline` events | Browser | None |
| Queued review answers | Ephemeral, retried | `useRef` array in the review session | Client until confirmed | None — dropped past ~20 |
| Onboarding step | UI | `useState`; completion → DB | Postgres `users.onboarded_at` | DB |
| Reduced motion | Derived | `matchMedia`, mirrored into `worldState` | OS setting | N/A |
| Settings (cap, audio, motion) | User preference | Postgres + TanStack Query | DB | DB |

## Error Handling

| Operation | Failure mode | User-facing behavior | Recovery strategy |
|---|---|---|---|
| Any route segment | Server Component throws | Segment-scoped `error.tsx` with Retry | `reset()`; nav stays usable |
| Any route | Unhandled render error | `global-error.tsx` full-page fallback | Reload |
| Canvas | WebGL context lost | "Graphics restarting…" then remount | Listen for `webglcontextlost`; prevent default and re-init |
| Canvas | WebGL unsupported | 2D fallback listing built objects | Feature-detect before mount |
| Network | Offline | Non-blocking banner; timer keeps running | `online`/`offline` events |
| Heartbeat | Repeated failures | **Silent** | Retry on the next tick |
| Review answer | Failure | Queued locally, student keeps going | Retry; hard error past ~20 queued |
| Session end | 3 failures | "Saved — we'll finish this up" | Stale sweeper credits it |
| Any endpoint | Rate limited | "Slow down a moment" + retry time | `Retry-After` header |
| Asset load | Individual GLB fails | That prop group is absent; island renders | Per-group error boundary |
| Frame rate | Below 30fps at `low` tier | Suggest the 2D fallback in settings | Do not auto-switch — that's jarring |

## Testing Requirements for This Phase

- [ ] Every route segment that fetches data has both `error.tsx` and `loading.tsx`
- [ ] `error.tsx` renders the friendly message, never `error.message`
- [ ] `reset()` re-attempts the failed segment
- [ ] `/review` distinguishes "no cards" from "none due"
- [ ] `detectDeviceTier` returns `low` for a simulated integrated GPU + low core count
- [ ] `low` tier disables post-processing and sets particle count to 0
- [ ] The quality override in `localStorage` takes precedence over detection
- [ ] **Every juice primitive no-ops under reduced motion** ← the requirement most likely to regress
- [ ] Reduced motion sets wind amplitude to 0 and disables camera drift
- [ ] The card flip is instant under reduced motion
- [ ] Every rating button has an `aria-label` including the projected interval
- [ ] The answer reveal is announced via `aria-live`
- [ ] The full review flow is completable with keyboard only
- [ ] Rarity is communicated by more than color
- [ ] A failed review answer is queued and retried
- [ ] Going offline mid-session keeps the timer running and shows a banner
- [ ] `POST /api/notes` is rate-limited at 20/hour
- [ ] The production bundle contains no `TimeScrubber`
- [ ] three.js is absent from `/study`'s bundle
- [ ] `/study` first-load JS is under 300 KB

**Test type guidance:**
- Device tier and quality mapping → **unit tests** with mocked `navigator` and WebGL context
- Reduced-motion no-ops → **unit tests** on each primitive. This is the regression-prone requirement; test it directly, not through the UI.
- Error boundaries and empty states → **RTL**: force a throw, assert the fallback and that Retry calls `reset`
- Keyboard flows → **Playwright** — real focus and key handling; jsdom's focus model is not trustworthy here
- Bundle assertions → the `check:bundle` script, run in CI
- **Do not** attempt automated visual accessibility testing. Run `axe` for the mechanical violations and check the rest by hand.

## Acceptance Criteria

- [ ] Every route has a skeleton loading state matching its layout
- [ ] Every route has a segment-scoped error boundary with a working Retry
- [ ] Every empty collection has a purposeful empty state
- [ ] "Caught up" and "no cards" read as different outcomes
- [ ] A first-time user completes onboarding and places their first building
- [ ] On a throttled low-end profile, the island holds ≥ 30fps at `low` tier
- [ ] The quality override in settings takes effect immediately
- [ ] With OS reduced motion on: no shake, no drift, no particles, no wobble — everything still works
- [ ] `/review` is fully completable with keyboard only
- [ ] `axe` reports zero violations on `/study`, `/review`, and `/notes`
- [ ] Going offline shows a banner; the timer keeps running; the session credits on reconnect
- [ ] A failed review answer retries silently and the student keeps moving
- [ ] `/study` first-load JS is under 300 KB and contains no three.js
- [ ] The production build contains no dev panel or time scrubber
- [ ] Uploading 21 notes in an hour is rate-limited with a clear message
- [ ] The settings page allows lowering the daily cap, but not raising it above 8h
- [ ] The weekly summary shows hours, sessions, cards reviewed, and retention

**Verification commands:**
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm check:bundle`

**Lighthouse:** run against `/study` (throttled, mobile profile). Performance ≥ 90, Accessibility ≥ 95.

**Dev-surface check** (must print nothing):
```bash
rg -l "TimeScrubber|DevPanel" .next/static
```

**Reduced-motion check:** macOS System Settings → Accessibility → Display → Reduce motion. Walk `/island`, `/review`, and a full session-end chest reveal. Nothing should move beyond instant state changes, and everything should still be usable.

**Smoke test:** Open a fresh incognito window, sign in as a new user, and complete onboarding end to end — timezone, notes upload, a 5-minute session, first building placed. Then throttle the network to Slow 3G and go offline mid-session: the banner appears, the timer keeps running, and reconnecting credits the session. Enable OS reduced motion and repeat a session end — the chest resolves instantly with no shake. Finally, tab through `/review` with the mouse untouched and complete ten cards.

## Handoff to Next Phase

Phase 8 makes Aloft production-ready. Every data-fetching route segment has scoped error and loading boundaries with skeletons matching real layouts; failures never leak internals. Every collection has a purposeful empty state, with "caught up" distinguished from "nothing here". A device-tier system probes GPU, cores, memory, and measured FPS once at mount and configures shadows, post-processing, particles, scholars, DPR, and the wind shader — finally wiring the `enabled` prop Phase 5 left dangling — with a manual override in settings. Every animated system across Phases 4, 5, and 7 is audited for `prefers-reduced-motion`, backed by a lint rule and per-primitive tests. `/review`, `/notes`, and `/study` are keyboard-complete and `axe`-clean, and rarity no longer depends on color alone. Offline and flaky-network paths keep the timer running and queue review answers for retry. `check:bundle` fails the build if `/study` exceeds 300 KB or contains three.js, and dev-only surfaces are statically eliminated from production. Per-user rate limits bound abuse on the endpoints that cost money. A four-step inline onboarding gets a new student to their first placed building.

**Codebase state:** production-quality. The remaining gap is systematic test coverage — Phases 1–8 each specified what to test, but the suite hasn't been written.

**Known shortcuts taken:**
- Device tier is decided once; a thermally-throttling laptop stays at its initial tier
- The island canvas is not screen-reader navigable; the 2D fallback is the accessible path
- Rate limiting is Postgres-backed, adequate for single-region scale
- Quiz distractors remain occasionally implausible (deferred from Phase 7)
- No i18n. English-only, with formatting via `Intl`.

**Phase 9 should start with** the domain unit tests, since they're the cheapest and highest-value coverage in the project and every service test builds on them being correct.

**Open questions for next phase:**
- Whether to add error reporting (Sentry or similar) before launch. Recommendation: yes, but it's a 30-minute integration, not a phase.
- Whether to add analytics. If so, decide what questions it answers *first* — an events firehose with no question behind it is cost with no payoff.
