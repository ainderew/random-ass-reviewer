# Phase 4: Aliveness Layer

> **Feature:** Aloft — 3D Study Game
> **Phase:** 4 of 9
> **Depends on:** `03-phase-3d-world-foundation.md`
> **Estimated scope:** Medium–Large (3–4 hours)

## Context from Previous Phase

**What Aloft is:** a web app that turns studying into a game. Students run verified focus sessions; verified minutes pay **Focus ⚡** and correct recall pays **Insight 💎**. Both are spent building a persistent 3D floating island. Target users are students, board-exam takers, and grad students who want to study but can't hold focus.

**Phase 1** built the skeleton: Next.js 15 App Router, React 19, TypeScript strict, Tailwind, Drizzle + Neon Postgres, Auth.js v5 with Google. Layers enforced by ESLint — `domain` imports nothing, **`game` may never import `server`**.

**Phase 2** built the server-authoritative focus session engine. `/study` is a plain 2D timer that verifies focus via Page Visibility and pays Focus currency.

**Phase 3** built the 3D island. Everything below already exists:

- `scripts/optimize-assets.ts` — Tripo3D GLB → optimized GLB + generated manifest. Run with `pnpm assets:optimize`. Fails if an asset exceeds 150KB or 5,000 triangles.
- `src/game/assets/manifest.generated.ts` — `ASSET_MANIFEST` and the `AssetId` union type. Every asset reference is compile-time checked.
- `src/game/assets/use-asset.ts` — `useAsset(id: AssetId)`, wraps drei's `useGLTF`.
- `src/domain/island/grid.ts` — `gridToWorld`, `worldToGrid`, `isInBounds`, `tilesForFootprint`. `TILE_SIZE = 2`.
- `src/game/island-canvas.tsx` — the `next/dynamic({ ssr: false })` target. `dpr={[1, 2]}`, shadows on.
- `src/game/scene/island-scene.tsx` — scene root.
- **`src/game/scene/lighting.tsx`** — static `directionalLight` + `ambientLight` + drei `<Environment preset="sunset" />`. **Deliberately isolated so this phase can replace it wholesale.**
- `src/game/scene/island-terrain.tsx` — the island base mesh.
- `src/game/entities/placed-props.tsx` — groups placements by `assetId`, renders one `InstancedMesh` per group. Matrices written in `useLayoutEffect`, not `useFrame`.
- **`src/game/systems/camera-controller.tsx`** — drei `<OrbitControls>` with damping, pan disabled, clamped polar angle and distance. **Exposes its controls ref specifically so this phase can add idle drift.**
- `src/game/systems/build-controller.tsx` — raycast placement.
- `src/game/store/island-store.ts` — Zustand: `mode`, `selectedAssetId`, `hoveredTile`, `ghostRotation`, `placements`.
- A dev-only overlay reading `gl.info.render.calls` and `.triangles`, active when `NODE_ENV === 'development'`.

**Database fields this phase reads:**
- `users.timezone` — text, not null, default `'UTC'`. **Populated since Phase 1 and completely unused so far.** This phase is what makes it matter.
- `islands.theme`, `islands.tile_count`
- `placements` — `asset_id`, `x`, `z`, `rot_y`

**Current state of the world:** correct but dead. Nothing moves. Lighting is fixed. No NPCs, no particles, no sound. It reads as a model viewer, not a place.

## Existing Codebase Context

- `src/game/scene/lighting.tsx` — replace entirely, keep the filename and export shape
- `src/game/systems/camera-controller.tsx` — extend with idle drift, do not fork
- `src/game/entities/placed-props.tsx` — the instancing pattern here is the template for scholars and particles
- `src/game/store/island-store.ts` — add a `timeOfDay` slice; follow the existing transient-read pattern
- `jest.config.ts` — already maps `.glsl` imports to a mock, set up in Phase 1

## Objective

Make the island feel like a place someone lives rather than a diorama. Add a real-time day/night cycle driven by the user's actual local clock, vertex-shader wind on foliage, wandering scholar NPCs, ambient particles, positional audio, and idle camera drift.

