import { MTLE_SUBJECTS } from '@/domain/study/medtech';
import type { LearningProgress } from './progress';

// Display rules, not validated mastery thresholds. Require breadth as well as
// attempts so repeatedly answering one familiar card cannot rank a subject.
export function progressAdvice(progress: LearningProgress) {
  return MTLE_SUBJECTS.map(({ id, label }) => {
    const result = progress.subjects.find((s) => s.subject === id);
    const choices = result?.choices ?? { correct: 0, total: 0 };
    const delayed = result?.delayedChoices ?? { correct: 0, total: 0 };
    const cards = result?.cards ?? 0;
    const enough = choices.total >= 5 && cards >= 3;
    const missed = choices.total - choices.correct;
    const status = !choices.total
      ? 'untracked'
      : !enough
        ? 'limited'
        : missed
          ? 'focus'
          : 'extend';
    return { id, label, choices, delayed, cards, missed, status };
  }).sort((a, b) => {
    const priority = { focus: 0, limited: 1, untracked: 2, extend: 3 };
    return (
      priority[a.status as keyof typeof priority] -
        priority[b.status as keyof typeof priority] ||
      (a.status === 'focus'
        ? a.choices.correct / a.choices.total -
          b.choices.correct / b.choices.total
        : 0) ||
      a.label.localeCompare(b.label)
    );
  });
}
