# Phase 3: 3D World Foundation

> **Feature:** Aloft — 3D Study Game
> **Phase:** 3 of 9
> **Depends on:** `01-phase-foundation.md`, `02-phase-focus-session-engine.md`
> **Estimated scope:** Large (4–5 hours)

## Context from Previous Phase

**What Aloft is:** a web app that turns studying into a game. Students run verified focus sessions; verified minutes pay **Focus ⚡** currency and correct recall pays **Insight 💎**. Both are spent building a persistent 3D floating island that grows and lights up at the user's real local nighttime. Target users are students, board-exam takers, and grad students who want to study but can't hold focus.

**Phase 1** built the skeleton: Next.js 15 App Router, React 19, TypeScript strict, Tailwind, Drizzle + Neon Postgres, Auth.js v5 with Google. Four layers enforced by ESLint — `app → server → domain`, `app → game → domain`, `domain` imports nothing, **`game` may never import `server`**.

**Phase 2** built the server-authoritative focus session engine. `/api/session/{start,beat,end,active}` are live. `/study` is a complete plain 2D timer that verifies focus via Page Visibility, beats every 15s, and pays Focus currency on completion. **No 3D exists yet** — `src/game/` is empty and three.js is not installed.

**Files that matter for this phase:**
- `src/lib/api-response.ts` — `handleRoute()` wrapper; every route handler uses it
- `src/server/errors.ts` — `AppError` with codes including `INSUFFICIENT_FUNDS`, `INVALID_STATE`, `NOT_FOUND`
- `src/server/auth.ts` — `auth()` returns the session with `user.id`
- `src/server/repositories/island.ts` — created in Phase 1, currently minimal
- `src/server/repositories/user-stats.ts` — `incrementBalances(tx, userId, { focus?, insight?, xp? })`, SQL-side increments
- `src/app/(app)/layout.tsx` — authed shell with nav (Study / Notes / Review / Island) and a currency HUD
- `src/app/(app)/island/page.tsx` — **placeholder. This phase replaces it.**
- `src/app/providers.tsx` — TanStack Query provider, `staleTime: 30_000`
- `jest.config.ts` — **already contains the `transformIgnorePatterns` for three.js ESM** and a `moduleNameMapper` for `.glsl` files. Phase 1 pre-configured this.

**Database tables relevant to this phase** (already migrated in Phase 1):

`islands` — `id` uuid PK, `user_id` FK unique (one island per user), `theme` text default `'meadow'`, `tile_count` int default 9.

`placements` — `id` uuid PK, `island_id` FK cascade, `asset_id` text, `x` int, `z` int, `rot_y` int (quarter turns 0–3), `placed_at` timestamptz.
**Has a unique index on `(island_id, x, z)`** — one object per tile, enforced by the database, not by application logic.

`user_stats` — `focus_balance`, `insight_balance`, `xp`, `level`, `streak_days`, `streak_freezes`, `pity_counter`. **Balances are server-written only.**

A user's `islands` row is created at first sign-in by the Phase 1 bootstrap transaction, so it always exists.

## Existing Codebase Context

- `src/server/repositories/island.ts` — extend this; it's the only place allowed to query `islands`/`placements`
- `src/domain/economy/currency.ts` — currency math lives here; placement pricing joins it in this phase
- `src/app/(app)/study/_components/focus-timer.tsx` — the reference for how this project structures a client component under a Server Component page
- `src/lib/env.ts` — Zod-validated env; add `NEXT_PUBLIC_ASSET_BASE_URL` here, not `process.env` inline

## Objective

Build the 3D island: an offline asset pipeline that turns Tripo3D output into web-ready GLBs with a typed manifest, an R3F canvas that lazy-loads outside the main bundle, a tile-grid island, an orbit camera, raycast-based build placement, and server-authoritative persistence of what the user built.

Sequenced after Phase 2 because placement costs currency, and currency has to be real and non-cheatable before anything can spend it.

**Aliveness (day/night, wind, NPCs, particles, audio) is Phase 4.** This phase produces a correct but static world. Resist the urge to add motion here — the systems architecture in Phase 4 depends on this layer being clean.

## Architecture Decisions

