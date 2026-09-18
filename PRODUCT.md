# Product

## Register

product

## Users

The primary student is preparing for the Philippine Medical Technologists Licensure Examination, tentatively in March 2027. She studies from her own notes, expected mostly as PDFs with other formats possible. Aloft is a mobile-first PWA for her phone and iPad. Her immediate tasks are to check generated cards against their source, practise recalling answers, and choose a manageable next study session.

## Product Purpose

Aloft turns the student's notes into source-backed flashcards and schedules their review. Generated cards need approval before study. Honest recall ratings determine scheduling; completed reviews earn Insight without rewarding inflated self-ratings. Focus sessions and self-reported reading earn Focus under the existing server-controlled limits. Both currencies support persistent island progress. Progress and rewards describe study activity, not predicted exam scores.

## Brand Personality

Calm, warm, honest. The study interface uses warm stationery colors, rounded display lettering, and a small illustrated stack of cards. Question, Answer, and Source remain explicit text labels. A running focus session stays quiet: one big number, a soft indicator, nothing that nags. Reward moments at the end of a session are the only loud part. The voice is a kind tutor who says "session logged" and never "you failed". Closest references: Forest (one thing on screen, no chatter), Finch (progress framed as care, not discipline).

## Anti-references

- Habitica-style punishment. No dying trees, no lost streaks announced in red, no countdown to forfeit. Punishment mechanics drive off the exact users this is for.
- Duolingo-style noise. No bouncing mascots, no confetti on every tap, no full-screen celebration for a three-minute session.
- The "premium miniature" clinical look from the art-direction options. Students already resent study tools; a cold interface makes it worse.
- Generic SaaS dashboard chrome: hero-metric cards, identical stat tiles, eyebrow labels over every section.

## Design Principles

1. **One thing on screen.** A running session shows the clock, the focus state, and a way out. Nothing else competes.
2. **Informative, never punitive.** Away time is shown as a fact ("Away, not counting"), not a warning. Short sessions are logged with a kind line, not an error.
3. **The number is the server's.** Anything the UI shows as earned came from the server. The display timer is a courtesy; the credited figure is the truth and is shown as final.
4. **Reward is the only spectacle.** Calm everywhere, then a deliberate, contained moment when a session pays out. Spend the motion budget there.
5. **Thumb first.** Phone in one hand, at night, tired. Primary actions sit in thumb reach; text is large; targets are 44px.

## Accessibility & Inclusion

- Reduced motion honoured everywhere; every animation has a crossfade or instant alternative.
- Colour-blind safe: rarity and currency are never carried by colour alone. Shape and label always accompany colour.
- Touch targets 44x44px minimum; no hover-only functionality.
- Dyslexia-friendly: line height 1.5 or more for body text, line length under 65ch, no long runs of all-caps, strong size contrast between heading and body, generous paragraph spacing, sentence-case labels.
- Body text contrast 4.5:1 or better; large text 3:1 or better.