Sequenced after Phase 3 because every system here layers on a correct static scene. Sequenced before Phase 5 because the reward moment (a chest opening at dusk with lanterns lit) is dramatically stronger against a living backdrop than a static one.

## The design thesis for this phase

Ordered by **aliveness gained per unit of effort** — implement in this order, and if time runs short, the tail is the right thing to cut:

| # | Technique | Effort | Why it earns its place |
|---|---|---|---|
| 1 | Nothing is ever perfectly still | Very low | Vertex-shader sway costs zero CPU and removes the single strongest "this is dead" signal |
| 2 | Positional ambient audio | Very low | Highest aliveness-per-KB of anything available. A fountain you *hear* is more alive than one you see |
| 3 | Day/night from the user's real clock | Low | Ties the world to the player's actual life. Studying at 11pm *looks* like 11pm |
| 4 | Ambient scholar agents | Medium | Three wandering NPCs convert a scene from model-viewer to world |
| 5 | Idle camera drift | Very low | A locked static camera reads as dead instantly |
| 6 | Particles | Low | Dust motes catching light do more than their pixel count suggests |
| 7 | Environmental storytelling from real data | Medium | Props referencing *their* history, not generic decor |
| 8 | Deferred reveal | Low | Anticipation is the reward — never pop a new building in |

## Architecture Decisions

### Decision: A single `useFrame` "world clock," not one per system
- **Choice:** One root-level `<WorldClock />` advances a shared mutable `worldState` object (elapsed time, sun angle, wind phase). Every other system reads from it.
- **Alternatives considered:** Each system calling `useFrame` with its own `state.clock`
- **Rationale:** R3F runs `useFrame` callbacks in registration order with a shared delta. Centralizing derived time values means the sun angle is computed once per frame instead of once per consumer, and every system is guaranteed to agree on what time it is.
- **Tradeoff:** A small amount of coupling to a shared object. Worth it — desynchronized time across systems produces bugs that are miserable to diagnose.

### Decision: Wind is a vertex shader, not CPU animation
- **Choice:** Extend the standard material with a vertex-stage displacement driven by a `uTime` uniform and world position.
- **Alternatives considered:** Animating bone/object transforms in `useFrame`
- **Rationale:** CPU animation of 200 props means 200 matrix writes per frame. A vertex shader sways every instance for free on the GPU, and per-instance variation comes free from world position.
- **Tradeoff:** Custom shader code to maintain, and shadows need the same displacement in the depth pass or shadows detach from geometry.

### Decision: Scholars are instanced with per-instance phase offsets
- **Choice:** One `InstancedMesh` for all scholars, each with a random phase offset so they don't move in lockstep.
- **Alternatives considered:** Individual skinned meshes with real animation clips
- **Rationale:** At the intended camera distance, per-character skeletal animation is invisible. Instancing keeps the draw-call budget intact and avoids the Tripo3D rigging quality lottery entirely.
- **Tradeoff:** Scholars bob and glide rather than walk with articulated legs. Deliberately stylized — commit to it in the art direction rather than half-attempting realism.

### Decision: Audio starts muted with a visible unmute control
- **Choice:** All audio is created muted. A persistent speaker button unmutes on first click and remembers the preference in `localStorage`.
- **Alternatives considered:** Attempting autoplay; waiting for any user gesture to silently start
- **Rationale:** Every browser blocks autoplay. Silently starting audio on a stray click is startling — especially for a student in a library, which is a meaningful share of this userbase.
- **Tradeoff:** Some users never hear the audio. Acceptable; the visual layer stands alone.

### Decision: `prefers-reduced-motion` is honored at the system level
- **Choice:** A `useReducedMotion()` hook gates each system: wind amplitude → 0, scholars → static, particles → off, camera drift → off. Day/night still transitions, but instantly rather than smoothly.
- **Rationale:** This is the first phase that introduces motion, so it is the right place to establish the contract. Retrofitting reduced-motion after five systems exist is far harder.
- **Tradeoff:** Every new animated system must remember to check. Phase 8 adds a test asserting all of them do.

---

## Implementation Steps