### Decision: No physics engine
- **Choice:** Raycasting against an invisible ground plane for placement. No Rapier, no cannon.
- **Alternatives considered:** `@react-three/rapier` for realistic object settling
- **Rationale:** An idle grid-based builder needs a ray-plane intersection and a grid snap — roughly 20 lines. A physics engine adds ~600KB gzipped, a WASM load, a fixed-timestep loop, and an entire class of nondeterminism bugs, in exchange for nothing this game design uses.
- **Tradeoff:** No physically-settled props or knock-over interactions. Not part of the design.

### Decision: Assets are optimized offline and committed, not processed at runtime
- **Choice:** A `scripts/optimize-assets.ts` build step reads `assets/raw/*.glb`, runs the glTF-Transform chain, writes `public/models/*.glb`, and **generates a typed manifest**.
- **Alternatives considered:** Runtime Draco decode of unoptimized files; a serverless optimization endpoint
- **Rationale:** Tripo3D output is high-poly with large textures — often 5–20MB per prop. Shipping that is not viable. Doing the work offline means the browser only ever downloads finished assets, and the generated manifest gives compile-time errors for missing or misspelled asset ids.
- **Tradeoff:** Adding a prop requires re-running a script. Acceptable — it runs in seconds and is a natural part of the art workflow.

### Decision: One `InstancedMesh` per asset type
- **Choice:** Group placements by `assetId` and render each group as a single `InstancedMesh`.
- **Alternatives considered:** One `<mesh>` per placement
- **Rationale:** The draw-call budget is under 100. A mature island could hold 200+ props. Individual meshes blow the budget instantly; instancing renders 50 identical lanterns in one call.
- **Tradeoff:** Per-instance material variation requires instanced attributes. Not needed — Tripo output is single-material per prop, which is exactly what instancing wants.

### Decision: The canvas is lazy-loaded and the study features never depend on it
- **Choice:** `next/dynamic(() => import('@/game/island-canvas'), { ssr: false })`. `/study`, `/notes`, and `/review` import nothing from `src/game/`.
- **Rationale:** three.js + drei is ~600KB gzipped. A student on a Chromebook must still be able to study and review even if WebGL is unavailable or the GPU is starved.
- **Tradeoff:** A brief loading state on `/island`. Correct — the island is the reward layer, not the product's core utility.

### Decision: The server prices and validates every placement
- **Choice:** `POST /api/island/place` checks the asset exists, the tile is free and in bounds, and the user can afford it; then debits and inserts in one transaction.
- **Rationale:** Same principle as Phase 2's session engine. A client-side price check is a suggestion.
- **Tradeoff:** Placement has network latency. Mitigate with an optimistic ghost that rolls back on rejection — never an optimistic *balance* change.

---

## Implementation Steps

### Step 1: Install 3D dependencies

**What:** Add three.js and the R3F ecosystem.

**File(s):** `package.json`

**Details:**

```bash
pnpm add three @react-three/fiber @react-three/drei
pnpm add -D @types/three @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions @gltf-transform/cli sharp
```

Use **`@react-three/fiber` v9** — it is the React 19-compatible line. v8 will not work with React 19.

Do **not** install `@react-three/postprocessing` yet — Phase 5 adds it for the rare-drop bloom spike. Do not install `@react-three/rapier` at all.

---

### Step 2: Asset optimization pipeline

**What:** The script that turns raw Tripo3D GLBs into shippable ones plus a typed manifest.

**File(s):**
- `scripts/optimize-assets.ts`
- `assets/raw/.gitkeep` — drop Tripo3D exports here
- `assets/asset-meta.json` — hand-authored metadata per asset
- `src/game/assets/manifest.generated.ts` — **generated, git-ignored is wrong: commit it** so CI typechecks without running the pipeline

**Details:**

`assets/asset-meta.json` is where you declare intent per asset:
```json
{
  "lantern_brass": {
    "category": "prop",
    "footprint": [1, 1],
    "priceFocus": 120,
    "priceInsight": 0,
    "rarity": "common",
    "targetTriangles": 2000
  }
}
```

The script, for each `assets/raw/*.glb`:
1. Read with `@gltf-transform/core`
2. `dedup()` → `weld()` → `prune()`
3. `simplify({ ratio, error: 0.01 })` targeting the asset's `targetTriangles`
4. `textureCompress({ targetFormat: 'ktx2', ... })` — ETC1S for props, UASTC for hero pieces; resize props to 512, hero assets to 1024
5. `meshopt()` for geometry compression
6. Write to `public/models/<id>.glb`
7. Record actual byte size and triangle count

