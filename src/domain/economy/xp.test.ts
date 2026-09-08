import { MAX_LEVEL } from './constants';
import { levelForXp, totalXpForLevel, xpForLevel, xpProgress } from './xp';

describe('xpForLevel', () => {
  it('follows 100 * n^1.5, rounded down', () => {
    expect(xpForLevel(1)).toBe(100);
    expect(xpForLevel(2)).toBe(282);
    expect(xpForLevel(4)).toBe(800);
  });

  it('is monotonically increasing', () => {
    for (let level = 1; level < MAX_LEVEL; level += 1) {
      expect(xpForLevel(level + 1)).toBeGreaterThan(xpForLevel(level));
    }
  });
});

describe('levelForXp', () => {
  it('starts at level 1 with no XP', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
  });

  it('levels up exactly at the threshold', () => {
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(totalXpForLevel(5))).toBe(5);
    expect(levelForXp(totalXpForLevel(5) - 1)).toBe(4);
  });

  it('caps at MAX_LEVEL', () => {
    expect(levelForXp(Number.MAX_SAFE_INTEGER)).toBe(MAX_LEVEL);
  });

  it('treats negative XP as zero', () => {
    expect(levelForXp(-500)).toBe(1);
  });
});

describe('xpProgress', () => {
  it('reports progress inside the current level', () => {
    expect(xpProgress(150)).toEqual({ level: 2, current: 50, needed: 282 });
  });
});
