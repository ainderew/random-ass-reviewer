import type { StageCounts } from '@/domain/review/overview';

export const monthName = (yearMonth: string) =>
  new Date(`${yearMonth}-01T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

export const shortDate = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

export const cardsLabel = (n: number) => `${n} ${n === 1 ? 'card' : 'cards'}`;

// Deeper coral, more lasting memory. The counts always sit beside the bar.
export const StageBar = ({ stages }: { stages: StageCounts }) => (
  <div
    className="stage-bar"
    role="img"
    aria-label={`${stages.solid} solid, ${stages.learning} learning, ${stages.new} not started`}
  >
    {(['solid', 'learning', 'new'] as const).map((stage) =>
      stages[stage] ? (
        <span
          key={stage}
          data-stage={stage}
          style={{ flexGrow: stages[stage] }}
        />
      ) : null,
    )}
  </div>
);
