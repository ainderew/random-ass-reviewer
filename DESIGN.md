---
name: Aloft study stationery
description: Warm, readable study cards with coral actions and clear source evidence.
colors:
  ground: '#fcf2ec'
  ground-2: '#fffdfa'
  ground-3: '#f5e7e1'
  hairline: '#dfd0cc'
  ink: '#38273d'
  ink-2: '#615364'
  muted: '#756575'
  focus: '#bd402f'
  focus-deep: '#9b3023'
  insight: '#735095'
  warn: '#a12d37'
  question-tab: '#fbe1d7'
  answer: '#ffead4'
  answer-label: '#71411f'
  source: '#eee7f4'
  source-text: '#574763'
  source-link: '#654377'
  field-border: '#9e8796'
  recall-border: '#b5a2af'
  done: '#3f7d5b'
  stage-learning: '#e08a6f'
  stage-new: '#f1dcd3'
  stage-edge: '#d9bdb2'
typography:
  display:
    fontFamily: 'Nunito Sans, sans-serif'
    fontSize: 'clamp(2.25rem, 5vw, 3rem)'
    lineHeight: 1.15
  question:
    fontFamily: 'Nunito Sans, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 800
    lineHeight: 1.45
    letterSpacing: '-0.015em'
  body:
    fontFamily: 'Geist, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    lineHeight: 1.6
  label:
    fontFamily: 'Geist, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 700
    lineHeight: 1.4
  mono:
    fontFamily: 'Geist Mono, ui-monospace, SF Mono, Menlo, monospace'
  metric:
    fontFamily: 'Nunito Sans, sans-serif'
    fontSize: '2.25rem'
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: '-0.02em'
  metric-hero:
    fontFamily: 'Nunito Sans, sans-serif'
    fontSize: 'clamp(3rem, 14vw, 4rem)'
    fontWeight: 800
    lineHeight: 1.05
  caption:
    fontFamily: 'Geist, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.75rem'
    lineHeight: 1.4
rounded:
  tab: '4px'
  md: '8px'
  panel: '10px'
  lg: '12px'
  editor: '14px'
  pill: '999px'
spacing:
  small: '0.75rem'
  regular: '1rem'
  section: '1.25rem'
  large: '1.75rem'
  column: '2rem'
components:
  button-primary:
    backgroundColor: '{colors.focus}'
    textColor: 'white'
    rounded: '{rounded.lg}'
    padding: '0 1rem'
  button-primary-hover:
    backgroundColor: '{colors.focus-deep}'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.lg}'
    padding: '0 1rem'
  study-field:
    backgroundColor: '{colors.ground-2}'
    textColor: '{colors.ink}'
    rounded: '{rounded.md}'
    padding: '0.75rem'
    typography: '{typography.body}'
  answer-section:
    backgroundColor: '{colors.answer}'
    textColor: '{colors.ink}'
    rounded: '{rounded.lg}'
    padding: '1.1rem 1.25rem'
  source-evidence:
    backgroundColor: '{colors.source}'
    textColor: '{colors.source-text}'
    rounded: '{rounded.lg}'
    padding: '1.1rem 1.25rem'
  card-editor:
    backgroundColor: '{colors.ground-2}'
    rounded: '{rounded.editor}'
    padding: '1.25rem'
  question-tab:
    backgroundColor: '{colors.question-tab}'
    textColor: '{colors.ink}'
    rounded: '{rounded.tab}'
    padding: '0.35rem 0.7rem'
---

# Design System: Aloft study stationery

## Overview

**Creative North Star: "Study stationery"**

Aloft uses a study stationery world: peach workspace, warm white sheets, plum text, and a small illustrated stack of blank cards. Rounded display lettering adds character while readable study content stays primary. The existing island game remains a separate part of the product.

The implemented system follows the warmer concept in `design/aloft-study-stationery-concept.png`. The prompts in `design/study-stationery-prompts.md` record its provenance. The concept is a visual reference; the shipped components determine the rules below.