Then emit `src/game/assets/manifest.generated.ts`:
```ts
export const ASSET_MANIFEST = {
  lantern_brass: {
    id: 'lantern_brass',
    url: '/models/lantern_brass.glb',
    bytes: 41_233,
    triangles: 1_940,
    category: 'prop',
    footprint: [1, 1],
    priceFocus: 120,
    priceInsight: 0,
    rarity: 'common',
  },
} as const;

export type AssetId = keyof typeof ASSET_MANIFEST;
```

`AssetId` as a union type is the payoff: every reference to an asset anywhere in the codebase is now compile-time checked.

**The script must fail loudly** if any asset exceeds 150KB or 5,000 triangles after optimization. A budget that isn't enforced is a budget that's already blown.

Add `"assets:optimize": "tsx scripts/optimize-assets.ts"` to `package.json`.

> **ANTI-PATTERN: Runtime asset optimization**
> ❌ Don't: load raw GLBs and decimate in the browser.
> ✅ Instead: optimize offline, ship finished files.
> 💡 Why: a 15MB Tripo3D export takes seconds to download and blocks the main thread while parsing. Users leave.

> **ANTI-PATTERN: Hand-maintained asset id strings**
> ❌ Don't: `<Prop assetId="lantern_brass" />` with `assetId: string`.
> ✅ Instead: `assetId: AssetId` from the generated manifest.
> 💡 Why: a typo becomes a compile error instead of an invisible missing model in production.

**Asset generation note:** Tripo3D is the primary source. You also have `generate_image` + `generate_3d` available through the Higgsfield MCP server in Claude Code — worth A/B-ing both on the same concept art before committing the whole prop library to one vendor.

---

### Step 3: Grid ↔ world coordinate domain module

**What:** Pure math for the tile grid. Lives in `domain`, not `game`, because the server validates placements with the same functions.

**File(s):** `src/domain/island/grid.ts`, `src/domain/island/constants.ts`

**Details:**

```ts
export const TILE_SIZE = 2;

export function gridToWorld(coord: GridCoord): { x: number; z: number };
export function worldToGrid(pos: { x: number; z: number }): GridCoord;
export function isInBounds(coord: GridCoord, tileCount: number): boolean;
export function tilesForFootprint(origin: GridCoord, footprint: [number, number], rotY: number): GridCoord[];
```

`tileCount` is a square side length — `tile_count: 9` means a 9×9 grid centered on the origin, so valid coordinates run −4…4.

`tilesForFootprint` matters for multi-tile buildings: a 2×1 building rotated 90° occupies different tiles. Both the client preview and the server validator call this, which is exactly why it lives in `domain`.

> **ANTI-PATTERN: Duplicating grid math between client and server**
> ❌ Don't: write the snap logic in the R3F component and the bounds check in the service.
> ✅ Instead: one implementation in `src/domain/island/grid.ts`, imported by both.
> 💡 Why: Consistency. If they drift, the client shows a valid placement the server rejects — the most confusing possible failure mode.

---

### Step 4: Zustand game store

**What:** Ephemeral client state for the 3D scene.

**File(s):** `src/game/store/island-store.ts`

**Details:**

```ts
interface IslandState {
  mode: 'view' | 'build';
  selectedAssetId: AssetId | null;
  hoveredTile: GridCoord | null;
  ghostRotation: number;              // 0-3 quarter turns
  placements: Placement[];            // hydrated from TanStack Query
  setMode: (m: 'view' | 'build') => void;
  // ...
}
```

**What belongs here:** build mode, selected asset, hovered tile, ghost rotation, and the hydrated placement list.

