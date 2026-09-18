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
rounded:
  tab: '4px'
  md: '8px'
  panel: '10px'
  lg: '12px'
  editor: '14px'
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

Use modest rounded rectangles. Fields use 8px corners, paper panels 10px, answer/source sections and shared buttons 12px, and the card editor 14px. The Question label has a small rectangular 4px tab. The existing full-width journal action has 7px corners. Keep imagery limited to the small fanned blank cards; avoid turning content panels into illustrated objects.

## Components

### Buttons

The shared primary button uses coral with white text; its ghost variant uses plum text and a fine border. Both have 44px minimum height by default and 56px in the large size. Hover darkens the primary button or adds warm paper to the ghost button. Press scales to 0.98. Disabled buttons reduce opacity. Keyboard focus uses a visible coral outline.

### Fields

Study inputs and textareas have warm white backgrounds, stronger plum-gray borders, and 48px minimum height. Textareas resize vertically. The native select explicitly removes platform appearance, stays 48px high, reserves 40px on the right, and uses a custom chevron. Field focus is a 2px coral outline offset by 3px.

### Study cards

A question appears first with its visible label. Answer and Source enter the page together only after reveal. The answer is apricot; the source is lilac and read-only. The editor keeps both editable fields separate from source evidence and includes an explicit approval checkbox. Content edits clear approval.

### Practice modes

Flashcards, Write your answer, and Multiple choice reuse the same study field and Question / Answer / Source structure. Each card defaults to the automatic regimen unless its saved answer type in the card editor specifies a format. The review selector allows a temporary change before reveal or choice, then locks for that answer and resets to the regimen on the next card. Multiple choice is unavailable when the card lacks valid options. Writing appears below the question and becomes read-only after reveal for self-comparison. Multiple-choice options are full-width warm white buttons; the selected option gains a coral border and pressed background. Explicit "Your choice" and "Correct answer" labels distinguish states without relying on color. The first choice locks the options and reveals feedback, Answer, and Source; a wrong choice offers only Again. Written and multiple-choice modes omit the decorative recall illustration to give the response controls space.

### Recall choices

Again, Hard, Good, and Easy share the same warm white treatment and 102px minimum height. Each includes a plain-language meaning and next-review interval. Hover adds apricot and a coral border. Disabled choices reduce opacity and show a waiting cursor.

**The honest rating rule.** Give all recall choices equal visual weight. Ratings affect scheduling; completed reviews earn equal credit regardless of the rating.

### Progress charts

Learning progress uses a paper panel with a labeled measure selector for scored multiple-choice accuracy, multiple choice after seven or more days, and explicitly self-rated recall after seven or more days. Coral dots and straight segments share a fixed 0–100% scale; segments connect only adjacent periods with results, leaving missing periods blank. Keep the correct/total counts beside the aggregate percentage and an expandable, labeled weekly-results table below the chart. Explain that self-ratings are subjective and earlier history remains unscored. Practice patterns and subject results use plain rows with sample counts. These charts describe practice results, not exam readiness.

### Navigation

The phone tab bar has four equal columns with icons above text and 64px minimum item height. Current-page text is coral. Desktop links place icons beside text and use a pressed background for the current page. Keep labels and current-page semantics alongside color.

### Illustration

The versioned `public/illustrations/study-cards-v1.png` is decorative. Review displays it at 88px wide beside the recall prompt. It supplies no labels or facts. Generated concept lettering, handwriting, and decorative slogans are not part of the implemented type system.

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
