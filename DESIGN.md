---
name: Aloft
description: A calm dark study timer that pays out in warm light.
colors:
  ground: '#14161f'
  ground-2: '#1b1f2c'
  ground-3: '#232838'
  hairline: '#2e3446'
  ink: '#e9e5da'
  ink-2: '#a7adc0'
  muted: '#8b91a8'
  focus: '#e8b04b'
  focus-deep: '#c9932f'
  insight: '#6fd6c4'
  warn: '#e8836b'
typography:
  display:
    fontFamily: "Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, serif"
    fontSize: '3rem'
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: '-0.02em'
  headline:
    fontFamily: "Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, serif"
    fontSize: '2.25rem'
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: '-0.01em'
  clock:
    fontFamily: "Geist Mono, ui-monospace, 'SF Mono', Menlo, monospace"
    fontSize: 'clamp(4.5rem, 24vw, 7.5rem)'
    fontWeight: 500
    lineHeight: 1
    letterSpacing: '-0.03em'
    fontFeature: 'tnum'
  body:
    fontFamily: 'Geist, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.6
  lead:
    fontFamily: 'Geist, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: 'Geist, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.9375rem'
    fontWeight: 500
    lineHeight: 1.4
rounded:
  md: '10px'
  lg: '14px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '16px'
  lg: '24px'
  xl: '40px'
  2xl: '56px'
components:
  button-primary:
    backgroundColor: '{colors.focus}'
    textColor: '{colors.ground}'
    rounded: '{rounded.md}'
    height: '56px'
    padding: '0 24px'
  button-primary-hover:
    backgroundColor: '{colors.focus-deep}'
    textColor: '{colors.ground}'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.md}'
    height: '56px'
    padding: '0 24px'
  tab-bar:
    backgroundColor: '{colors.ground-2}'
    textColor: '{colors.muted}'
    height: '56px'
  tab-bar-active:
    textColor: '{colors.ink}'
  header:
    backgroundColor: '{colors.ground}'
    height: '56px'
---

# Design System: Aloft

## 1. Overview

**Creative North Star: "The Lantern Post"**

One warm light in a calm dark scene. The lantern post is the anchor asset of the island's art direction, and the interface borrows its logic: a near-black ground, a single amber source, and everything else receding. The screen stays quiet while a student works. The reward at the end of a session is the lamp being lit.

This is a product surface. Familiarity is a feature; the tool should disappear into the task. Density is low on purpose: a running session shows one number, one state line, and one exit. The system rejects the Habitica register (punishment, red warnings, countdowns), the Duolingo register (mascots, confetti, celebration for everything), and the clinical "premium miniature" look from the art-direction options. It also rejects generic SaaS chrome: hero-metric cards, identical stat tiles, eyebrow labels over every section.

**Key characteristics:**

- Dark, tinted toward blue-violet, never pure black
- One accent (amber) for actions and Focus; teal only ever means Insight
- Serif for a handful of display lines, sans for UI, mono for every number
- Generous leading and short measures, chosen for dyslexic readers
- Motion conveys state, and the reward screen is the only place it performs

## 2. Colors

A restrained dark palette with one warm light and one cool signal.

### Primary

- **Lantern Amber** (`#e8b04b`): the only action colour. Primary buttons, the focused dot, the Focus glyph, focus-visible rings. 9.3:1 on ground.
- **Lantern Amber, deep** (`#c9932f`): primary hover. Still 7:1 against ground text.

### Secondary

- **Recall Teal** (`#6fd6c4`): Insight and nothing else. If it appears, recall earned it. 10.4:1 on ground.

### Neutral

- **Ground** (`#14161f`): the body. Blue-violet tint, chroma low.
- **Ground 2** (`#1b1f2c`): header, tab bar, inline panels. One step lighter, same hue.
- **Ground 3** (`#232838`): skeleton bars and pressed surfaces.
- **Hairline** (`#2e3446`): every border. 1px, never thicker, never coloured.
- **Ink** (`#e9e5da`): headings, the clock, primary text. Warm off-white. 13:1.
- **Ink 2** (`#a7adc0`): body and secondary text. 7.8:1.
- **Muted** (`#8b91a8`): captions and inactive tab labels. Lifted from the preview's `#767d94` to clear 5.7:1.

### Signal

- **Warm Warn** (`#e8836b`): inline errors only. Never full panels, never backgrounds. 6.8:1.

## 3. Typography

Three families, each with one job.

- **Serif (system Georgia stack)** carries display lines: the landing headline, "Ready when you are.", "Session saved". Weight 400, tight leading, letter-spacing between -0.01em and -0.02em. Never in buttons, labels, or body.
- **Geist Sans** carries all UI text at a fixed rem scale: 0.9375rem labels, 1rem body, 1.125rem lead. Body line height 1.6, leads 1.625. Line length capped at 40 to 46ch on the timer, 65ch anywhere prose appears. Sentence case everywhere; no tracked uppercase.
- **Geist Mono** carries every number: the clock, balances, awards. Always `tabular-nums`. The clock is the one fluid size, `clamp(4.5rem, 24vw, 7.5rem)`, because it is a display object, not UI text.

Hierarchy comes from size and family together, never weight alone. Headings are 2.25 to 3rem serif against 1.125rem sans body: a 2:1 to 3:1 ratio that survives a squint.

## 4. Elevation

Flat with tonal layering. There are no shadows. Depth is one step up the ground ramp plus a hairline: the header and tab bar sit on Ground 2 with a 1px Hairline edge and a light backdrop blur so content scrolling under them stays legible. The reward screen uses a single soft radial amber glow behind the earned number; that is the only glow in the system, and it is decorative on purpose.

## 5. Components

- **Button, primary**: amber fill, ground-coloured text, 10px radius, 44px minimum height (56px in the thumb zone), `active:scale(0.98)` at 150ms. Hover darkens to Lantern Amber deep. Disabled drops to 50% opacity. Loading state keeps the label and sets `aria-busy`.
- **Button, ghost**: transparent, hairline border, ink text. Hover lifts the border to Ink 2 and fills Ground 2. Used for End session and Keep going, so the exit is never louder than the start.
- **Currency badge**: glyph plus number. Bolt means Focus, diamond means Insight; shape carries the meaning so colour never has to. Compact form on phones hides the word for sighted users and keeps it for screen readers.
- **Tab bar**: fixed bottom, four equal columns, 56px tall plus the safe-area inset. Active tab: ink label, amber icon. Hidden from 768px, where the top nav takes over.
- **Header**: 56px (64px on desktop), sticky, Ground 2 at 90% with blur. Wordmark left in serif, balances right, sign-out as an icon on phones and icon plus label on desktop.
- **Timer frame**: every study state uses the same three-row frame: a status line, a centred stage, and an action row. Nothing jumps between states because the frame does not change.
- **Focused dot**: 10px amber circle that breathes over 2.8s while focused; still and muted when away. Reduced motion stops the breathing.
- **Skeleton**: two ground-3 bars in the shape of the idle heading and lead. Never a spinner in the middle of the stage.

## 6. Do's and Don'ts

**Do**

- Keep one thing on screen during a session.
- Say what is happening in plain words: "Away, not counting", "Session saved".
- Put the primary action in the bottom thumb zone on phones.
- Use the mono family for any number that changes.
- Pair every colour signal with a shape or a word.

**Don't**

- Add red, countdowns, or warnings to the away state.
- Use amber for anything that is not an action or Focus.
- Introduce cards, stat tiles, or eyebrow labels to "organise" a screen.
- Animate layout. Transform, opacity, and colour only.
- Set body text under 1rem or leading under 1.5.