### Step 1: World clock and shared frame state

**What:** One place that knows what time it is in the game.

**File(s):** `src/game/systems/world-clock.tsx`, `src/game/systems/world-state.ts`

**Details:**

`world-state.ts` exports a plain mutable object — **not** Zustand, because this is read every frame by multiple systems and even transient store reads are needless overhead here:

```ts
export const worldState = {
  elapsed: 0,
  windPhase: 0,
  sunAltitude: 0,      // radians, -π/2 (midnight) … π/2 (noon)
  sunAzimuth: 0,
  dayFactor: 0,        // 0 = full night, 1 = full day
  reducedMotion: false,
};
```

`<WorldClock />` renders nothing and runs one `useFrame` that advances `elapsed` and `windPhase` by delta, and recomputes the sun values from the user's local time. Mount it as the **first child** of `<IslandScene>` so it updates before consumers read.

> **ANTI-PATTERN: `state.clock.elapsedTime` scattered across systems**
> ❌ Don't: each system calling `useFrame((state) => { const t = state.clock.elapsedTime })` and deriving its own sun angle.
> ✅ Instead: compute once in the world clock; everyone reads `worldState`.
> 💡 Why: duplicated derivation is duplicated cost and a guaranteed source of systems disagreeing about the time.

---

### Step 2: Day/night cycle from the user's real clock

**What:** The system that ties the world to the player's actual life.

**File(s):**
- `src/domain/world/sun.ts` — pure math
- `src/game/scene/lighting.tsx` — **replaces the Phase 3 static version**
- `src/game/scene/sky.tsx`

**Details:**

`src/domain/world/sun.ts` (pure, unit-testable, no three.js):
```ts
export function sunPositionForLocalTime(input: {
  localHour: number;      // 0-23.999
  latitudeBias?: number;  // stylized, not astronomically accurate
}): { altitude: number; azimuth: number; dayFactor: number };

export function skyPaletteFor(dayFactor: number, localHour: number): {
  topColor: string;
  horizonColor: string;
  sunColor: string;
  ambientColor: string;
  ambientIntensity: number;
  fogColor: string;
};
```

**Do not attempt real astronomy.** Stylize it: dawn 5–7, day 7–17, golden hour 17–19, dusk 19–21, night 21–5. Golden hour gets a disproportionate share of the arc because it is by far the most beautiful lighting and a large share of studying happens in the late afternoon and evening.

`lighting.tsx` reads `worldState.dayFactor` in `useFrame` and mutates light properties on refs:
```ts
useFrame(() => {
  sunRef.current.position.setFromSphericalCoords(50, Math.PI/2 - worldState.sunAltitude, worldState.sunAzimuth);
  sunRef.current.intensity = MathUtils.lerp(0.1, 2.4, worldState.dayFactor);
  sunRef.current.color.lerpColors(NIGHT_COLOR, DAY_COLOR, worldState.dayFactor);
});
```

**Timezone:** read `users.timezone` (already populated) and compute local hour with `date-fns-tz`. On first sign-in the client should send `Intl.DateTimeFormat().resolvedOptions().timeZone` so the value is real rather than the `'UTC'` default — add this to the Phase 1 bootstrap or as a one-time PATCH on first island load.

**Dev-only time scrubber:** a slider that overrides local hour, visible only in development. You will otherwise spend hours waiting for dusk to test dusk.

> **ANTI-PATTERN: Recreating light objects on state change**
> ❌ Don't: derive light color into React state and re-render the light each frame.
> ✅ Instead: hold a ref and mutate `.intensity` / `.color` inside `useFrame`.
> 💡 Why: re-rendering a light 60 times per second reconciles the whole subtree. Mutating a ref costs nothing.

---

### Step 3: Emissive windows and lanterns at night

**What:** The single most convincing "someone lives here" signal.

**File(s):** `src/game/systems/emissive-controller.tsx`

**Details:**

Assets declare an emissive material slot by naming convention (a material named `emissive_window` in the GLB). At `dayFactor < 0.3`, ramp that material's `emissiveIntensity` from 0 to ~2.

