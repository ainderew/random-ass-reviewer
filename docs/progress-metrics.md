# Measuring learning progress

The dashboard supports learning decisions. It is not a validated Philippine MTLE readiness test and does not estimate a probability of passing.

## What to measure and why

1. **Scored performance after a delay.** Larsen, Butler & Roediger's randomized trial found repeated testing with feedback improved medical residents' retention at a follow-up over six months later. Delayed performance is more useful than an immediate rereading check for detecting durable learning. Our seven-day reporting filter is a practical product choice, not the trial's protocol or a proven mastery threshold. https://pubmed.ncbi.nlm.nih.gov/19930508/
2. **First-choice accuracy, with denominators.** Corrections after multiple-choice tests can reduce learning of distractors. The app grades the selected option on the server and records the completed review. It displays correct/total, not just a percentage. Same-card same-day repeats count as activity but not extra score evidence. https://pubmed.ncbi.nlm.nih.gov/18491500/
3. **Repeated mistakes and subject-specific results.** These are our diagnostic summaries of scored practice, not independently validated predictors. Questions missed on multiple days deserve a review of the explanation and source. Subject results help identify uneven practice, but small samples and changing difficulty limit comparisons.
4. **Performance on new, comparable questions.** Butler's experiments examined retention and transfer beyond the studied material. Familiar flashcard performance cannot establish that a learner can apply the knowledge to an unseen board question. The app does not yet track external mock-exam scores; those should be used alongside this dashboard. https://pubmed.ncbi.nlm.nih.gov/20804289/
5. **Practice consistency as context.** A 2024 observational study associated more exam-style retrieval practice with improvements in residents' in-training scores, but prior scores also predicted future scores and had a larger effect. It cannot establish that more clicks cause a given score gain. Active days and completed reviews are therefore process measures, not mastery scores. https://pubmed.ncbi.nlm.nih.gov/38887411/

Self-rated Good/Easy recall is separate from scored accuracy. Confidence calibration would require confidence collected before feedback; a post-reveal rating is not a valid substitute. The app does not currently claim to measure confidence calibration.

## Exact definitions

- Window: the last 28 local calendar days, grouped into four consecutive seven-day periods ending today. These are rolling periods, not ISO weeks.
- A qualifying score uses the first completed review of a given card on each local day. A later multiple-choice attempt is excluded even if the first attempt was written/flashcard recall, since the answer was already exposed.
- Multiple-choice accuracy: correct selections divided by scored qualifying Review attempts. The selected text must match a current valid option; the server computes correctness. Incorrect choices require Again.
- Delayed multiple choice: the same calculation restricted to cards whose previous review was at least seven days earlier. It is a subset, not an independent series.
- Delayed self-rated recall: Good/Easy divided by qualifying written/recall reviews after at least seven days. It is subjective.
- Repeated mistakes: distinct cards with incorrect qualifying multiple-choice results on at least two different days in the window.
- Subject results: scored reviews grouped by subject at review time, with distinct-card counts. Missing subjects remain visible.
- Active days and review count include historical unscored records and repeated practice, including days with no qualifying scores.

Migration 0010 adds nullable practice type, correctness, previous-review gap, and subject snapshots. Earlier records remain unscored. New completed Review attempts feed the chart automatically; focus-session quizzes are not included in this chart. Abandoned attempts are not saved. This is a self-study tool, not a secure exam: users can access their flashcard answers. Deleted cards currently cascade-delete their review history, so results reflect retained records.

## Reading changes over time

Blank weeks are missing evidence, not zero accuracy. The chart does not smooth, interpolate missing periods, declare a statistically significant improvement, or compare the student with a cohort. Sample size, subject mix, item difficulty, repeated exposure, and practice format can all change the observed percentage. A rising line is encouraging descriptive evidence; it is not proof of readiness for a board exam.

## Validation

356 tests across 82 suites pass, including same-day deduplication, timezone boundaries, delayed subsets, legacy unknown results, repeat errors, server grading, duplicate rejection, and account isolation. Production build, lint, type checking, and bundle checks pass. Nine browser captures cover empty history and each chart mode/table on phone and iPad landscape, without automated WCAG A/AA findings or horizontal overflow. Browser testing verified that a completed incorrect review appears as 0/1 in the authenticated progress endpoint. Historical screenshot values are synthetic data created only for an isolated QA user and removed afterward. These changes have not been deployed.
