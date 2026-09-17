# Field journal and daily study tools

Implemented locally, September 18, 2026. This is the first implementation slice from the learning and motivation research in plan 12. The generated UI reference and decorative illustration were created with Imagegen; prompts are saved in `design/field-journal-prompts.md`.

## Delivered

- Today uses real signed-in study records. Choose an estimated 5/15/30-minute review batch of up to 6/18/36 available cards. Returning cards take priority over new cards. A batch completion is labeled separately from clearing a deck. No simulated exam readiness or placeholder grades.
- Delayed mistake checks become available 24 hours after an incorrect quiz answer. Feedback includes the stored explanation and source quote. Correct delayed answers clear the follow-up; incorrect ones schedule another check after 24 hours. These are in-app follow-ups, not push notifications. They do not change FSRS schedules or earn repeat points.
- Saved quiz snapshots protect feedback from later edits. Draft, suspended, deleted, or changed cards are excluded from new checks. Newer quiz attempts supersede old mistakes. Server-owned timestamps, owner checks, a session row lock, and request IDs prevent duplicate attempts or changing a saved answer on retry. Attempts are included in the account export.
- Reading mode supports 5/15/30-minute self-reported blocks. It survives PDF app switching, screen locking, navigation, and reloads. The server caps elapsed time at the chosen duration and shares the existing daily reward cap. An expired block settles on the next active-session check. Focus mode still uses visibility heartbeats. Only one session may be active per user.
- Short 5- and 15-minute focus options are available alongside existing 25/50/open sessions.
- Journal styling covers navigation, Today, review, notes, and settings. The main screen uses a watercolor vignette, serif headings, numbered rows, fine rules, and botanical green actions. Flashcard answers expand to fit long passages; source passages remain accessible. Phone and iPad layouts use the same working components.

## Validation

- Full Jest suite with coverage: 343 tests passed across 80 suites. Required domain and server branch thresholds passed.
- After final completion-copy changes: all 72 UI tests passed again; TypeScript and ESLint passed.
- Real Postgres integration cases cover reading without heartbeats, late-return caps, double-ending, owner boundaries, delayed eligibility, duplicate concurrent attempts, immutable retry results, rescheduling, resolving, source edits, and export.
- Four browser flows passed: study/earn/build persistence, notes approval and review rewards, offline timer behavior, and the new mobile reading/navigation/resume flow.
- Production build and route bundle budgets passed. iPhone and iPad WebKit layouts checked in portrait and landscape; no horizontal overflow or runtime errors. Automated contrast check identified the small itinerary numbers; their ink was darkened. The final WCAG A/AA automated scan reported zero violations on all three Today layouts and on the expanded phone flashcard. The flashcard screenshot uses temporary QA notes, deleted after the check.

## Deployment

Two forward migrations are required: `0007_reading_sessions.sql` and `0008_mistake_checks.sql`. Applied to the local test database. Production has not been updated by this implementation turn. The PWA cache version is now `aloft-v3-journal`.

## Remaining roadmap

This slice does not add an independent exam question bank, image-based clinical questions, passive PDF attention tracking, a predicted board score, or a new island economy. Accurate note imports still require her actual material and review of generated cards. Future work can add source-backed case questions and separate unseen-question practice from repeated-card results.