Stagger the ignition: each placement gets a deterministic offset from its `id` hash so windows light up over ~90 seconds of dusk rather than all at once. Simultaneous ignition reads as a switch being flipped; staggered ignition reads as people coming home.

Because materials are shared across an `InstancedMesh`, per-instance emissive variation needs an instanced attribute. Simpler alternative for MVP: put emissive props in their own small instanced group and vary intensity per group rather than per instance.

---

### Step 4: Wind vertex shader

**What:** Nothing is ever perfectly still.

**File(s):**
- `src/game/materials/wind-material.ts`
- `src/game/shaders/wind.vert.glsl`

**Details:**

Use `onBeforeCompile` on a `MeshStandardMaterial` — this keeps three.js lighting, shadows, and tone mapping intact rather than reimplementing them in a raw `ShaderMaterial`.

Inject into the vertex stage:
```glsl
float sway = sin(uTime * uSpeed + worldPos.x * 0.4 + worldPos.z * 0.4);
transformed.x += sway * uAmplitude * weight;
transformed.z += sway * uAmplitude * 0.6 * weight;
```

`weight` is the vertex's height above its object origin, normalized — so trunks stay planted and canopies move. Derive it from local Y, or bake it into vertex colors during the optimize step for better control.

Assets opt in via `asset-meta.json`:
```json
{ "tree_oak": { "wind": { "amplitude": 0.18, "speed": 1.2 } } }
```

**Shadows need the same displacement**, or shadows detach from swaying geometry — a very visible artifact. Apply the identical vertex injection to the depth material via `customDepthMaterial`.

Set `uAmplitude = 0` when `worldState.reducedMotion` is true.

> **ANTI-PATTERN: Raw `ShaderMaterial` for a small displacement**
> ❌ Don't: write a full custom shader and lose lighting, shadows, fog, and tone mapping.
> ✅ Instead: `onBeforeCompile` and inject into the existing chunk pipeline.
> 💡 Why: reimplementing three.js's PBR lighting to get a sine wave is a spectacularly bad trade.

---

### Step 5: Ambient scholar agents

**What:** People living in the world.

**File(s):**
- `src/domain/world/wander.ts` — pure pathing math
- `src/game/entities/scholars.tsx`

**Details:**

`src/domain/world/wander.ts` (pure):
```ts
export function waypointsForIsland(placements: ReadonlyArray<{ x: number; z: number }>, count: number): GridCoord[];
export function positionAlongPath(input: {
  path: ReadonlyArray<{ x: number; z: number }>;
  t: number;            // 0-1 loop progress
  dwellFraction: number; // portion of the loop spent standing still
}): { x: number; z: number; heading: number; isDwelling: boolean };
```

Waypoints are derived from actual placements — scholars walk *between the things the user built*, which makes their movement read as purposeful rather than random.

`scholars.tsx` renders one `InstancedMesh`. Per instance:
- A random phase offset so they aren't synchronized
- A slightly different speed
- A vertical bob (`sin(t * 8) * 0.04`) that stops while dwelling
- `heading` drives Y rotation so they face their direction of travel

**Population scales with progress:** `min(floor(placements.length / 3), 8)`. The island getting busier as it grows is a reward in itself, and it costs nothing extra.

**Three is enough.** Do not build pathfinding, collision avoidance, or behavior trees. At this camera distance, purposeful-looking movement between real landmarks is indistinguishable from intelligence.

> **ANTI-PATTERN: Real pathfinding for ambient NPCs**
> ❌ Don't: A* over a navmesh.
> ✅ Instead: a precomputed waypoint loop with dwell time.
> 💡 Why: nobody watching an idle game from 15 units away can tell the difference, and A* costs days plus a permanent per-frame budget.

---

### Step 6: Ambient particles

**What:** Dust motes, drifting leaves, night fireflies.

**File(s):** `src/game/systems/ambient-particles.tsx`

**Details:**

One `<points>` with a `ShaderMaterial`. Positions are generated once into a `BufferAttribute`; motion happens entirely in the vertex shader from `uTime` — the CPU never touches particle positions after initialization.

