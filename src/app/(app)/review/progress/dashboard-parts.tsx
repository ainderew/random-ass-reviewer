import type { CSSProperties, ComponentType, ReactNode } from 'react';
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

export const StageLegend = ({ stages }: { stages: StageCounts }) => (
  <ul className="stage-legend">
    <li data-stage="solid">
      <b>{stages.solid}</b> solid
    </li>
    <li data-stage="learning">
      <b>{stages.learning}</b> learning
    </li>
    <li data-stage="new">
      <b>{stages.new}</b> not started
    </li>
  </ul>
);

// One summary tile: a coloured icon and title, then the number that matters.
export const Tile = ({
  icon: Icon,
  title,
  color,
  value,
  unit,
  caption,
  wide,
  footer,
  children,
}: {
  // Under the caption, for help that opens in place.
  footer?: ReactNode;
  // Spans both columns, for tiles whose chart needs the room.
  wide?: boolean;
  icon: ComponentType<{ size?: number }>;
  title: string;
  color: string;
  value: ReactNode;
  unit?: string;
  caption: ReactNode;
  children?: ReactNode;
}) => (
  <section
    className="dash-tile"
    data-wide={wide || undefined}
    style={{ '--tile': color } as CSSProperties}
  >
    <h3 className="dash-tile-head">
      <Icon size={18} />
      {title}
    </h3>
    <p className="dash-value">
      {value}
      {unit && <small>{unit}</small>}
    </p>
    {children}
    <p className="dash-caption">{caption}</p>
    {footer}
  </section>
);
