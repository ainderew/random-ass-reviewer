# Medtech study review

Reviewed September 17, 2026. This is a code inspection and focused literature review, not a live production audit or a systematic literature review. Recommendations below are proposals, not implemented features.

## Assessment

Aloft already implements notes-to-flashcards, spaced reviews, focus sessions, quizzes, and a persistent island economy. Keep these systems. The next priority is trustworthy learning content and Philippine MTLE preparation. Product success should include delayed recall and performance on unfamiliar questions, alongside willingness to return tomorrow.

## What is implemented

| Area | Evidence in the repository | Current limits |
| --- | --- | --- |
| Notes | Paste/text/Markdown, PDF extraction, photo transcription, chunking, duplicate-source detection, generation progress and retries | PDFs require a text layer and have a 20-page cap; photo uploads have a five-image cap |
| Generated cards | Claude provider abstraction, structured output, question/answer/source quote, topic and difficulty tags, editing and deletion | Quote matching checks text provenance, not whether the answer follows from the quote or is medically correct; no approval state |
| Review | FSRS scheduler with a 0.90 retention target, reveal then Again/Hard/Good/Easy, keyboard controls, answer retry queue | Text cards only; no structured MTLE topic hierarchy, exam date, or personal daily workload setting |
| Workload | Up to 20 new cards per day and 60 cards per queue; overdue cards prioritized | Hard-coded defaults; the client advances through the fetched queue rather than inserting newly due learning steps during that session |
| Quiz | Up to eight previously seen cards, server grading, Insight and a Focus multiplier | Distractors are unrelated cards' answers; questions are not selected by the current study topic |
| Progress | Due count, seven-day forecast, card maturity, recent rating-based retention, session quiz scores | No independent exam-readiness measure or subject-level coverage map |
| Game | Focus, Insight, XP, levels, streak support, caches, unlocks, persistent 3D island placement and refunds, character/career progression | Island subject signals still return an empty list; subject learning is not connected to island progression |

The stack is Next.js 16, React 19, TypeScript, Postgres/Drizzle, Auth.js, React Three Fiber, and ts-fsrs. Unit, UI, database integration, and Playwright test suites exist. Their existence is not proof that this checkout passes them.

## Learning gaps to fix first

1. Quiz feedback only reports right/wrong. `src/app/(app)/study/_components/session-quiz.tsx` shows "Not that one. No penalty." without identifying or explaining the correct answer. After submission, return the correct answer, an explanation, and its source. Make missed concepts available for later retrieval.
2. `src/server/services/session-quiz.ts` chooses distractors from other cards' answers without topic constraints. Write or generate reviewed alternatives representing plausible errors within the same concept. Save an immutable question version and its alternatives for each attempt.
3. `src/domain/economy/insight.ts` pays Insight for every self-rating above Again. This may encourage inflated ratings and distort scheduling. Give modest credit for completing a scheduled retrieval attempt regardless of outcome; reserve mastery bonuses for delayed, objectively scored practice. Treat this as a design hypothesis to evaluate.
4. Generated cards immediately enter review in `src/server/services/card-generation.ts`. Add a draft/approved/flagged workflow, source-page references, and a quick side-by-side check. Preserve the exact-quote check, but also check whether each claim is supported. OCR and source notes can themselves contain errors.
5. Quiz attempts enter `card_reviews` but do not update the FSRS schedule. The stats service combines these with self-ratings. Store attempt mode and objective correctness separately from FSRS ratings. Route quiz errors to remediation without assuming multiple-choice recognition equals unprompted recall.
6. Browser visibility and focus determine credited time. Reading a PDF in another application can stop the timer. Offer an explicit external-material study mode, with capped time rewards and learning measured separately. Browser focus cannot establish attention or understanding.

## Evidence and its application

### Retrieval with feedback

Larsen, Butler, and Roediger's randomized trial involved 40 completing medical residents. Repeated short-answer testing with feedback produced 39% versus 26% on a final test more than six months later, a 13 percentage-point difference. This was a small study of two clinical topics, not a Philippine board-exam trial. [Medical Education, 2009](https://pubmed.ncbi.nlm.nih.gov/19930508/).

Application: ask her to retrieve before revealing, optionally type an answer, then show corrective feedback. Use explanations and new questions on the same concept to test more than memorization of card wording. The exact interface is our proposal; the study supports the underlying retrieval-and-feedback approach.

### Spacing

A 2024 review included 23 studies and 3,371 health-professions participants. Spaced online education outperformed massed online education on knowledge, with standardized mean difference 0.32 and moderate-certainty evidence. Nineteen studies had unclear or high risk of bias. This supports spacing, not a guarantee of a particular grade gain or proof that this app's FSRS settings are optimal. [Journal of Medical Internet Research](https://doi.org/10.2196/57760).