Three sets, cross-faded by `dayFactor`:
- **Day:** ~150 dust motes, slow upward drift, small, catching the sun color
- **Dusk:** leaves, faster lateral drift
- **Night:** ~40 fireflies, additive blending, gentle pulsing opacity

Cap at 200 particles total and use additive blending only at night. Off entirely under reduced motion.

> **ANTI-PATTERN: CPU-updated particle positions**
> ❌ Don't: loop over 200 particles in `useFrame` writing to the position array.
> ✅ Instead: static buffer, motion computed in the vertex shader from `uTime`.
> 💡 Why: 200 CPU writes plus a buffer upload every frame, versus one uniform update.

---

### Step 7: Positional audio

**What:** The cheapest aliveness available.

**File(s):** `src/game/systems/audio-system.tsx`, `src/game/systems/use-audio-preference.ts`

**Details:**

Use drei's `<PositionalAudio>` for point sources and a plain `<Audio>` for the ambient bed.

- **Ambient bed** — two looping tracks, day and night, cross-faded by `dayFactor`. Day: light wind, distant birds. Night: crickets, deeper wind.
- **Positional emitters** — assets declare `audio: { src, refDistance, volume }` in `asset-meta.json`. A fountain, a wind chime, a campfire. `refDistance` around 4 so sound falls off within a few tiles and orbiting the island produces a genuinely spatial mix.

**Start muted.** A persistent speaker toggle in the HUD unmutes and writes the preference to `localStorage`. Never attempt autoplay.

Keep audio files small — 128kbps mono OGG/MP3, 20–40 second loops. Total audio budget: under 2MB. Load lazily after the first frame renders; audio must never delay the visual load.

---

### Step 8: Idle camera drift

**What:** Stop the camera from reading as a screenshot.

**File(s):** `src/game/systems/camera-controller.tsx` (extend)

**Details:**

Track time since the last pointer or key input. After 4 seconds idle, apply a very slow azimuthal rotation (~0.02 rad/s) plus a subtle vertical bob. Any input cancels it immediately and resets the timer.

Implement by nudging `controls.current.setAzimuthalAngle()` rather than writing camera position directly — otherwise you fight `OrbitControls` and produce jitter.

Disabled under reduced motion.

> **ANTI-PATTERN: Writing camera position while OrbitControls is active**
> ❌ Don't: `camera.position.x = ...` in `useFrame` with controls enabled.
> ✅ Instead: drive the controls' own angle setters.
> 💡 Why: `OrbitControls` recomputes position from its internal spherical coordinates every update. Direct writes get overwritten, producing a stutter.

---

### Step 9: Environmental storytelling from real data

**What:** Props that reference the user's actual study history.

**File(s):** `src/game/entities/study-shelf.tsx`, `src/server/services/island.ts` (extend)

**Details:**

MVP scope — one prop that reads real data:

**The study shelf.** A bookshelf whose visible book count and spine colors derive from the user's distinct study subjects and total hours. Extend the island endpoint to return a small `worldSignals` payload:
```ts
{ totalFocusHours: number; distinctSubjects: string[]; longestStreak: number }
```

Render books as one `InstancedMesh` with per-instance color from a subject hash. Ten hours studied is a visibly fuller shelf than one hour.

This is the seed of the pattern, not the whole feature. Phase 8 or later adds trophy walls for completed exams and a lantern per streak milestone. Establishing that props can read real data is what matters now.

> **ANTI-PATTERN: `game` importing from `server` to fetch this**
> ❌ Don't: `import { getStudySignals } from '@/server/services/island'` inside a game component.
> ✅ Instead: the Server Component page fetches it and passes it down as props.
> 💡 Why: ESLint will reject it, and the boundary is what keeps the 3D layer independently testable.

---

### Step 10: Deferred reveal for new placements

**What:** Never pop a new building into existence.

**File(s):** `src/game/entities/placement-reveal.tsx`

**Details:**

A placement younger than ~8 seconds renders with a reveal animation: scale from 0 with an overshoot spring, a brief dust puff, and a soft light flash. `placed_at` is already stored, so this survives a refresh — placing something, refreshing, and seeing it *appear* rather than *be there* is a small, real delight.

