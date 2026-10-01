import type { StudyBudget, TodayPlan } from '@/domain/review/today';

// Today, as a short list the student can read at a glance: review the cards
// that are due, retry any quiz questions that came back, then focus with the
// cat. The first step not yet done is the one the app points at.

export const FOCUS_GOAL_MIN = 25;

export type AgendaStepId = 'notes' | 'review' | 'retry' | 'focus';
export type AgendaState = 'done' | 'now' | 'later';

export interface AgendaStep {
  id: AgendaStepId;
  state: AgendaState;
  title: string;
  // The one number that matters for the step: "18 cards", "10 of 25 min".
  detail: string;
  href: string;
}

export interface AgendaInput {
  plan: Pick<
    TodayPlan,
    'batches' | 'reviewedToday' | 'approved' | 'mistakesDue'
  >;
  size: StudyBudget;
  focusTodayMs: number;
  catName: string;
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export function dayAgenda(input: AgendaInput): AgendaStep[] {
  const { plan, size, catName } = input;
  const steps: Omit<AgendaStep, 'state'>[] = [];
  const done = new Set<AgendaStepId>();

  if (plan.approved === 0) {
    steps.push({
      id: 'notes',
      title: 'Add your notes',
      detail: 'for cards',
      href: '/notes',
    });
  } else {
    const due = plan.batches[size].total;
    if (due === 0) done.add('review');
    steps.push({
      id: 'review',
      title: 'Review cards',
      detail:
        due > 0
          ? plural(due, 'card', 'cards')
          : plan.reviewedToday > 0
            ? `${plan.reviewedToday} done`
            : 'Nothing due',
      href: `/review?minutes=${size}`,
    });
  }

  if (plan.mistakesDue > 0) {
    steps.push({
      id: 'retry',
      title: 'Retry missed questions',
      detail: plural(plan.mistakesDue, 'question', 'questions'),
      href: '/review/mistakes',
    });
  }

  const minutes = Math.floor(input.focusTodayMs / 60_000);
  if (minutes >= FOCUS_GOAL_MIN) done.add('focus');
  steps.push({
    id: 'focus',
    title: `Focus with ${catName}`,
    detail:
      minutes >= FOCUS_GOAL_MIN
        ? `${minutes} min today`
        : minutes > 0
          ? `${minutes} of ${FOCUS_GOAL_MIN} min`
          : `${FOCUS_GOAL_MIN} min`,
    href: '/focus',
  });

  let pointed = false;
  return steps.map((step) => {
    if (done.has(step.id)) return { ...step, state: 'done' };
    const state: AgendaState = pointed ? 'later' : 'now';
    pointed = true;
    return { ...step, state };
  });
}

export function currentStep(steps: AgendaStep[]): AgendaStep | null {
  return steps.find((s) => s.state === 'now') ?? null;
}

// What the cat says about it, in a few words.
export function catLine(
  steps: AgendaStep[],
  options: { missesYou: boolean; focusing: boolean },
): string {
  if (options.focusing) return 'We are focusing. Back to the timer?';
  const now = currentStep(steps);
  const line = !now
    ? "That's today. I'm proud of you."
    : now.id === 'notes'
      ? 'Add your notes and we can start.'
      : now.id === 'review'
        ? `${now.detail} to review first.`
        : now.id === 'retry'
          ? `${now.detail} to retry.`
          : now.detail.includes(' of ')
            ? `${now.detail} of focus so far. More?`
            : `Now focus with me for ${FOCUS_GOAL_MIN} min.`;
  return options.missesYou ? `I missed you! ${line}` : line;
}

// The one button on Today.
export function actionFor(
  step: AgendaStep | null,
): { label: string; href: string } | null {
  if (!step) return null;
  const label = {
    notes: 'Add notes',
    review: 'Start review',
    retry: 'Retry questions',
    focus: 'Start focusing',
  }[step.id];
  return { label, href: step.href };
}