**What must NOT belong here:** currency balances (TanStack Query owns those), per-frame animation values (refs in `useFrame`), or camera position (the camera controller's own ref).

`hoveredTile` updates on every pointer move, which can be 60+ times per second. Read it inside `useFrame` via `useIslandStore.getState()` — the **transient** pattern — not via `useIslandStore(s => s.hoveredTile)`, which would re-render React at pointer-move frequency.

> **ANTI-PATTERN: Server data in Zustand**
> ❌ Don't: put `focusBalance` in the island store and sync it after mutations.
> ✅ Instead: TanStack Query owns server data; invalidate after a placement succeeds.
> 💡 Why: State Synchronization. Two sources of truth for a balance produce a UI that says you can afford something the server refuses.

> **ANTI-PATTERN: React state inside `useFrame`**
> ❌ Don't: `const [t, setT] = useState(0); useFrame(() => setT(t + 0.01))`.
> ✅ Instead: `const ref = useRef(); useFrame((_, dt) => { ref.current.rotation.y += dt })`.
> 💡 Why: a `setState` at 60fps triggers 60 React reconciliations per second and destroys the frame budget.

---

### Step 5: Canvas shell and scene root

**What:** The R3F canvas, code-split away from everything else.

**File(s):**
- `src/game/island-canvas.tsx` — the dynamic import target
- `src/game/scene/island-scene.tsx` — scene root
- `src/game/scene/lighting.tsx` — static lighting (Phase 4 makes it dynamic)
- `src/app/(app)/island/page.tsx` — Server Component; fetches island + placements, renders the dynamic canvas

**Details:**

`island-canvas.tsx`:
```tsx
export const IslandCanvas = ({ island, placements }: Props) => (
  <Canvas
    shadows
    dpr={[1, 2]}
    gl={{ antialias: true, powerPreference: 'high-performance' }}
    camera={{ position: [12, 10, 12], fov: 45 }}
  >
    <Suspense fallback={null}>
      <IslandScene island={island} placements={placements} />
    </Suspense>
  </Canvas>
);
```

`dpr={[1, 2]}` caps device pixel ratio at 2 — on a 3× phone screen, uncapped DPR renders 9× the pixels for no visible gain.

Page-level:
```tsx
const IslandCanvas = dynamic(() => import('@/game/island-canvas').then(m => m.IslandCanvas), {
  ssr: false,
  loading: () => <IslandSkeleton />,
});
```

`ssr: false` is mandatory — three.js touches `window` at import time.

Lighting for this phase: one `directionalLight` with shadows, one `ambientLight`, and drei's `<Environment preset="sunset" />` for image-based lighting. Keep it in its own file so Phase 4 can swap in the time-driven version without touching the scene root.

> **ANTI-PATTERN: Importing the canvas statically**
> ❌ Don't: `import { IslandCanvas } from '@/game/island-canvas'` at the top of the page.
> ✅ Instead: `next/dynamic` with `ssr: false`.
> 💡 Why: a static import pulls ~600KB of three.js into the shared bundle, slowing `/study` for a feature it never uses.

---

### Step 6: Island terrain

**What:** The floating island the props sit on.

**File(s):** `src/game/scene/island-terrain.tsx`, `src/game/scene/grid-overlay.tsx`

**Details:**

For MVP the terrain is a low-poly disc or rounded box with a tapered underside — authored in Tripo3D as `island_base_<theme>` and loaded from the manifest like any other asset, so themes are swappable via `islands.theme`.

`grid-overlay.tsx` renders tile outlines **only in build mode**. Use a single instanced plane per tile with a translucent material, or a shader on one large plane. Do not create 81 individual meshes.

`tile_count` scales the visible surface. When it increases (a purchased expansion), the island must grow visibly — Phase 4 adds the reveal animation; here it just renders at the right size.

---

### Step 7: Instanced prop rendering

**What:** Render every placement, within the draw-call budget.

**File(s):** `src/game/entities/placed-props.tsx`, `src/game/assets/use-asset.ts`

**Details:**

`use-asset.ts` wraps drei's `useGLTF` with manifest-typed ids and preloads:
```ts
export function useAsset(id: AssetId): { geometry: BufferGeometry; material: Material };
```

`placed-props.tsx`:
1. Group `placements` by `assetId`
2. For each group, render one `<instancedMesh>` sized to the group length
3. In a `useLayoutEffect`, write each instance's matrix from `gridToWorld(x, z)` + `rot_y * (π/2)`, then set `instanceMatrix.needsUpdate = true`
4. Call `computeBoundingSphere()` on the instanced mesh — without it, frustum culling misbehaves and props vanish at certain camera angles

Add a dev-only overlay reading `gl.info.render.calls` and `gl.info.render.triangles`, visible when `NODE_ENV === 'development'`. A budget you can't see is a budget you'll blow.

> **ANTI-PATTERN: One mesh per placement**
> ❌ Don't: `placements.map(p => <mesh key={p.id} ... />)`.
> ✅ Instead: group by `assetId`, one `InstancedMesh` per group.
> 💡 Why: 200 props = 200+ draw calls against a budget of 100. Instancing makes it ~10.

> **ANTI-PATTERN: Rebuilding instance matrices every frame**
> ❌ Don't: write matrices inside `useFrame`.
> ✅ Instead: write them in `useLayoutEffect` keyed on the placements array. Static props don't move.
> 💡 Why: matrix writes are pure overhead for objects that never change. Phase 4's animated props are a deliberate, separate exception.

---

### Step 8: Camera controller

**What:** An orbit camera with sane constraints.

**File(s):** `src/game/systems/camera-controller.tsx`

**Details:**

Use drei's `<OrbitControls />` with:
- `enablePan={false}` — panning off a small island only gets users lost
- `minPolarAngle={0.2}`, `maxPolarAngle={Math.PI / 2.2}` — never below the horizon, never straight down
- `minDistance={6}`, `maxDistance={30}`
- `enableDamping`, `dampingFactor={0.08}` — instant-stop camera movement reads as cheap

Phase 4 adds idle drift on top of this. Structure the component so an external system can nudge the camera without fighting `OrbitControls` — expose the controls ref.

---

### Step 9: Build mode and placement

**What:** Pick an asset, see a ghost preview snapped to the grid, click to place.

**File(s):**
- `src/game/systems/build-controller.tsx` — raycast, snap, ghost
- `src/game/entities/ghost-preview.tsx` — the translucent preview
- `src/components/island/build-palette.tsx` — the 2D asset picker (HTML overlay, not in-canvas)

**Details:**

`build-controller.tsx` renders a large invisible plane at `y = 0` with `onPointerMove` / `onClick`. R3F gives the intersection point directly; pass it through `worldToGrid()` and write the result to `hoveredTile` in the store.

Ghost preview states:
- **Valid** — the asset's geometry, translucent, tinted green-ish
- **Invalid** (occupied / out of bounds / unaffordable) — tinted red, click does nothing
- Rotate with the `R` key, cycling `ghostRotation` 0→3

The build palette is **plain HTML/Tailwind positioned over the canvas**, not a drei `<Html>` element inside the scene. It shows each asset's icon, name, and price, and dims what the user can't afford.

Placement flow:
1. Click → optimistically add a ghost placement to the Zustand store
2. `POST /api/island/place`
3. Success → invalidate the placements and stats queries; the ghost is replaced by real data
4. Failure → remove the ghost, show a toast with the server's reason

**Never optimistically update the currency balance.** Optimistic placement is a rollback-able visual; an optimistic balance is a lie about money.

> **ANTI-PATTERN: Optimistic currency**
> ❌ Don't: decrement `focusBalance` client-side on click.
> ✅ Instead: optimistically render the object; let the server return the authoritative balance.
> 💡 Why: if the server rejects, the user saw a balance that was never real. Money is the one thing that must never be optimistic.

> **ANTI-PATTERN: Client-side price checks as the only gate**
> ❌ Don't: disable the button when unaffordable and consider it handled.
> ✅ Instead: dim it client-side *for UX*, and check again server-side *for correctness*.
> 💡 Why: the client check is a courtesy. The server check is the rule.

---

### Step 10: Placement API and service

**What:** Server-authoritative placement.

**File(s):**
- `src/server/services/island.ts`
- `src/app/api/island/route.ts` — `GET`
- `src/app/api/island/place/route.ts` — `POST`
- `src/app/api/island/place/[id]/route.ts` — `DELETE`
- `src/server/repositories/island.ts` — extend

**Details:**

`placeAsset({ userId, assetId, x, z, rotY })`, in **one transaction**:
1. Look up the asset in `ASSET_MANIFEST` — not found → `VALIDATION`
2. Load the island; compute occupied tiles via `tilesForFootprint`
3. `isInBounds` for every tile → else `VALIDATION`
4. Any tile occupied → `INVALID_STATE`
5. Balance check against `priceFocus` / `priceInsight` → else `INSUFFICIENT_FUNDS`
6. `incrementBalances(tx, userId, { focus: -priceFocus, insight: -priceInsight })`
7. Insert the placement
8. Catch the unique-constraint violation on `(island_id, x, z)` and rethrow as `INVALID_STATE` — this is the race-condition backstop

`removePlacement` refunds 50%. Refunding in full makes placement consequence-free; refunding nothing punishes experimentation. 50% is the standard compromise and it keeps building playful.

> **ANTI-PATTERN: Check-then-insert without catching the constraint**
> ❌ Don't: rely on step 4's occupancy query alone.
> ✅ Instead: keep the query *and* catch the unique violation.
> 💡 Why: two rapid double-clicks race between the check and the insert. The query is for a good error message; the constraint is for correctness.

---

### Step 11: Loading, empty, and failure states

**What:** The paths that aren't the happy one.

**File(s):** `src/components/island/island-skeleton.tsx`, `src/game/scene/asset-error-boundary.tsx`, `src/app/(app)/island/error.tsx`

**Details:**

- **Loading:** a Tailwind skeleton with a progress indicator driven by drei's `useProgress`. Assets total several MB — a blank screen reads as broken.
- **Empty island:** a first-time user sees bare terrain. Show a prompt: "Study to earn Focus, then build your first structure." Do not show an empty build palette with everything greyed out — that reads as broken rather than aspirational.
- **WebGL unavailable:** detect before mounting the canvas; render a 2D fallback listing what they've built as cards, plus an explanation. **The study features must remain fully usable.**
- **Single asset fails to load:** an error boundary around each instanced group so one bad GLB doesn't blank the whole island.

---

## State Management for This Phase

| State | Category | Location | Source of truth | Persistence |
|---|---|---|---|---|
| Island + placements | Server data | TanStack Query → hydrates Zustand | Postgres `islands`, `placements` | DB |
| Build mode, selected asset | UI | Zustand | Client | None |
| Hovered tile, ghost rotation | Ephemeral | Zustand, read transiently in `useFrame` | Client | None |
| Camera position | Ephemeral | `OrbitControls` internal ref | Client | None |
| Currency balances | Server data | TanStack Query | Postgres `user_stats` | DB |
| Asset load progress | Ephemeral | drei `useProgress` | three.js loading manager | None |

## Error Handling

| Operation | Failure mode | User-facing behavior | Recovery strategy |
|---|---|---|---|
| Canvas mount | WebGL unsupported | 2D fallback listing built objects; study features unaffected | Feature-detect before mounting |
| Asset load | GLB 404 / corrupt | That prop group renders nothing; rest of island intact | Per-group error boundary; log the asset id |
| Asset load | Slow network | Skeleton with real progress | drei `useProgress`; never a blank canvas |
| Place asset | Tile occupied | Ghost turns red; click is inert | Client check via `tilesForFootprint`; server constraint as backstop |
| Place asset | Out of bounds | Ghost turns red | `isInBounds` |
| Place asset | Insufficient funds | Palette item dimmed with the price shown; toast if attempted | Server returns `INSUFFICIENT_FUNDS` |
| Place asset | Network failure | Optimistic ghost removed, toast with retry | Roll back the Zustand entry; never touch the balance |
| Place asset | Race — two placements, one tile | Second gets `INVALID_STATE`, ghost removed | Unique constraint on `(island_id, x, z)` |
| Remove placement | Not owned by user | 404 | Ownership verified in the service via island join |
| Frame rate | Below 30fps | Dev overlay shows draw calls/triangles | Phase 8 adds automatic quality degradation |

## Testing Requirements for This Phase

- [ ] `gridToWorld` and `worldToGrid` round-trip exactly for every in-bounds coordinate
- [ ] `worldToGrid` snaps points near a tile edge to the correct tile
- [ ] `isInBounds` rejects coordinates outside a 9×9 grid (valid range −4…4)
- [ ] `tilesForFootprint` returns different tiles for a 2×1 asset at rotation 0 vs 1
- [ ] Placing on an occupied tile throws `INVALID_STATE`
- [ ] Placing out of bounds throws `VALIDATION`
- [ ] Placing without enough Focus throws `INSUFFICIENT_FUNDS` **and does not create a row**
- [ ] A successful placement debits the balance and inserts the row atomically
- [ ] Two concurrent placements on one tile: exactly one succeeds
- [ ] Removing a placement refunds exactly 50%, rounded down
- [ ] Placing an `assetId` absent from the manifest throws `VALIDATION`
- [ ] The scene graph contains one `InstancedMesh` per distinct `assetId`
- [ ] Instance count equals the number of placements for that asset
- [ ] The optimize script fails when an asset exceeds 150KB or 5,000 triangles

**Test type guidance:**
- `src/domain/island/grid.ts` → **unit tests**, exhaustive, no mocks. Cheapest high-value tests in the phase.
- Placement service including the race → **integration tests against a real Postgres**. The unique constraint is the correctness mechanism; mocking it tests nothing.
- Scene graph assertions → **`@react-three/test-renderer`**, smoke level. Assert node counts and instance counts. Do not attempt visual regression.
- Build palette and toasts → **RTL**, behavior only.
- The asset script's budget enforcement → **unit test** with a fixture GLB.

## Acceptance Criteria

- [ ] `pnpm assets:optimize` processes `assets/raw/*.glb` into `public/models/` and regenerates the manifest
- [ ] Every optimized asset is under 150KB and 5,000 triangles; the script fails otherwise
- [ ] `AssetId` is a union type and a typo in an asset id is a compile error
- [ ] `/island` renders a floating island with an orbit camera; drag rotates, scroll zooms, pan is disabled
- [ ] Entering build mode shows the tile grid and the asset palette
- [ ] Hovering shows a ghost snapped to the tile under the cursor
- [ ] `R` rotates the ghost in 90° increments
- [ ] The ghost turns red on occupied, out-of-bounds, or unaffordable tiles
- [ ] Clicking a valid tile places the object; the Focus balance decreases by the listed price
- [ ] **Refreshing the page shows the object still there**
- [ ] Removing an object refunds 50%
- [ ] The dev overlay reports **fewer than 100 draw calls** with 20+ props placed
- [ ] `/study` still works with WebGL disabled in the browser
- [ ] The three.js bundle does not appear in the `/study` route's JS payload

**Verification commands:**
- `pnpm assets:optimize`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build` — then inspect the route-level bundle report and confirm `/study` does not include three.js

**Boundary check** (must print nothing):
```bash
rg -n "from '@/server" src/game
```

**Smoke test:** Sign in, run a short focus session on `/study` to earn Focus, then go to `/island`. The island loads with a skeleton, then renders. Drag to orbit; scroll to zoom. Click "Build," pick a lantern, hover the grid — a green ghost snaps tile to tile. Press `R` to rotate. Click an empty tile — the lantern appears and the HUD balance drops. Try the same tile again — the ghost is red and clicking does nothing. Refresh the page: the lantern is still there. Place 20 objects and confirm the dev overlay stays under 100 draw calls.

## Handoff to Next Phase

Phase 3 delivers a working, persistent 3D island. `scripts/optimize-assets.ts` converts Tripo3D exports into web-ready GLBs with enforced size budgets and emits `src/game/assets/manifest.generated.ts`, whose `AssetId` union makes every asset reference compile-time safe. `src/domain/island/grid.ts` holds grid math shared by client and server. `/island` lazy-loads an R3F canvas with an orbit camera, instanced prop rendering (one draw call per asset type), raycast build placement with a ghost preview, and server-authoritative placement that debits currency and inserts atomically, backstopped by a unique tile constraint. WebGL-unavailable and asset-failure paths degrade gracefully, and the study features have zero dependency on `src/game/`.

**Codebase state:** the full study→earn→build loop works. The world is **correct but static** — nothing moves, lighting is fixed, there are no NPCs, no particles, and no sound.

**Known shortcuts taken:**
- `src/game/scene/lighting.tsx` is deliberately static and isolated so Phase 4 can replace it wholesale.
- `island_base_<theme>` exists for one theme only; theme switching is unimplemented.
- `camera-controller.tsx` exposes its controls ref specifically so Phase 4 can add idle drift without forking it.
- No `prefers-reduced-motion` handling — nothing moves yet. Phase 4 introduces it alongside the first motion.

**Phase 4 should start with** the day/night system, because it touches lighting, sky, and material emissives at once and every other aliveness system layers on top of the resulting light state. Read `users.timezone` — it is populated and unused so far.

**Open questions for next phase:**
- Whether ambient scholar NPCs should be instanced with a shared animation offset (cheap, slightly uniform) or individual skinned meshes (expensive, more characterful). Recommendation: instanced with per-instance phase offset — at the intended camera distance the difference is invisible and the draw-call saving is large.
- Whether audio should autoplay. Browsers block audio before a user gesture. Recommendation: start muted with an obvious unmute affordance rather than fighting autoplay policy.
