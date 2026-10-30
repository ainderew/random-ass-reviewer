import type { CatMood } from './cat-brain';

export type IllustratedActivity =
  'idle' | 'look' | 'write' | 'ponder' | 'sleepy' | 'doze' | 'stretch';
// Seconds per beat. Writing and pauses alternate before a short sleepy spell.
const DESK: readonly (readonly [IllustratedActivity, number])[] = [
  ['idle', 4],
  ['look', 4],
  ['write', 10],
  ['ponder', 4],
  ['write', 9],
  ['sleepy', 6],
  ['doze', 8],
  ['stretch', 4],
  ['look', 4],
  ['write', 12],
];
const FOCUS: typeof DESK = [
  ['write', 16],
  ['ponder', 4],
  ['write', 18],
  ['look', 4],
  ['write', 14],
  ['sleepy', 6],
  ['doze', 4],
  ['stretch', 4],
  ['write', 18],
  ['idle', 4],
];

export function illustratedActivity(
  seconds: number,
  mood: CatMood,
): IllustratedActivity {
  if (mood === 'resting') return 'doze';
  const sequence = mood === 'studying' ? FOCUS : DESK;
  let remaining =
    seconds % sequence.reduce((sum, [, duration]) => sum + duration, 0);
  for (const [activity, duration] of sequence) {
    if (remaining < duration) return activity;
    remaining -= duration;
  }
  return 'idle';
}