Application: retain FSRS, make due reviews easy to start, add a manageable daily time budget, and lower new-card intake when backlog grows. Add exam-date planning for uncovered topics and practice exams without arbitrarily overwriting every FSRS interval. Make short relearning steps reachable within a session when due.

### Interleaving

Brunmair and Richter's meta-analysis of 59 studies found an overall benefit that varied by material. Visual category learning benefited more; findings for expository text were inconclusive, and word-based tasks favored blocking. [Psychological Bulletin, 2019](https://pubmed.ncbi.nlm.nih.gov/31556629/).

Application: after initial teaching, compare easily confused lab findings, cell types, organisms, and procedures. Do not randomly mix every new topic. Image questions need verified source images and labels. A text-only OCR pipeline cannot preserve this information adequately.

### Gamification

Sailer and Homner's meta-analysis found positive effects on cognitive learning, with Hedges' g of 0.49. Motivational and behavioral findings were less stable in more rigorous studies. It did not test Aloft's island, currency, or loot mechanics. [Educational Psychology Review, 2020](https://doi.org/10.1007/s10648-019-09498-w).

Application: retain the island as a reason to return, while measuring learning separately. Prefer predictable progress for completing useful practice, with optional cosmetic surprises. Neither longer timer sessions nor a higher island level should be labeled exam readiness.

## Philippine MTLE coverage

Use a versioned curriculum sourced from the [PRC's 2023 enhanced table of specifications](https://www.prc.gov.ph/sites/default/files/2023-13%20published_Annex_TOS.pdf), adopted through [Resolution 13, series of 2023](https://www.prc.gov.ph/sites/default/files/2023-13%20published_medtech.pdf). The six areas are Clinical Chemistry, Microbiology and Parasitology, Hematology, Blood Banking and Serology, Clinical Microscopy, and Histopathologic Techniques/Medtech Laws and Ethics. Confirm the applicable PRC specifications and exam program for her actual sitting before shipping the curriculum.

Model subject, topic, competency, and source version explicitly. Ask her to confirm AI-suggested mappings. Distinguish covered topics, practiced topics, weak topics, and topics with insufficient evidence. More generated cards do not establish full coverage. Mock exams need application and analysis questions as well as factual recall.

## Proposed daily experience and island rewards

She opens the app and sees a manageable due-review session plus the next uncovered or weak topic. She retrieves answers, gets corrections, then does a small set of application questions. Completed useful work earns a predictable contribution toward her chosen island upgrade. A periodic unfamiliar-question quiz shows whether learning is transferring.

Suggested reward events are scheduled reviews completed, previous mistakes corrected after a delay, weekly consistency, and improvement on comparable practice sets. Give small bonuses for grades while keeping progression accessible during difficult topics. Do not remove earned decorations after a poor score or absence. Cap repeat rewards so replaying the same easy questions is not the fastest route to an upgrade.

Subject-themed decorations could include a microscope bench, chemistry garden, or blood-bank building. Subject badges should reflect explicit evidence, such as delayed performance across several topics, and show when evidence is insufficient. These mechanics are product proposals, not experimentally validated prescriptions.

## Recommended implementation order

1. Fix quiz feedback and distractors; separate quiz performance from self-ratings; add card approval and stronger source support checks.
2. Add the versioned MTLE subject/topic map, exam date, daily time budget, and coverage tracking.
3. Add reviewed application questions, mistake follow-up, unfamiliar practice sets, and verified image cards where the material requires them.
4. Connect island milestones to completed reviews, delayed improvement, and subject progress. Keep existing placement, inventory, and currency infrastructure.

Start with one representative set of her notes. Check transcription, card accuracy, explanations, and topic coverage before bulk importing. Establish a baseline with unfamiliar questions, then compare first-attempt performance on comparable unseen sets and delayed checks. Track workload and willingness to study as well as scores. A personal before/after trial can guide usability and study choices but cannot prove that the app caused an improvement.

Before implementation, the most useful details are her target exam date, typical note formats, daily available time, and weakest subjects.

## Verification in this checkout

All 48 domain/UI suites passed, totaling 228 tests. TypeScript checking passed. The package-manager commands initially triggered dependency installation and stopped on unapproved dependency build scripts; the installed Jest and TypeScript binaries ran successfully without approving those scripts. The installer-added workspace configuration was removed. Database integration tests, Playwright, a production build, and the deployed application were not exercised. Application code was not changed.