For large structures, a two-stage version is stronger: scaffolding on placement, then a "grand opening" burst the next time the user loads the island. That is deliberately deferred to Phase 5, which owns the reward-moment vocabulary this shares.

---

## State Management for This Phase

| State | Category | Location | Source of truth | Persistence |
|---|---|---|---|---|
| Elapsed time, wind phase, sun angle | Per-frame | **Mutable `worldState` object** | Client, derived from real clock | None |
| User timezone | Server data | Passed as a prop from the Server Component | Postgres `users.timezone` | DB |
| Dev time-scrub override | Ephemeral UI | `useState` in the dev panel | Client | None — dev only |
| Audio muted | User preference | `localStorage` + React state | Client | Survives refresh |
| Reduced motion | Derived | `matchMedia`, mirrored into `worldState` | OS setting | N/A |
| Scholar phase offsets | Ephemeral | `useMemo`, seeded from placement ids | Client | Stable across renders, not across reloads |
| `worldSignals` | Server data | TanStack Query, passed down as props | Postgres, aggregated | DB |

## Error Handling

| Operation | Failure mode | User-facing behavior | Recovery strategy |
|---|---|---|---|
| Timezone lookup | Invalid/missing tz string | Fall back to UTC, then to browser-detected tz | Never crash the scene over a timezone |
| Audio load | File 404 or decode failure | Silence; visuals unaffected | Catch and log; audio is strictly additive |
| Audio play | Autoplay blocked | Stays muted, unmute button remains visible | Expected path, not an error |
| Wind shader | `onBeforeCompile` injection fails | Material renders unswayed | Wrap in try/catch, fall back to the base material |
| Particles | Shader compile failure | No particles; scene intact | Error boundary around the particle system alone |
| Scholars | Zero placements → no waypoints | Render zero scholars | `waypointsForIsland` returns empty; guard the count |
| Emissives | Asset has no emissive material | Skip silently | Naming-convention lookup returns undefined; no-op |
| Frame rate | Drops below 30fps | Dev overlay shows it | Phase 8 adds automatic quality degradation |

## Testing Requirements for This Phase

- [ ] `sunPositionForLocalTime(12)` returns peak altitude and `dayFactor` near 1
- [ ] `sunPositionForLocalTime(0)` returns minimum altitude and `dayFactor` near 0
- [ ] `dayFactor` is continuous — no discontinuity across the 23:59→00:00 boundary
- [ ] `skyPaletteFor` returns warm hues during golden hour and cool hues at night
- [ ] `positionAlongPath` returns the first waypoint at `t = 0` and loops cleanly at `t = 1`
- [ ] `positionAlongPath` reports `isDwelling: true` for the configured fraction of the loop
- [ ] `waypointsForIsland` returns an empty array for an empty island
- [ ] `heading` points along the direction of travel, not backward
- [ ] Reduced motion sets wind amplitude to 0
- [ ] Reduced motion disables the particle system
- [ ] Reduced motion disables idle camera drift
- [ ] Scholar count scales with placement count and caps at 8
- [ ] The scene graph contains exactly one `InstancedMesh` for all scholars
- [ ] Draw calls stay under 100 with 20 props, 8 scholars, and particles all active

**Test type guidance:**
- `src/domain/world/sun.ts` and `wander.ts` → **unit tests**, exhaustive. Pure math, no three.js, highest value in the phase.
- Reduced-motion gating → **unit tests** on the hook plus assertions that each system reads it. This is the requirement most likely to be silently dropped.
- Scene graph node and instance counts → **`@react-three/test-renderer`**, smoke level.
- Shader compilation cannot be meaningfully unit tested — cover it with a Phase 9 Playwright check asserting no WebGL console errors.
- **Do not attempt visual regression testing.** A day/night cycle is non-deterministic by design and the maintenance cost is enormous.

## Acceptance Criteria

