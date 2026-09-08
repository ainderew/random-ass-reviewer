import { MAX_LEVEL, XP_BASE, XP_EXPONENT } from './constants';

// XP needed to advance from `level` to `level + 1`. Shallow curve so early
// levels arrive fast.
export function xpForLevel(level: number): number {
  const clamped = Math.max(1, Math.floor(level));
  return Math.floor(XP_BASE * Math.pow(clamped, XP_EXPONENT));
}

// Cumulative XP a player holds the moment they reach `level`. Level 1 is 0.
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let current = 1; current < level; current += 1) {
    total += xpForLevel(current);
  }
  return total;
}

export function levelForXp(xp: number): number {
  const safeXp = Math.max(0, xp);
  let level = 1;
  let threshold = xpForLevel(level);
  while (level < MAX_LEVEL && safeXp >= threshold) {
    level += 1;
    threshold += xpForLevel(level);
  }
  return level;
}

export interface XpProgress {
  level: number;
  // XP earned since the current level started.
  current: number;
  // XP the current level needs in total.
  needed: number;
}

export function xpProgress(xp: number): XpProgress {
  const level = levelForXp(xp);
  const current = Math.max(0, xp) - totalXpForLevel(level);
  return { level, current, needed: xpForLevel(level) };
}
