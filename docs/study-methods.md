# Flashcard practice methods

Aloft uses the student's approved notes. These are learning tools, not validated Philippine MTLE mock examinations or predictions of passing.

## Evidence and implementation

- **Retrieval before reveal.** Larsen, Butler & Roediger (2009), a randomized trial with medical residents, found better retention after repeated testing with feedback than repeated study at a follow-up over six months later. This supports the recall and written-answer modes. It does not establish the same effect size on Philippine board scores. https://pubmed.ncbi.nlm.nih.gov/19930508/
- **Feedback after multiple choice.** Butler & Roediger (2008) found feedback enhanced retention and reduced learning of incorrect options. Every submitted choice therefore shows correction, the authored explanation, and its source. Only approved cards with three valid distinct distractors qualify. https://pubmed.ncbi.nlm.nih.gov/18491500/
- **Feedback even after a correct guess.** Butler, Karpicke & Roediger (2008) studied benefits for low-confidence correct responses. Correct options still show explanations; the app asks the student to rate guessed answers honestly. https://pubmed.ncbi.nlm.nih.gov/18605878/
- **Spacing.** Scheduled reviews remain driven by the existing FSRS algorithm. Reviews rated Again return sooner; ratings continue to reflect remembered difficulty. Research supports distributed retrieval, but it does not validate every individual FSRS interval for this student. https://pubmed.ncbi.nlm.nih.gov/39388234/

## Shipped behavior

Review has three modes: Flashcards, Write your answer, and Multiple choice. The default is an automatic regimen. New cards start with unaided recall; relearning cards use written recall; every third review of other cards can use multiple choice when valid options exist. This ratio is a product heuristic, not a research-established optimum. Saved card answer types override the automatic format. Review offers a temporary override before each answer; it resets for the next card. Each uses the same due-card queue and optional time-budget batch.

Written answers are temporary and self-assessed against meaning and source, without exact-string or AI grading. Multiple-choice options are shuffled per card presentation and lock on the first selection. Wrong choices offer only Again; correct choices still require an honest recall rating. The summary counts first-choice accuracy for this sitting, not a saved exam grade. Practice content is available to the client like ordinary flashcards; this is not a secure examination.

Ratings persist through the existing review API and offline queue. Completed multiple-choice reviews now save server-graded correctness for Learning progress; written drafts remain temporary. See progress-metrics.md for chart definitions and limits. Card answer-type preferences are saved in the database with a default of automatic, including for existing cards. Existing delayed mistake checks from focus-session quizzes remain available through Review's mistake-follow-up link; standalone multiple-choice misses currently use FSRS Again, not that separate mistake log.

Question quality depends on checking both the card and the distractor explanations during approval. Missing quiz content leads to a clear Notes link and a flashcard fallback; the app does not fabricate unrelated options. Approved does not mean medically verified by a professional.

## Validation and rollout

The automatic regimen and answer-type persistence pass 356 tests across 82 suites. The production build, lint, TypeScript checks, and bundle budget pass. Browser checks covered the phone and iPad landscape editor, Today, automatic review, written response, comparison, multiple choice, and feedback. All fourteen captures passed the automated WCAG A/AA checks without horizontal overflow. The browser flow also verified saving and reloading a multiple-choice preference and scheduling an incorrect response.

Migration `0009_card_answer_type.sql` adds the saved preference with `auto` as the default for existing cards. It was applied and tested on the test database. The deployment entrypoint applies pending migrations before starting the server. Migration `0010_review_progress.sql` adds the practice-history fields used by Learning progress.

## Visible daily and weekly regimen

Today now shows the next review action first, followed by short daily steps with one-line reasons. The daily queue and mistake counts remain live. Weekly guidance asks the student to inspect delayed accuracy, address one difficult topic, and practise unfamiliar questions from a trusted external question bank if available. These weekly actions are guidance, not automatically tracked tasks or an in-app mock exam.

A collapsed research explanation links the primary studies above plus Cepeda et al. (2008), https://pubmed.ncbi.nlm.nih.gov/19076480/, on spacing over different retention intervals, and Butler et al. (2017), https://pubmed.ncbi.nlm.nih.gov/29265856/, on retrieval with varied examples and transfer to new application questions. The latter used geological science materials, not MTLE questions. The daily time budget, once-weekly cadence, one-topic suggestion, format mix, and seven-day chart cutoff are implementation choices, not experimentally established optimum doses. No board-pass claim is made.