**Key Characteristics:**

- Explicit Question, Answer, and Source labels with consistent spacing and color.
- Coral actions, apricot answers, and lilac source evidence.
- Phone-first controls and a wider comparison layout on iPad.
- Limited decorative illustration with real HTML text and controls.

## Colors

Coral controls sit against pale peach and warm white, with plum reading text.

### Primary

`focus` identifies primary actions, selected navigation, carets, and keyboard focus. `focus-deep` is its hover state. Primary button text is white.

### Secondary

Apricot `answer` identifies revealed answers. Lilac `source` identifies read-only evidence, with darker source text and links. `insight` also remains the existing Insight currency color; keep its glyph and label.

### Neutral

`ground` is the page, `ground-2` is paper, and `ground-3` is a pressed or selected background. `ink`, `ink-2`, and `muted` establish text hierarchy. `hairline` divides groups. Fields and recall buttons use stronger dedicated borders. `warn` is reserved for error feedback.

**The labeled sections rule.** Color supports the visible Question, Answer, and Source labels; it never replaces them.

## Typography

Nunito Sans carries headings, the wordmark, and question text. Geist carries body text and controls. Geist Mono remains available for changing numbers and timers. The legacy `font-serif` alias now resolves to Nunito Sans; it does not introduce a serif face.

Page headings use the fluid display size in the frontmatter. Questions grow from 1.5rem to 1.75rem at 640px. The wordmark uses 1.8rem, weight 900, and -0.04em tracking. Revealed answers use 1.25rem with 1.625 line height. Inputs remain 1rem with 1.6 leading to support comfortable reading and avoid iOS focus zoom. Section labels use sentence case. Labels implemented as headings inherit the display face.

## Layout

The shared shell has a 1152px maximum width. Horizontal padding is 16px on phones and 24px from 768px. Bottom clearance accounts for fixed navigation and the device safe area. Bottom navigation remains below 1024px, including portrait iPad; wider screens use top navigation.

Card setup stacks editable fields above read-only evidence on narrow screens. At 768px it becomes a 1.2fr / 1fr comparison grid with a 32px column gap, and editor padding grows from 20px to 28px. Recall choices use two columns on phones and four from 640px. Let long answers and sources expand naturally.

Check core flows at 390×844, 820×1180, and 1180×820. These are review viewports, not additional CSS breakpoints.

## Elevation & Depth

Paper panels are flat, with fine borders and no shadow. Tonal areas distinguish answers and sources. The shared primary button retains a small Tailwind shadow. The decorative card illustration has its own short painted shadow. Fixed navigation uses a translucent page color and subtle backdrop blur; do not generalize that treatment to study content.

Reward animations remain in the existing game and completion UI. They include a 420ms rise, 520ms pop, and 240ms fade. The focus indicator breathes slowly. Reduced-motion rules remove or shorten animation and transitions. Review content expands on reveal; the retained flip CSS is not the active flashcard presentation.

## Shapes

Use modest rounded rectangles. Fields use 8px corners, paper panels 10px, answer/source sections and shared buttons 12px, and the card editor 14px. The Question label has a small rectangular 4px tab. The existing full-width journal action has 7px corners. Keep imagery limited to the small fanned blank cards and the six subject covers; avoid turning content panels into illustrated objects. Subject covers are books: 4px corners on the spine side, 12px on the open side.

## Components

### Buttons

The shared primary button uses coral with white text; its ghost variant uses plum text and a fine border. Both have 44px minimum height by default and 56px in the large size. Hover darkens the primary button or adds warm paper to the ghost button. Press scales to 0.98. Disabled buttons reduce opacity. Keyboard focus uses a visible coral outline.

### Fields

Study inputs and textareas have warm white backgrounds, stronger plum-gray borders, and 48px minimum height. Textareas resize vertically. The native select explicitly removes platform appearance, stays 48px high, reserves 40px on the right, and uses a custom chevron. Field focus is a 2px coral outline offset by 3px.

