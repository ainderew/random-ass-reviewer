import { MIN_SESSION_MS } from '@/domain/economy/constants';
import { formatMinutes } from '@/lib/format-time';

// One lantern per session today: lit when it paid, an ember when it was
// short, and a faint outline for the next one. A row, not a score.
export const TodayLanterns = ({
  sessions,
  creditedMs,
}: {
  sessions: Array<{ creditedMs: number }>;
  creditedMs: number;
}) => {
  if (sessions.length === 0) return null;
  const shown = sessions.slice(-8);
  return (
    <div className="space-y-1.5">
      <ul
        aria-label={`${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'} today`}
        className="flex items-end gap-3"
      >
        {shown.map((session, i) => {
          const lit = session.creditedMs >= MIN_SESSION_MS;
          return (
            <li key={i} className="flex flex-col items-center gap-1">
              <svg
                width="14"
                height="30"
                viewBox="0 0 14 30"
                aria-hidden="true"
              >
                <rect
                  x="6"
                  y="14"
                  width="2"
                  height="16"
                  fill="var(--color-muted)"
                />
                <circle
                  cx="7"
                  cy="8"
                  r="6"
                  fill={lit ? 'var(--color-focus)' : 'none'}
                  stroke={lit ? 'none' : 'var(--color-focus-deep)'}
                  strokeWidth="1.5"
                />
              </svg>
              <span className="font-mono text-[10px] text-muted tabular-nums">
                {Math.floor(session.creditedMs / 60_000)}
              </span>
            </li>
          );
        })}
        <li className="flex flex-col items-center gap-1" aria-hidden="true">
          <svg width="14" height="30" viewBox="0 0 14 30">
            <rect
              x="6"
              y="14"
              width="2"
              height="16"
              fill="var(--color-hairline)"
            />
            <circle
              cx="7"
              cy="8"
              r="6"
              fill="none"
              stroke="var(--color-hairline)"
              strokeWidth="1.5"
            />
          </svg>
          <span className="text-[10px] text-muted">next</span>
        </li>
      </ul>
      <p className="text-sm text-muted">
        {formatMinutes(creditedMs)} credited today across {sessions.length}{' '}
        {sessions.length === 1 ? 'session' : 'sessions'}.
      </p>
    </div>
  );
};
