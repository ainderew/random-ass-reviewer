import type { CareAction } from './care';

// How happy the cat is, 0 to 100. Studying with her and caring for her raise
// it. Left alone, she is fine for half a day, then it falls two points an
// hour, all the way down: after about two days away she is sad. The owner
// chose a cat that can be sad over one that stops at content (decision 55).

export const HAPPY_MAX = 100;
export const HAPPY_START = 70;
export const GRACE_HOURS = 12;
export const DECAY_PER_HOUR = 2;
const HOUR = 3_600_000;

// Studying beside her: 25 focused minutes is +10.
export const STUDY_GAIN_PER_MINUTE = 0.4;

export const CARE_GAIN: Record<CareAction, number> = {
  feed: 6,
  treat: 10,
  brush: 8,
  play: 12,
};
// Brushing and play are free, so each pays happiness once per 20 minutes;
// more of it is just for fun.
export const REPEAT_COOLDOWN_MS = 20 * 60_000;

// Past this long without studying or caring for her, she misses you.
export const MISSES_YOU_AFTER_MS = 18 * HOUR;

export type PetMood =
  'sad' | 'lonely' | 'content' | 'happy' | 'delighted' | 'over-the-moon';

export const PET_MOOD_LABEL: Record<PetMood, string> = {
  sad: 'Sad',
  lonely: 'Lonely',
  content: 'Content',
  happy: 'Happy',
  delighted: 'Delighted',
  'over-the-moon': 'Over the moon',
};

const clamp = (v: number) => Math.min(HAPPY_MAX, Math.max(0, v));

// The stored value, worn down by the time since it was last written. The
// repository runs the same formula in SQL so writes stay atomic.
export function happinessNow(stored: number, since: Date, now: Date): number {
  const hours = (now.getTime() - since.getTime()) / HOUR;
  return clamp(stored - Math.max(0, hours - GRACE_HOURS) * DECAY_PER_HOUR);
}

export function raiseHappiness(current: number, gain: number): number {
  return clamp(current + gain);
}

export function petMood(happiness: number): PetMood {
  if (happiness < 20) return 'sad';
  if (happiness < 40) return 'lonely';
  if (happiness < 65) return 'content';
  if (happiness < 80) return 'happy';
  if (happiness < 95) return 'delighted';
  return 'over-the-moon';
}

export function studyGain(creditedMs: number): number {
  return Math.floor(Math.max(0, creditedMs) / 60_000) * STUDY_GAIN_PER_MINUTE;
}

export function missesYou(lastTogether: Date, now: Date): boolean {
  return now.getTime() - lastTogether.getTime() >= MISSES_YOU_AFTER_MS;
}
