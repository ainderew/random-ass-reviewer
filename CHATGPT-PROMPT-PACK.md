# Aloft — ChatGPT Prompt Pack

Copy-paste sheet for generating the Aloft prop library in ChatGPT, then converting via Tripo3D.

> A deeper **ART-BIBLE.md** is being researched and will land alongside this file with verified
> Tripo3D constraints, glTF-Transform commands, and texture guidance. This pack is the part you
> can start using immediately.

---

## The single most important workflow decision

**Generate 3-view turnaround sheets, not single images.**

Tripo3D has a multi-image mode (`multi_image_to_3d`) that takes 2–4 views of the same object and
produces substantially better geometry than single-image reconstruction — it can actually see the
back and sides instead of hallucinating them. One extra sentence in your prompt, meaningfully
better meshes.

Generate the sheet → crop into separate images → feed all of them to Tripo3D together.

---

## How to keep 20 assets looking like one game

This is the part everyone gets wrong. AI image generation drifts, and twenty props made across
twenty separate chats will look like twenty different games.

**Do this:**

1. Open **one** ChatGPT conversation. Use it for the entire library. Don't start fresh chats.
2. Paste the **Style Contract** below as your first message. Let it acknowledge.
3. Generate the **style anchor** first — the brass lantern post. It's small, has a clear
   silhouette, uses four of the six palette colors, and includes an emissive element. It's the
   cheapest asset to iterate on until the look is right.
4. Once the anchor is right, every subsequent request is short: *"Same style and palette. Now a
   wooden bench."* Context does the work.
5. When drift creeps in (it will, around asset 8–10), re-paste the Style Contract and attach the
   anchor image as a reference.

---

## 1. The Style Contract

Paste this once, at the top of the conversation.

```
We are generating a series of 3D game asset reference images for a cozy low-poly study game
called Aloft. Every image in this series must follow the same contract. Acknowledge it, then
wait for me to name objects one at a time.

STYLE CONTRACT

Look: cozy low-poly stylized 3D game asset. Chunky simplified geometry. Flat shading with soft
ambient occlusion only. Bold, readable silhouette. No fine surface detail, no scratches, no
weathering, no grain, no fabric weave, no wood grain. Rounded, slightly exaggerated proportions —
friendly and hand-made, like a wooden toy.

Palette — use only these six colours:
  #C96F4A terracotta   (roofs, clay, warm accents)
  #7D9B76 sage green   (foliage, grass)
  #F2E8D5 cream        (walls, stone, plaster)
  #2E4A4E deep teal    (metal, shadow shapes, trim)
  #E8B04B amber        (light sources, brass, glow)
  #8EC5D6 sky blue     (glass, water, cool accents)

Presentation — this is the critical part, these images become 3D models:
  - ONE object only. Nothing else in the frame. No companion objects, no props, no set dressing.
  - Plain flat neutral mid-grey background (#8A8A8A). No gradient, no vignette, no scene, no floor.
  - NO cast shadow. NO ground contact shadow. NO reflections. Nothing beneath the object.
  - Soft, even, frontal lighting. No dramatic side light, no rim light, no hard highlights.
  - Object centred, fully in frame, with even margins on all sides. Not cropped.
  - No text, no lettering, no labels, no logos, no signage anywhere on the object.
  - No humans, no hands, no faces.

Reply "Contract acknowledged" and nothing else.
```

**Why the shadow rule is in caps:** image-to-3D reconstructs a cast shadow as *geometry*. You get a
lantern with a mysterious dark slab fused to its base. This is the number-one cause of unusable
meshes.

---

## 2. Single-object template

```
Same style contract. Generate: {OBJECT}.

{OBJECT} = a brass lantern on a slim wooden post, four glass panes, a small warm flame inside,
           simple iron cap on top

Three-quarter view from slightly above eye level. Object centred on plain #8A8A8A background,
no shadow, no ground plane.
```

---

## 3. Three-view turnaround template — use this one

```
Same style contract. Generate a 3-view turnaround reference sheet of: {OBJECT}.

Layout: three copies of the SAME object side by side in one wide image, evenly spaced,
all at identical scale and identical lighting, all on the same plain #8A8A8A background.
  Left   — front view, straight on at eye level
  Centre — three-quarter view, rotated 45 degrees, slightly above eye level
  Right  — side view, straight on at eye level

The object must be geometrically identical in all three views — same proportions, same details,
same colours, just rotated. This is an orthographic-style model sheet, not three different objects.

No shadows under any of the three. No dividing lines, no labels, no numbers, no text.
```

Then: crop into three images → Tripo3D `multi_image_to_3d`.

---

## 4. Worked example — the style anchor

Generate this one first and iterate until it's right. Everything else matches it.