### Study cards

A question appears first with its visible label. Answer and Source enter the page together only after reveal. The answer is apricot; the source is lilac and read-only. The editor keeps both editable fields separate from source evidence and includes an explicit approval checkbox. Content edits clear approval.

### Practice modes

Flashcards, Write your answer, and Multiple choice reuse the same study field and Question / Answer / Source structure. Each card defaults to the automatic regimen unless its saved answer type in the card editor specifies a format. In review, the format is a row of three paper tabs (Flashcard, Write, Choices) on a pressed track under the card count, above the question; the chosen tab takes the coral edge, and the regimen's pick is labelled "Suggested". Another pick lasts for this card only, says so in one line, locks after reveal or choice, and resets on the next card. Choices stays selectable on a card without options and says "No choices yet"; picking it shows a tonal panel offering "Make choices" (the AI writes three wrong options from the notes) or "Write them myself" (opens that card's editor). Writing appears below the question and becomes read-only after reveal for self-comparison. Multiple-choice options are full-width warm white buttons; the selected option gains a coral border and pressed background. Explicit "Your choice" and "Correct answer" labels distinguish states without relying on color. The first choice locks the options and reveals feedback, Answer, and Source; a wrong choice offers only Again. Written and multiple-choice modes omit the decorative recall illustration to give the response controls space.

### Recall choices

Again, Hard, Good, and Easy share the same warm white treatment and 102px minimum height. Each includes a plain-language meaning and next-review interval. Hover adds apricot and a coral border. Disabled choices reduce opacity and show a waiting cursor.

**The honest rating rule.** Give all recall choices equal visual weight. Ratings affect scheduling; completed reviews earn equal credit regardless of the rating.

### Progress dashboard

`/review/progress` reads top to bottom like a phone health summary, in the study stationery world: a "‹ Review" back button and a Nunito "Your progress" title, then paper tiles (14px corners, hairline border, no shadow) on the peach page. Each tile opens with a coloured icon and title in its category colour, then one number in the `metric` style with a short unit, then what feeds it, then a plain caption. Category colours are coral for memory and the exam, `insight` purple for scores, `done` green for mistakes fixed, and `source-link` plum for the week; every one clears 4.8:1 on paper.

- The exam card leads: days to go in `metric-hero`, a started bar, and one sentence of pace (the date the daily new-card limit starts everything, or the daily number needed and a link to Settings). Without an exam month it asks for one.
- Tiles run wide, two halves, wide on every screen: Solid (with the stage bar, labelled legend, and the stage definitions), After a week (four weekly bars, a flat stub for an empty week), Mistakes fixed, and This week (Monday-to-Sunday day dots: filled for studied, ringed for today, dashed for days to come).
- Subjects are a grouped list, one notebook per row: cover thumbnail, name and after-a-week score on the top line, then a stage bar and its counts across the full width. A row opens that subject's review; an empty one opens Notes.
- Memory stages share one coral ramp, `focus` for solid, `stage-learning`, then `stage-new` with a `stage-edge` outline, separated by 2px gaps, always with counts in words beside them. Solid is a concrete rule: remembered the last three reviews in a row (any rating but Again, or the right choice) with those three spanning a week or more. Only reviews since the card's schedule last reset count, so an edited card starts over as not started. The Solid tile's "What do these mean?" disclosure, under its caption, defines all three stages.
- Below sit "What to work on next" and the four-week chart in paper panels. "What to work on next" is one row per subject to revisit (cover, name, "8 of 32 missed", a coral Review button that opens that subject) with every rule and caveat behind one "How this is chosen" disclosure. Then the plain-language notes on what the measures mean. Nothing on the page predicts a board score.

### Navigation

The phone tab bar has five equal columns for Today (`/study`), Focus (`/focus`), Review, Notes, and Island, with icons above text and 64px minimum item height. Progress is not a tab: it opens from the "Your progress this week" row on Today, and `/review/progress` selects Review. Current-page text is coral. The longest matching destination determines the single active item. Desktop links place icons beside text and use a pressed background for the current page. Keep labels and current-page semantics alongside color.

