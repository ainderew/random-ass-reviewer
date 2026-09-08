import { nextSteps, type CareerProgress } from '@/domain/career/milestones';

// The nearest unearned step on each track, in plain words. Two lines at most.
export const CareerNext = ({ progress }: { progress: CareerProgress }) => {
  const steps = nextSteps(progress).slice(0, 2);
  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted">Every milestone on the wall is hers.</p>
    );
  }
  return (
    <ul className="space-y-1 text-sm text-ink-2" aria-label="Next milestones">
      {steps.map((step) => (
        <li key={step.milestone.id}>
          <span className="font-medium text-ink">{step.milestone.label}</span>
          <span className="text-muted"> · </span>
          {step.remaining}
        </li>
      ))}
    </ul>
  );
};
