'use client';

import { sceneState, type CareerProgress } from '@/domain/career/milestones';
import {
  ringProgress,
  rungPosition,
  rungsWithin,
} from '@/domain/session/rungs';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import type { CharacterMood } from '@/game/character/whisker-scholar';
import { CharacterView } from './character-view';

const R = 47.5;
const CIRCUMFERENCE = 2 * Math.PI * R;

const ROOM_LABEL = {
  bedroom: 'a bedroom desk',
  clinic: 'a clinic',
  office: 'her own office',
} as const;
const WEAR_LABEL = {
  hoodie: '',
  scrubs: 'scrubs on the shelf',
  coat: 'white coat on the hook',
} as const;
const MOOD_LABEL: Record<CharacterMood, string> = {
  wandering: 'Up and about.',
  studying: 'Studying.',
  away: 'Looking up.',
  resting: 'Resting.',
};

// The one shape on the study tab. A ring for the session around a disc with
// her room in it. Before a session the ring only shows the rungs the chosen
// length will pass; during one it fills toward the end, and she works inside.
export const FocusCircle = ({
  progress,
  mood,
  focusedMs = 0,
  lengthMs = null,
}: {
  progress: CareerProgress;
  mood: CharacterMood;
  focusedMs?: number;
  lengthMs?: number | null;
}) => {
  const scene = sceneState(progress);
  const reducedMotion = useReducedMotion();
  const fill = ringProgress(focusedMs, lengthMs);
  const rungs = lengthMs === null ? [] : rungsWithin(lengthMs);
  const pct = Math.round(fill * 100);
  const label = [
    `At ${ROOM_LABEL[scene.room]}`,
    WEAR_LABEL[scene.wardrobe],
    scene.vehicle === 'none'
      ? ''
      : `${scene.vehicle.replace('-', ' ')} outside`,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="relative mx-auto aspect-square w-[min(88vw,24rem)]">
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
          strokeWidth="3"
        />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="var(--color-focus)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fill)}
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
              r={passed ? 2.4 : 1.8}
              fill={passed ? 'var(--color-focus)' : 'var(--color-muted)'}
            >
              <title>{`${rung.label} at ${rung.atMs / 60_000} min`}</title>
            </circle>
          );
        })}
      </svg>
      <div
        className="absolute inset-[6.5%] overflow-hidden rounded-full bg-ground-2"
        role="img"
        aria-label={`${label}. ${MOOD_LABEL[mood]}`}
      >
        <CharacterView
          scene={scene}
          mood={mood}
          reducedMotion={reducedMotion}
        />
      </div>
    </div>
  );
};
