---
target: the study tab (src/app/(app)/study)
total_score: 25
p0_count: 0
p1_count: 3
timestamp: 2026-09-09T06-36-28Z
slug: src-app-app-study
---
Method: dual-agent (A: design review sub-agent · B: detector and browser evidence sub-agent). B's result arrived before A's; A was read first for synthesis.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Focused minutes move per heartbeat, so "0 min focused" sits while the clock reads 01:00 |
| 2 | Match System / Real World | 3 | "counts now at 5" drops the unit; "yours to place", "ready", "Open", "high grade" are app words |
| 3 | User Control and Freedom | 2 | Start, End, and Skip all sat below the fold on a 740px phone |
| 4 | Consistency and Standards | 3 | Three dismissal styles; numbers in sans where the system says mono |
| 5 | Error Prevention | 3 | Ending at 4:50 lands on "+0 Focus" with no nudge that ten more seconds would count |
| 6 | Recognition Rather Than Recall | 2 | Ring rung marks only have SVG titles, which phones never show; "1 more high grade" needs the review tab's 75% rule |
| 7 | Flexibility and Efficiency | 2 | Radio chips have no arrow keys; eight tab stops before Start |
| 8 | Aesthetic and Minimalist Design | 2 | Idle screen had nine groups before the button; quiz top row has three numbers competing |
| 9 | Error Recovery | 3 | Errors are colour-only 15px lines that push the button down |
| 10 | Help and Documentation | 2 | After the first visit there is no help path from /study |
| **Total** | | **25/40** | **Acceptable** |

## Anti-Patterns Verdict

LLM assessment: not AI-looking at a glance; the palette, the serif/sans/mono split, and the voice are deliberate. Five seconds longer and the idle screen read as a product grown by accretion: identical hairline cards (weekly summary, onboarding, reached panel, milestone reveal, level-up, streak), a hero-metric result screen that goes hollow at "+0 Focus", numbered onboarding steps as scaffolding, the generic Pomodoro ring with the lantern demoted to a 22px glyph, amber outlines on unlit lanterns (heavy accent on inactive state), amber borders on non-action panels.

Deterministic scan: source scan clean (0 findings across the study components, the character, the app layout, and shared components). In-page detector: 6 findings on /study, 6 on /settings, 7 on /notes, 10 on /review. Five of the six on every page are one element, the teal Insight balance pill in the header and four of its descendants including an svg path and a screen-reader-only span, flagged as "cyan neon text on dark". Judged a false positive by intent: teal is the Insight currency colour by design, at 4.5:1 or better. One "overused font" hit on body (Geist at 70 to 86 percent of text) is the design system's choice. /notes adds one real hit: the upload helper text runs about 91 characters per line.

Visual overlays: the detector was injected on four pages and the yellow overlay boxes rendered; that tab has since been closed.

## Overall Impression

The voice and the frame are right; the doorstep was wrong. Everything the app wanted to say to a tired student (the week's total, two milestone debts, four dark lanterns) was said before "Ready when you are.", and the one button was off-screen. The running and result screens hold "one thing on screen"; the idle screen did not. The single biggest opportunity is a doorstep that is one shape, one number, one button.

## What's Working

- The voice: "Away, not counting", "Not that one. No penalty.", "It still counts as showing up." Consistent from the timer to the chest.
- The frame: status line, stage, action row, in every state. No modals; the reached-length door is inline.
- The room as the career meter: milestones as props instead of a bar, colour-blind safe by construction, her mood tied to session state.

## Priority Issues

- **[P1] The primary action sits below the fold on every screen except the result.** Why: one-handed at night, the first tap needed a scroll. Fix: pin the action row above the tab bar on phones and cut the idle stack so the frame fits 740px. Suggested command: /impeccable layout
- **[P1] The idle screen had become a dashboard.** Nine groups before the button: weekly card, scene, two milestone lines, h1, aim line, chips, lantern row, caption. Fix: idle is the shape, the headline, one context line, the length, Start; everything smaller goes under the button. Suggested command: /impeccable distill
- **[P1] The desk lamp shade slid off its arm during a focused session.** The lantern flame keyframes were reused on the room's lamp path with the wrong transform origin. Fix: animate the glow, not the shade. Suggested command: /impeccable polish
- **[P2] The aim goes dead at a modest balance.** With 2,070 Focus every starter piece is affordable, so "Change" opens five chips all saying "ready". Fix: hide Change when everything is affordable, or aim at the next level's cheapest unlock. Suggested command: /impeccable clarify
- **[P2] The quiz's first frame sells the quiz and hides the exit.** A 24px amber "×1.0" is the loudest thing on the screen; Skip is below four tall options. Fix: Skip in the top row, multiplier muted until it rises, helper text starts with "Optional." Suggested command: /impeccable clarify

## Persona Red Flags

**Casey (one-handed, interrupted)**: Start needed a 180px scroll; End needed a scroll past the scene and ring; "Change" is a 14px link next to "Go build"; "Got it" is the first tappable thing and the farthest from the thumb; on End, the quiz appears with Skip below four options.

**Jordan (first-timer, literal)**: "yours to place", "Go build", "Open", "1 more high grade", "0 min credited today across 4 sessions", "0 0 0 0 next", "counts now at 5", two clocks disagreeing (01:00 vs "0 min focused"), "×1.0", "+0 Focus" read before "It still counts as showing up".

**Sam (keyboard, screen reader)**: contrast passes everywhere (muted 5.7:1, ink-2 7.8:1, amber 9.3:1). Radio chips lack arrow keys. No focus management when Start, End, Skip, or Start another replace the tree. The chest reveal's aria-label hides the item name and rarity. The lantern glyph and the status line announce the away state twice. Rung titles inside a progressbar SVG are not exposed.

**A tired student at 11pm who skipped yesterday**: greeted by the week's total, two unfinished milestones, and four dark lanterns. Ending after 12 minutes met an eight-question quiz with Skip out of sight. The result offered only "Start another"; no "Done for tonight".

## Minor Observations

- Numbers in sans against the mono rule: "+0 XP", "0 min credited", "Level 9", "2 more focused hours".
- 10px captions under the lanterns and the 7-unit mono caption in the room read as debug text.
- "That is your 25." and "counts now at 5" both drop "min".
- Amber borders on non-action panels: reached panel, milestone reveal, level-up banner.
- The loading view is shaped like an h1 and a lead, so the layout jumps when the real idle view arrives.
- The window sky is a sunset at every hour while the island follows the time zone.
- Header background is ground at 90 percent; the design doc says ground-2.
- Clock size in the running view is smaller than the design doc's clock scale; the ring makes the smaller one right, so the doc should change.
- Sign-out is an icon-only control one mis-tap from Settings.

## Questions to Consider

- What if idle were the running screen at 00:00, one screen for both states?
- What if the lantern were the timer, with the glow radius as progress, instead of the ring every competitor has?
- What if the quiz came after the payout, as an offer on a number you can already see, instead of between End and the reward?