### Today

Today reads at a glance. From top to bottom: the cat in her circle (the ring fills as the day's steps are done), one short line from her naming the next step, her name and mood (opens her sheet), the day's steps, four care buttons, the weekly progress row, and one coral button that does the next step. The button stays pinned above the tab bar. Steps show one number each ("18 cards", "10 of 25 min"); the step to do now is outlined and its dot pulses. No explanatory paragraphs on Today: reasons live on How it works.

### Focus sound

A 56px square beside the main button on both timer screens (Start focusing, End session). Its icons and one-word label show what is playing: Sound when silent, the layer's name when one is on (Rain, Noise, Piano), and Mix with small icons side by side when several are on. When anything is on, the square takes the pressed coral tint. It opens a bottom sheet rendered at the top of the page (a portal) so the tab bar never covers it. The sheet says "Mix one or more." A Silence row turns everything off. Under it, Rain, Brown noise and Soft piano are full-width switches, each with a one-line "when to choose it", a switch pill on the right, and its own volume slider while on. Layers keep their volume while off. Before a session the sheet plays the mix so it can be heard. Sound starts with the session, fades layers in and out as they change, fades out at the end, and stops for the quiz. Silence is the default. Research notes live on How it works, linked from the sheet only when no session is running.

### Subject shelf

Plain `/review` opens on a shelf: an "All subjects" row (the blank-card illustration, a status pill, a coral arrow), then a swipeable row of notebooks, one per MTLE subject. The row scroll-snaps cover by cover; on phones it runs to the screen edges so the next cover peeks in, and a row of dots below marks the current cover (each dot jumps to its notebook). Subjects with cards to review lead, then caught-up subjects, then empty ones.

Each notebook is 3:4 text-free clay art from `public/covers/` with its title set in Nunito Sans 800 over the art's plain top third, in that subject's dark ink (`SUBJECT_COVERS`; every pairing clears 6.7:1). The title scales with the cover, 1rem to 1.5rem; a subtitle is 0.75rem Geist. A fade in the cover's own paper colour guarantees the title's ground, and a soft shaded spine runs down the left edge.

One status pill sits on each cover's lower left, so the state reads at a glance: a coral pill with the count ("6 to review"), a paper pill with a tick ("All done for now"), or a dashed pill with a plus ("Add notes") on a desaturated cover that links to Notes. Shape, icon, and words carry the state as well as colour. Hover lifts a cover 4px on devices that hover; press scales it to 0.98; reduced motion removes both and the dots jump instead of gliding. A session replaces the page intro with its own heading: a "Subjects" back button with a chevron at the top left (44px target), then the cover thumbnail and the subject as the page title. A finished session offers "Pick another subject" beside "Back to today". Today's `?minutes=` link skips the shelf.

### Illustration

The versioned `public/illustrations/study-cards-v1.png` is decorative. Review displays it at 88px wide beside the recall prompt and on the shelf's "Everything due" row. It supplies no labels or facts. The subject covers are decorative too; their provenance and prompts are in `design/subject-covers.md`. Generated concept lettering, handwriting, and decorative slogans are not part of the implemented type system.

## Do's and Don'ts

### Do:

- Do preserve explicit Question, Answer, and Source labels.
- Do keep source evidence read-only and hide it with the answer until reveal during review.
- Do give every recall rating the same visual weight and retain its meaning and next-review interval.
- Do honor reduced motion and preserve visible keyboard focus.
- Do use the generated blank-card illustration as decoration with empty alternative text.

### Don't:

- Don't use generated mockup slogans, scores, or clinical facts as product data.
- Don't put illustration behind study text or let it displace the question.
- Don't reintroduce the tropical field-journal treatment into study pages.
- Don't replace the retained island game or its saved progress as part of a visual extension.
