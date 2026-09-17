# Learning and motivation UX research

September 18, 2026. Focused desk research and repository review, not a systematic review or completed usability study. The intended learner is Andrew's girlfriend, preparing for the Philippine MTLE around March 2027 on a phone and iPad. Her notes, available study time, baseline scores, and main motivational obstacle remain unknown. All new features below are proposals. This research does not alter the application or deploy the pending coastal redesign.

## Recommendation

Make the daily experience start with a manageable learning task. Help her see what to do, finish it, understand mistakes, and return after a difficult day. Keep the island as a personally chosen reward for that work. Measure delayed learning and unfamiliar-question performance separately from time spent and game progress.

The first release should add a Today plan, a five-minute option, and scheduled follow-up for mistakes. In parallel, resolve the conflict between the focus timer and reading PDFs in another application. Independent application questions and evidence-based progress reporting follow once reviewed content is available.

## What the evidence supports

The confidence labels below are product judgments about the underlying principle, not formal GRADE ratings for Aloft. Exact budgets, reward values, layouts, and notification schedules still require testing.

| Evidence | Finding and limitation | Design implication |
| --- | --- | --- |
| Trumble et al., 2024, [distributed and retrieval practice in health professions](https://pubmed.ncbi.nlm.nih.gov/37615780/) | Review of 56 eligible articles and 63 experiments; 43 studies reported significant benefits. Methods and assessments varied. This supports retrieval and spacing, not a promised MTLE score increase. | High confidence in keeping scheduled retrieval central. Make starting due reviews easier than starting an empty timer. |
| Martinengo et al., 2024, [spaced digital education](https://doi.org/10.2196/57760) | Review of 23 studies, 3,371 participants. Spaced versus massed online education favored spacing for knowledge, SMD 0.32, moderate-certainty evidence. Nineteen studies had unclear or high risk of bias. | Preserve spacing; do not interpret this effect size as a percentage-point grade gain or proof of optimal FSRS settings. |
| Butler, 2010, [retrieval and transfer](https://pubmed.ncbi.nlm.nih.gov/20804289/) | Four experiments found better retention and transfer after repeated testing than repeated studying, including new inferential questions after a week. Laboratory prose tasks do not reproduce a professional board exam. | Add approved questions that require applying a concept in a new situation. Merely rephrasing the same card is insufficient evidence of transfer. |
| Metcalfe, 2017, [learning from errors](https://pubmed.ncbi.nlm.nih.gov/27648988/) | Review supports errorful learning followed by corrective feedback. High-confidence errors can respond particularly well to correction. This does not validate any particular error-priority algorithm. | Give a correction, a reason, and a later chance to retrieve. Optionally capture confidence before revealing the answer to identify misconceptions. |
| Brunmair and Richter, 2019, [interleaving](https://pubmed.ncbi.nlm.nih.gov/31556629/) | Meta-analysis of 59 studies found benefits that depended on material and similarity; findings were not uniformly positive for all tasks. | Use comparison practice for confusable categories after initial teaching. Avoid randomizing every unfamiliar topic together. |
| Bureau et al., 2022, [pathways to student motivation](https://selfdeterminationtheory.org/wp-content/uploads/2021/09/2021_PathwaystoStudentMotiv_BureaHowardEtal.pdf) | Meta-analysis of 144 studies and over 79,000 students. Competence, autonomy, and relatedness were associated with self-determined motivation; competence was the strongest predictor. Associations do not establish that a particular screen causes motivation. | Give her meaningful choices, credible signs of improvement, and optional support. Let her choose an island goal and a workload she can manage. |
| van Gaalen et al., 2021, [gamification in health professions](https://pubmed.ncbi.nlm.nih.gov/33128662/) | Review of 44 studies found promising learning and participation results, but many studies lacked well-defined controls and explanations of mechanisms. | Treat the island as a testable motivational aid. More points, longer sessions, and more app opens are not evidence of learning. |
| Silverman and Barasch, 2023, [intact and broken streaks](https://doi.org/10.1093/jcr/ucac029) | Consumer experiments and field data indicate that logged streaks can affect subsequent engagement; broken streaks can discourage continuation and repair can attenuate the effect. Not a board-exam study. Publisher full text was unavailable in this session; conclusions are restricted to the indexed abstract and study summary. | Test flexible weekly goals and supportive return flows. Do not make a missed day erase earned island progress. |
| Krasne et al., 2013, [perceptual and adaptive histopathology learning](https://pubmed.ncbi.nlm.nih.gov/24524000/) | A medical education study applied adaptive visual categorization using 261 distinct histology images. It addresses a different skill from memorizing one labeled picture. Small domain-specific evidence should not be generalized to every MTLE competency. | Later, support reviewed images and multiple examples of the same category, with held-out images for assessment. Do not generate diagnostic microscopy images with Imagegen. |

Several sources were available only through abstracts or indexed extracts. No reviewed study evaluates Aloft, its island economy, or this learner. The stronger learning evidence comes from multiple studies; the interface and reward proposals are inferences from it.

## Gaps in the current app

These are code observations, not findings from watching her study.

| Existing behavior | Relevant code | Opportunity |
| --- | --- | --- |
| Home emphasizes the timer; preset sessions are 25 or 50 minutes, plus Open | `study/_components/idle-view.tsx`, `domain/session/rungs.ts` | Add a short route into actual learning and make due reviews the default recommendation when available. |
| FSRS, honest-rating credit, card approval, quiz explanations, and subject counts already exist | `server/services/review.ts`, `server/services/session-quiz.ts`, `review/_components/study-plan.tsx` | Build on these instead of replacing them. |
| Review advances through one fetched queue; mistakes appear as expandable corrections | `review/_components/review-session.tsx`, `review/_components/study-plan.tsx` | Give mistakes a scheduled follow-up and make due relearning steps reachable without restarting manually. |
| Focus requires a visible, focused document | `study/_hooks/use-focus-flag.ts` | Reading a PDF in another app may stop credited time. Offer an explicit external-material mode and test iPad multitasking. |
| Chest eligibility starts at 15 minutes; longer sessions increase rare-item odds | `domain/economy/loot-tables.ts` | Reward completed learning work consistently. Audit whether long-session bonuses encourage staying for loot after useful work is finished. |
| Subject progress counts approved and practiced cards | `server/services/study-plan.ts` | Keep honest labels. Add objective practice evidence without converting inventory counts into readiness percentages. |
| Quizzes reuse approved flashcard material | `server/services/session-quiz.ts` | Add a separate source of reviewed, unfamiliar application questions for assessment. |

Paths beginning with `study/` and `review/` are under `src/app/(app)/`; domain and server paths are under `src/`.

## Proposed experience

### 1. Today plan

One primary action: Start today's review. Offer 5, 15, or 30 minutes as prototype choices, with a custom budget available later. These durations are hypotheses, not evidence-based optimal intervals.

Build a small plan from due cards, due mistake follow-ups, and a limited amount of new material. Show why each task was selected. Estimate duration using her observed pace when enough data exists and label it as an estimate. Let her change the subject or shorten the plan.

Do not hide the existence of a backlog. Show the selected batch first and the remaining work in details. When behind, reduce new-card intake with a clear explanation and let her opt back in. Do not silently postpone or rewrite every FSRS due date just to make the screen look clear.

The five-minute version should earn meaningful progress even when she cannot complete a longer session. Stop at a clear end point, with Continue optional. If no approved cards exist, replace the plan with the next useful task: upload a note or approve a small batch. Never manufacture a review queue.

### 2. Mistake follow-up

After a wrong answer, show the correct answer, why it fits, why the selected option fails when a reviewed explanation exists, and the source. Ask for a later independent retrieval attempt before calling the concept recovered.

A useful sequence is attempt, correction, a new question later, and another check after a delay. The exact delay should depend on existing scheduling and evaluation, not a universal hard-coded recipe. Track concepts and question versions so a repeated stem cannot masquerade as an unfamiliar assessment.

Optional confidence buttons such as Guessing and Confident belong before feedback. They are separate from the FSRS rating. Start with an optional field on objectively scored questions, and keep it only if she finds it useful. A correct guess and a confident misconception merit different follow-up.

### 3. Exam practice

Provide separate Practice and Timed modes. Practice allows immediate explanation; a timed block holds feedback until the end. Begin with short sets. Add full-length subject blocks only when there is a sufficiently large, reviewed bank.

Include interpretation, procedure selection, and other application tasks aligned to the applicable specification. Track first attempts, previously seen questions, hints, and untimed versus timed performance separately. Auto-generated questions must be reviewed for correctness, ambiguity, source support, and plausible alternatives.

The official [March 2026 PRC program](https://www.prc.gov.ph/sites/default/files/March%202026%20MTLE%20Program.pdf) used six subject blocks over two days, with two hours per subject. That is useful historical format context, not confirmation of March 2027 details. The [PRC schedule page](https://www.prc.gov.ph/exam-schedules-menu) consulted did not list 2027. Keep March 2027 labeled as her target until confirmed. Use a versioned competency map and recheck the applicable specifications before matching exam weights or schedules.

### 4. Visible learning progress

Show evidence she can understand: attempted unfamiliar questions, accuracy with its denominator, the date range, and concepts corrected on a later check. Distinguish not yet covered, insufficient practice, needs review, and demonstrated on the observed checks. Avoid claiming complete mastery from a few items.

Do not show an estimated board score or chance of passing without a validated model. Show her own past performance only when the sets have comparable topic and difficulty composition. When uncertain, say there is not enough practice to judge yet.

### 5. Island projects she chooses

Keep Focus and Insight rather than add another currency. Let her pin one affordable project, see the next contribution, and preview its placement. Useful reviews earn modest predictable progress, including Again. Additional delayed-recovery recognition can be cosmetic and should not dominate the economy.

A short session contributes; a long absence never removes buildings. Grade bonuses should remain small enough that difficult topics are worth attempting. No score leaderboard is needed for this personal study app. Test whether she actually enjoys building and choosing decorations before expanding the asset collection.

Rebalance rewards around scheduled learning work before adding more rare loot. Use caps and unique attempt records so repeating easy questions does not become the best strategy. Do not count pressing Continue or revealing an answer as proof of learning. Any completion recognition is for participation; knowledge claims require objective evidence.

### 6. Return after a break

Replace prominent all-or-nothing streak pressure with a chosen weekly goal, optional rest days, and a return screen that offers a small batch. Proposed wording: Welcome back. Start with five minutes. Keep the backlog available without using it as a warning banner.

Let her choose whether and when reminders arrive. A reminder should link directly to a useful task, not merely invite her to collect currency. Do not add reminders until we know her routine. Allow muting and rescheduling without repeated prompts.

Optional support from Andrew should be something she chooses to share, such as finishing a practice set or building a cottage. Do not default to exposing scores, missed days, or study time. A partner feature remains low priority until she asks for it.

### 7. Notes and iPad workflow

For note approval, show one proposed card with its exact source on the same screen. On iPad, use two panes when space permits; on phone, use an accessible source sheet and preserve the draft when it closes. Keep uncertain OCR, tables, and missing figures visible for review. Avoid turning hundreds of generated drafts into another backlog she must clear before studying.

An external-material session should explicitly distinguish self-reported reading time from in-app verified events. Background execution on a phone or tablet is not a reliable clock. Reconcile start and end timestamps server-side, apply caps, and avoid claiming that tab visibility proves attention. Let her resume after changing apps, locking the screen, or losing the connection.

Image-based learning needs original image references, readable labels, magnification, and a zoomable view. Multiple source examples matter more than decorative graphics. Preserve image context and confirm reuse rights before building a shared bank.

## Phone and iPad interaction requirements

- Put the selected task and one main action before decorative artwork or secondary counters. Keep the island reachable without interrupting every answer.
- Keep explicit Show answer and rating buttons. Swipes may be shortcuts, but cannot be the only way to act.
- Preserve focus and pending answers through rotation, app switching, and reconnects. Show Saved and Waiting to sync as distinct states.
- Support text resizing, screen readers, reduced motion, and readable scientific notation and tables. Do not clip long answers inside a fixed-height card.
- Use generous targets and visible feedback. [Apple's design guidance](https://developer.apple.com/design/tips/) recommends at least 44-by-44-point controls. For this PWA, maintain at least 44 CSS pixels for primary touch targets and verify actual device usability rather than treating points and CSS pixels as universally interchangeable.
- On iPad, adapt to the available window width, including split view. On phones, test one-handed use and the software keyboard. Emulation does not replace a short test on her own devices.

## Build order and acceptance criteria

| Priority | Deliverable | Definition of done |
| --- | --- | --- |
| First | Today plan and five-minute entry | Uses real approved/due content; estimates rather than promises duration; handles empty, backlogged, and resumed states; preserves schedules; shows a clear stopping point. |
| First | Mistake follow-up | Later attempts persist; original error and question version remain traceable; feedback is available; self-rating and objective correctness stay separate; no duplicate rewards. |
| First | External-material session | PDF/app switching works as described; interruptions recover; capped time is labeled honestly; phone and iPad behavior tested. |
| Next | Reviewed application-question bank and progress evidence | Subject/competency metadata and answer review exist; first-attempt unfamiliar performance is separable; small samples remain visible; no unsupported readiness prediction. |
| Next | Chosen island projects and weekly goals | Short learning sessions contribute, difficult questions are not disadvantaged, missed days remove nothing, and existing balances are preserved. |
| Later | Visual identification practice | Rights-cleared originals, verified labels, multiple category examples, and separate assessment images. |
| Only if requested by her | Partner encouragement and additional reminders | Sharing and notification preferences are explicit and easy to change. |

The order may change after observing her. If she already has a reliable daily routine, move independent application questions ahead of motivational features. If she cannot start, validate the short Today plan first. If her notes are hard to ingest, prioritize that bottleneck before adding any more practice modes.

## Research with her

A 20-minute observation would be more useful than another large feature list. Ask her to use one real note on her phone or iPad, create and check a few cards, answer a question, find the source, and leave and return to the app. Ask what she would do on a tired day. Do not coach her through the interface during the task.

Ask about her current review center or question bank, available time, difficult subjects, why she wants to become an RMT, what makes her stop a session, and whether the island is enjoyable or distracting. Avoid asking which abstract features she likes; observe where work stalls.

Compare the timer-led home with the Today plan using the same scenario. Note time to start meaningful practice, errors, requests for help, source-check success, and whether she can identify her next task. This is a personal usability study, not general population research.

## Evaluation over four weeks

1. Establish a baseline with a reviewed unfamiliar set and her current routine. Record topics, difficulty, prior exposure, and study time. Do not withhold useful study just to create a control period.
2. Introduce one main workflow change for the next two weeks. Track planned-session completion, return after a missed day, perceived workload, and errors that get a later follow-up.
3. Use comparable held-out questions and delayed checks in the final week. Report raw counts alongside percentages. Record outside review classes and other changes that could explain improvement.
4. Ask whether she wants to keep the feature. A small optional weekly question about effort and enjoyment is preferable to a survey after every card.

Primary outcomes: first-attempt accuracy on reviewed unfamiliar items and delayed correction of previously missed concepts. Supporting outcomes: starts, useful completions, return after absence, time cost, and her willingness to use the app. Diagnostic signals: source errors, abandoned approval batches, growing due backlog, repeated easy-question farming, and notifications muted.

A one-person before/after trial cannot establish causality or predict board results. It can reveal whether the workflow is usable and whether practice performance is moving in the intended direction. Do not run significance tests on individual card taps as though they were independent participants.

## What to avoid next

Do not spend the next release on a large asset shop, mandatory social competition, punitive streaks, more currencies, a generic chatbot, or a prominent pass-probability gauge. Each adds work or pressure before addressing the observed learning gaps. Preserve the current approved-content workflow and honest review credit while testing the smaller daily experience.
