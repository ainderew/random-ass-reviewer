import type { ReactNode } from 'react';
import {
  ringProgress,
  rungPosition,
  rungsWithin,
} from '@/domain/session/rungs';

const R = 46;
const CIRCUMFERENCE = 2 * Math.PI * R;

// The shape around the clock. A fixed length fills toward its end with the
// economy's rungs marked; an open session fills toward the next rung. The
// clock in the middle is unchanged and still the thing you read.
export const SessionRing = ({
  focusedMs,
  lengthMs,
  children,
}: {
  focusedMs: number;
  lengthMs: number | null;
  children: ReactNode;
}) => {
  const progress = ringProgress(focusedMs, lengthMs);
  const rungs = lengthMs === null ? [] : rungsWithin(lengthMs);
  const pct = Math.round(progress * 100);
  return (
    <div className="relative mx-auto aspect-square w-[min(84vw,21rem)]">
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full -rotate-90"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={
          lengthMs === null ? 'Progress to the next rung' : 'Session progress'
        }
      >
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="var(--color-ground-3)"
          strokeWidth="2.5"
        />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="var(--color-focus)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        {rungs.map((rung) => {
          const angle = rungPosition(rung, lengthMs) * 2 * Math.PI;
          const cx = 50 + R * Math.cos(angle);
          const cy = 50 + R * Math.sin(angle);
          const passed = focusedMs >= rung.atMs;
          return (
            <circle
              key={rung.atMs}
              cx={cx}
              cy={cy}
              r={passed ? 2.2 : 1.6}
              fill={passed ? 'var(--color-focus)' : 'var(--color-muted)'}
            >
              <title>{`${rung.label} at ${rung.atMs / 60_000} min`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        {children}
      </div>
    </div>
  );
};