```
Same style contract. Generate a 3-view turnaround reference sheet of: a brass lantern post.

The object: a slim wooden post about waist height, weathered cream-and-teal paint, with a small
four-sided brass lantern mounted at the top. The lantern has amber glass panes and a warm glow
inside. A simple curved iron bracket joins lantern to post. Chunky low-poly forms, flat shading,
rounded edges, friendly toy-like proportions.

Layout: three copies of the SAME object side by side in one wide image, evenly spaced, identical
scale and lighting, on plain #8A8A8A background.
  Left   — front view, straight on
  Centre — three-quarter view, rotated 45 degrees, slightly above eye level
  Right  — side view, straight on

Geometrically identical in all three views. No shadows, no ground plane, no labels, no text.
```

---

## 5. The scale system

**Non-negotiable.** Wrong scale destroys the illusion faster than wrong colour, and it's invisible
until you place two props next to each other.

One grass tile is **2 × 2 world units**. The scholar NPC at **1.7 units** is the human reference —
size everything against a person, not against the tile.

| Asset | Tier | Footprint (tiles) | Height (units) | Emissive |
|---|---|---|---|---|
| Grass tile | Starter | 1×1 | 0.2 | — |
| Dirt path tile | Starter | 1×1 | 0.2 | — |
| Flower patch | Starter | 1×1 | 0.3 | — |
| Stone marker | Starter | 1×1 | 0.6 | — |
| Wooden bench | Starter | 1×1 | 0.8 | — |
| Study desk | Mid | 1×1 | 1.0 | — |
| Stone well | Mid | 1×1 | 1.4 | — |
| Wooden signpost | Starter | 1×1 | 1.6 | — |
| **Scholar NPC** | — | — | **1.7** | — |
| Low bookshelf | Starter | 1×1 | 1.8 | — |
| **Brass lantern post** ★ | Starter | 1×1 | 2.2 | ✅ |
| Hanging paper lanterns | Mid | 2×1 | 2.5 | ✅ |
| Brass orrery | Monument | 1×1 | 2.5 | ✅ |
| Small round tree | Starter | 1×1 | 2.8 | — |
| Glass greenhouse | Mid | 2×2 | 3.0 | ✅ |
| Stone archway | Mid | 2×1 | 3.2 | — |
| Scholar's cottage | Mid | 2×2 | 3.5 | ✅ |
| Tall pine | Starter | 1×1 | 4.5 | — |
| Domed observatory | Monument | 2×2 | 6.0 | ✅ |
| Great library | Monument | 3×3 | 7.0 | ✅ |
| Floating crystal spire | Monument | 2×2 | 9.0 | ✅ |

★ = style anchor, generate first

---

## 6. Set expectations: what comes out of Tripo3D

Be ready for this — it is normal, not a failure:

- **Raw output is high-poly.** Expect tens of thousands of triangles for a lantern. Your budget is
  a fraction of that. `simplify` is mandatory, not optional.
- **One material, one baked texture.** This is *good* — single-material props are exactly what
  `InstancedMesh` wants, and it's how you stay under 100 draw calls.
- **The texture is baked lighting, not PBR.** Whatever shading was in your source image is painted
  into the texture. This is why the Style Contract demands flat, even lighting — dramatic lighting
  gets permanently baked in and then fights your real-time sun.
- **Detail below roughly 2mm-equivalent disappears** after decimation. Design silhouettes, not
  surfaces. This is the actual reason cozy low-poly is the right direction.

**Assets I expect to fail through image-to-3D**, based on the geometry involved — generate them
anyway, but plan for a fallback:

| Asset | Why it's likely to fail | Fallback |
|---|---|---|
| Glass greenhouse | Transparent panes confuse reconstruction; you get a solid lump | Model the frame only in Blender, add a transparent material in three.js |
| Brass orrery | Thin rings and arms fall below the reconstruction threshold | Hand-model — it's 5 primitives |
| Hanging paper lanterns | The string won't survive | Model the lantern alone; place the string as a line in-engine |
| Floating crystal spire | Faceted transparency is the worst case for this pipeline | Pure shader work in three.js — no mesh generation needed |
| Small round tree / tall pine | Foliage becomes a blob | The blob is fine, actually — that's the low-poly look. Keep it. |

---

## 7. Rejection checklist

Before you spend Tripo3D credits on an image, check:

- [ ] Exactly one object in frame?
- [ ] Background flat and plain — no gradient, no vignette?
- [ ] **No shadow anywhere, especially under the object?**
- [ ] Even lighting, no hard highlight or dark side?
- [ ] Object fully in frame with margins, not cropped?
- [ ] Colours from the palette only?
- [ ] No text or lettering baked onto the object?
- [ ] Silhouette readable if you squint until it's a black shape?
- [ ] In a turnaround sheet: are all three views genuinely the same object?

Any unchecked box → regenerate. An image costs seconds; a bad mesh costs an hour.
