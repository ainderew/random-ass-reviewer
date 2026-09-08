'use client';

import { Button } from '@/components/ui/button';
import { useWeeklySummary } from '../_hooks/use-weekly-summary';

const oneDecimal = (n: number) => (Math.round(n * 10) / 10).toString();

// Plain and factual. A product built on dopamine owes its users the truth
// about what it produces.
export const WeeklySummaryCard = () => {
  const { summary, visible, dismiss } = useWeeklySummary();
  if (!visible || !summary) return null;
  return (
    <section
      aria-label="This week"
      className="fade-in space-y-3 rounded-lg border border-hairline bg-ground-2 px-4 py-3"
    >
      <p className="text-sm text-ink-2">
        This week so far: {oneDecimal(summary.hours)} hours over{' '}
        {summary.sessions} {summary.sessions === 1 ? 'session' : 'sessions'}
        {summary.bestDay
          ? `, best day ${oneDecimal(summary.bestDay.hours)} hours`
          : ''}
        {summary.cardsReviewed > 0
          ? `, ${summary.cardsReviewed} cards reviewed${
              summary.retention === null
                ? ''
                : ` at ${Math.round(summary.retention * 100)}% retention`
            }`
          : ''}
        .
      </p>
      {summary.heavy ? (
        <p className="text-sm text-ink-2">
          That is a lot of hours. Rest is part of learning.
        </p>
      ) : null}
      <Button variant="ghost" onClick={dismiss}>
        Got it
      </Button>
    </section>
  );
};
