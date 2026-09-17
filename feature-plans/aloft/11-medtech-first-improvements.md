# First Medtech improvements

Implemented September 17, 2026. Andrew expects the exam around March 2027; the exact date and note collection are not yet confirmed. Likely PDF notes, with other formats possible.

## Shipped in this checkout

- New and existing cards require approval before entering flashcard reviews or new quizzes. Draft, approved, and flagged states appear in Notes. The editor displays the full source passage, subject, topic, and any quiz alternatives and explanations.
- Generation requests subject/topic suggestions and question-specific alternatives. Invalid or absent alternatives leave a flashcard usable after approval but excluded from multiple-choice quizzes. No unrelated-answer fallback remains.
- A quiz saves its questions, answer keys, source quotes, and explanations at first fetch. Later card changes cannot alter its grading. Only submitted answers disclose feedback. Answer retries return the original outcome.
- Wrong answers show the correction and explanation. Recent quiz mistakes appear in Review for additional uncredited practice. New quiz attempts are stored separately from flashcard ratings; historical quiz rows are excluded from self-rated recall statistics.
- A due flashcard review earns three Insight regardless of rating, once per card per local day. Row locks prevent concurrent reviews from duplicating the payout. Later learning steps still update the schedule without another daily reward.
- Settings has an optional exam month, a March 2027 shortcut, and a daily new-card limit from zero to twenty. The target is a personal plan, not an official PRC date. It does not change other users' plans automatically.
- Review lists the six MTLE subjects, approved/practiced card counts, and labeled-topic counts. Unclassified cards are visible. This is a note inventory, not a claim of complete PRC coverage or exam readiness.
- The island study shelf now uses subjects with practiced, approved cards.
- Editing question/answer content resets the card's schedule. Editing also returns it to draft unless the user explicitly approves it. Existing quiz content is cleared when an API edit omits replacement quiz content.
- Exports include draft cards, study settings, and the new quiz records.

## Migration and local verification

`drizzle/0006_medtech_learning.sql` adds card approval/classification/quiz fields, study preferences, and immutable quiz question records. Existing cards become drafts; no notes, schedules, or prior reviews are deleted. Apply through the normal migration step before running this version. The local test database has been migrated. Production has not been changed.

Validation passed: 232 domain/UI tests, 103 server/database tests, the configured coverage gates, TypeScript checking, ESLint, and a production build. The notes-to-generation-to-approval-to-review browser test passed. Mobile and desktop browser checks confirmed plan persistence, no page errors, and no horizontal overflow in the review view.

The app was exercised locally using the fake generation provider and synthetic notes. Actual PDF/photo quality and AI-authored medical question quality still need checking with representative notes. No personal notes are required to exercise the application flow.

## Remaining work

- Confirm the exam sitting and the applicable PRC blueprint, then add a full versioned competency map. Current subject names reference PRC 2023 specifications.
- Evaluate extraction and generated answers against her actual notes, including long PDFs, tables, scanned pages, and image-based material. PDF limits remain 20 text-layer pages and five photos per upload.
- Add independent application-question sets and timed mock exams. Current quizzes revisit approved flashcards and must not be treated as independent readiness assessments.
- Add image-based cards, workload-aware planning, and explicit external-material focus sessions.
- Evaluate delayed-improvement rewards and additional subject-themed island assets. This change connects the existing study shelf and review currency; it does not add a new asset collection or validated mastery badges.
