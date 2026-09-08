'use client';

import { DiamondGlyph } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

function nextDueLine(nextDueAt: Date | string | null): string {
  if (!nextDueAt) return 'Nothing is scheduled yet.';
  const at = new Date(nextDueAt);
  const sameDay = at.toDateString() === new Date().toDateString();
  return sameDay
    ? `Next review later today, around ${at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`
    : `Next review ${at.toLocaleDateString([], { weekday: 'long' })}.`;
}

// "No cards" is a task. "Caught up" is an achievement. They must not look alike.
export const ReviewComplete = ({
  reviewed,
  insight,
  bestRun,
  totalCards,
  nextDueAt,
  onAgain,
}: {
  reviewed: number;
  insight: number;
  bestRun: number;
  totalCards: number | null;
  nextDueAt: Date | string | null;
  onAgain: () => void;
}) => {
  if (reviewed === 0 && totalCards === 0) {
    return (
      <EmptyState
        title="No cards yet"
        body="Upload your lecture notes and we will turn them into a deck you can review here."
        action={{ href: '/notes', label: 'Upload notes' }}
      />
    );
  }
  if (reviewed === 0) {
    return (
      <EmptyState title="You're caught up" body={nextDueLine(nextDueAt)}>
        <Button variant="ghost" onClick={onAgain}>
          Check again
        </Button>
      </EmptyState>
    );
  }
  return (
    <section className="rise-in space-y-6" aria-label="Review complete">
      <div className="space-y-2">
        <h1 className="font-serif text-4xl leading-tight text-ink">
          Deck cleared
        </h1>
        <p className="text-ink-2">
          {reviewed} {reviewed === 1 ? 'card' : 'cards'} reviewed
          {bestRun >= 3 ? `, best run ${bestRun}` : ''}.{' '}
          {nextDueLine(nextDueAt)}
        </p>
      </div>
      {insight > 0 ? (
        <p className="flex items-center gap-2 font-mono text-4xl text-insight tabular-nums">
          <DiamondGlyph size={26} />+{insight}{' '}
          <span className="text-xl">Insight</span>
        </p>
      ) : null}
      <Button onClick={onAgain}>Check again</Button>
    </section>
  );
};
