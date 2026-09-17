# Aloft design

A mobile-first island field journal for a phone and iPad PWA. The Imagegen concept, illustration prompts, and implementation screenshots live in `design/`. See [the prompts](design/field-journal-prompts.md). The earlier coastal concept is retained as design history.

## Palette

Warm ivory `#f6f3e9`, lighter paper `#faf8f0`, pressed surfaces `#e9e7d9`, and rules `#d3d5c5`. Botanical ink `#243d32`, supporting text `#4e5b4e`, captions `#626b5d`. Green `#345a41` identifies primary actions and Focus; warm brown `#805234` identifies Insight. Errors use `#a33e2e`. Keep currency labels and glyphs alongside color.

## Layout

Today is an itinerary: choose a 5, 15, or 30-minute budget, recall a bounded batch, then optionally try a delayed mistake check. Numbered rows and fine rules carry the hierarchy. Use a single green primary action and avoid dashboard metric tiles. All counts come from the signed-in student's records. Empty, loading, and unavailable states must stay distinct.

The phone is primary. Keep the journal heading compact, with a small decorative island vignette. Reading and island progress follow the review itinerary. On iPad, the itinerary and island/focus tools share two columns. Bottom navigation stays visible below 1024px, including portrait iPads, and clears the home indicator. Main content has bottom clearance. Maximum width is 1152px; reading and forms use narrower measures.

Paper panels are reserved for contained forms and study surfaces, with a fine border, modest 10px corners, and no card shadows. The active review shows one question at a time. Answers expand naturally rather than clipping long content inside a flipping card.

## Typography and interaction

Georgia carries headings, questions, and the idle clock. Geist carries controls and reading text; Geist Mono carries live timers and changing balances. Body text uses 16px and 1.6 line height. Inputs remain at least 16px to avoid iOS focus zoom. Controls have 44px minimum targets; primary actions are at least 56px tall. Preserve keyboard review controls, visible focus, reduced motion, and semantic labels.

## Illustration

The generated watercolor is decorative. Text and controls are real HTML. Next Image uses responsive sizes and preloads the home vignette. A CSS mask softens the illustration's paper edge. Versioned filenames keep PWA caches safe. Never use generated mockup counts, rewards, clinical claims, or identity as real product data. The 3D island continues to show saved placements.

## Study behavior

Budgets suggest batches of 6, 18, or 36 available cards, prioritizing returning cards over new ones. They are estimates, not timed tests. A completed batch does not imply the whole deck is cleared. Mistake checks wait 24 hours and show the saved source after answering. Reading blocks explicitly label time as self-reported; focus sessions continue to use visible-tab heartbeats. Both share the existing reward cap. Rewards reflect activity, not predicted exam scores.
