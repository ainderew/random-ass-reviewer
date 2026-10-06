'use client';
import type { ReactNode } from 'react';
import { sceneState, type CareerProgress } from '@/domain/career/milestones';
import {
  ringProgress,
  rungPosition,
  rungsWithin,
} from '@/domain/session/rungs';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import type { CatMood } from '@/game/character/cat-brain';
import type { CareCue, CatLook } from '@/game/character/study-cat';
import { CharacterView } from './character-view';

const R = 47.5;
const CIRCUMFERENCE = 2 * Math.PI * R;

const ROOM_LABEL = {
  bedroom: 'a bedroom desk',
  clinic: 'a clinic',
  office: 'your own office',
} as const;
const WEAR_LABEL = {
  hoodie: '',
  scrubs: 'scrubs on the shelf',
  coat: 'white coat on the hook',
} as const;
const MOOD_LABEL: Record<CatMood, string> = {
  wandering: 'is up and about',
  studying: 'is keeping you company',
  away: 'is waiting for you',
  resting: 'is napping',
};
const FEELING_LABEL = { sad: ' She looks sad.', lonely: ' She looks lonely.' };

// The one shape on the study tab. A ring around a disc with the room in it
// and the cat on her cushion. During a session the ring fills toward the end
// and the cat keeps you company inside; between sessions, `ring` lets it show
// something else, like her next bowl of kibble.
export const FocusCircle = ({
  progress,
  mood,
  focusedMs = 0,
  lengthMs = null,
  name = 'Your cat',
  look,
  cue = null,
  ring,
  corner,
}: {
  progress: CareerProgress;
  mood: CatMood;
  focusedMs?: number;
  lengthMs?: number | null;
  name?: string;
  look?: CatLook;
  cue?: CareCue | null;
  ring?: { fill: number; label: string };
  // A small control on the ring's lower right, such as Today's music.
  corner?: ReactNode;
}) => {
  const scene = sceneState(progress);
  const reducedMotion = useReducedMotion();
  const fill = ring
    ? Math.min(1, Math.max(0, ring.fill))
    : ringProgress(focusedMs, lengthMs);
  const rungs = ring || lengthMs === null ? [] : rungsWithin(lengthMs);
  const pct = Math.round(fill * 100);
  const feeling =
    look && (look.feeling === 'sad' || look.feeling === 'lonely')
      ? FEELING_LABEL[look.feeling]
      : '';
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
    <div className="relative mx-auto aspect-square w-[min(68vw,30dvh,20rem)]">
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full -rotate-90"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={
          ring?.label ??
          (lengthMs === null ? 'Progress to the next rung' : 'Session progress')
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
        className="absolute inset-[6.5%] overflow-hidden rounded-full bg-[radial-gradient(120%_90%_at_50%_15%,#f6e9f1,#ecd7e0)]"
        role="img"
        aria-label={`${label}. ${name} ${MOOD_LABEL[mood]}.${feeling}`}
      >
        <CharacterView
          scene={scene}
          mood={mood}
          reducedMotion={reducedMotion}
          {...(look ? { look } : {})}
          cue={cue}
        />
      </div>
      {corner && (
        <div className="absolute right-[2%] bottom-[2%]">{corner}</div>
      )}
    </div>
  );
};