- [ ] The island's lighting matches the user's real local time on load
- [ ] The dev time scrubber sweeps dawn → day → golden hour → dusk → night with no visible discontinuity
- [ ] Windows and lanterns ignite during dusk, staggered rather than simultaneously
- [ ] Trees and foliage sway continuously; their shadows sway with them
- [ ] Between 1 and 8 scholars wander between placed objects, pausing to dwell
- [ ] Scholars are not synchronized — they move at different phases and speeds
- [ ] Dust motes drift during the day; fireflies appear at night
- [ ] The audio toggle unmutes an ambient bed that differs between day and night
- [ ] Orbiting near a fountain audibly changes the stereo mix
- [ ] Leaving the camera untouched for 4 seconds starts a slow drift; any input stops it instantly
- [ ] Placing a new object plays a reveal animation rather than popping in
- [ ] The study shelf visibly fills as total study hours increase
- [ ] With OS reduced-motion enabled: no wind, no particles, no camera drift, scholars static, day/night still correct
- [ ] Draw calls remain under 100 with everything active
- [ ] `/study` is unaffected — no new bundle weight, no new dependencies on its route

**Verification commands:**
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

**Reduced-motion check:** macOS System Settings → Accessibility → Display → Reduce motion. Reload `/island` and confirm every animated system is quiet.

**Boundary check** (must print nothing):
```bash
rg -n "from '@/server" src/game
```

**Smoke test:** Open `/island` in the evening — the island should already be lit for dusk with windows glowing. Drag the dev time scrubber to noon: shadows shorten, the sky brightens, windows fade out, dust motes appear. Scrub to 21:00: the sky deepens, windows ignite one by one over about a minute and a half, fireflies fade in. Watch a scholar walk from the shelf to the fountain, pause, and move on. Unmute — crickets at night, birds at noon. Orbit past the fountain and hear it pan across the stereo field. Stop touching the mouse for 4 seconds and watch the camera begin drifting. Place a new lantern — it springs into being with a dust puff rather than appearing instantly.

## Handoff to Next Phase

Phase 4 delivers a world that reads as inhabited. A single `<WorldClock />` drives shared per-frame state consumed by every system. Day/night is computed from the user's real timezone with a stylized arc that over-weights golden hour, driving light color, intensity, sun position, sky gradient, fog, and staggered emissive ignition at dusk. Wind is a vertex-shader displacement injected via `onBeforeCompile`, applied to the depth material too so shadows stay attached. Between one and eight instanced scholars wander a waypoint loop derived from the user's own placements, bobbing and dwelling out of phase with each other. GPU particles cross-fade dust → leaves → fireflies with the day factor. Positional audio provides a day/night ambient bed plus per-prop emitters, muted by default behind a remembered toggle. The camera drifts when idle. New placements reveal with a spring and a dust puff. A study shelf reads real study history. Every animated system honors `prefers-reduced-motion`.

**Codebase state:** the world is alive and the draw-call budget holds. What is still missing is the *reward moment* — sessions end with a number going up and nothing else.

**Known shortcuts taken:**
- Emissive variation is per-group, not per-instance; fine at current asset counts, revisit if a single emissive group grows past ~30.
- Scholars glide and bob rather than walking with articulated legs. This is a committed stylistic choice — do not half-fix it later with poor rigging.
- Environmental storytelling is one prop (the study shelf). Trophy walls and streak lanterns are deferred.
- Two-stage scaffolding reveal for large structures is deferred to Phase 5.
- The dev time scrubber must be excluded from the production bundle — verify in Phase 8.

**Phase 5 should start with** the loot table domain module and the seeded RNG, because the entire chest sequence is downstream of knowing what is in the chest. `focus_sessions.loot_seed` has been generated and stored since Phase 2 and is still unused — that is the input.

**Open questions for next phase:**
- Whether the chest opens on the `/study` result screen (2D, immediate, no canvas load) or by navigating to `/island` (3D, higher production value, adds friction). Recommendation: reveal in 2D on the result screen for immediacy, then place the item on the island with a Phase 4 reveal animation when they next visit — two dopamine hits from one drop.
- Whether rare drops should interrupt an active study session with a notification. Recommendation: no. Interrupting focus to deliver a focus reward is self-defeating.
