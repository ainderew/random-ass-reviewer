import { createRng } from './rng';

describe('createRng', () => {
  it('gives identical sequences for identical seeds', () => {
    const a = createRng('seed-1');
    const b = createRng('seed-1');
    for (let i = 0; i < 50; i += 1) expect(a.next()).toBe(b.next());
  });

  it('gives different sequences for different seeds', () => {
    const a = createRng('seed-1');
    const b = createRng('seed-2');
    const same = Array.from({ length: 20 }, () => a.next() === b.next()).filter(
      Boolean,
    ).length;
    expect(same).toBeLessThan(3);
  });

  it('stays inside [0, 1)', () => {
    const rng = createRng('range');
    for (let i = 0; i < 10_000; i += 1) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('respects a weighted distribution within tolerance', () => {
    const rng = createRng('weights');
    const counts = { a: 0, b: 0, c: 0 };
    const entries = [
      { item: 'a' as const, weight: 70 },
      { item: 'b' as const, weight: 25 },
      { item: 'c' as const, weight: 5 },
    ];
    for (let i = 0; i < 10_000; i += 1) counts[rng.weighted(entries)] += 1;
    expect(counts.a / 10_000).toBeCloseTo(0.7, 1);
    expect(counts.b / 10_000).toBeCloseTo(0.25, 1);
    expect(counts.c / 10_000).toBeCloseTo(0.05, 1);
  });
});

describe('createRng edge cases', () => {
  it('refuses to pick from an empty list', () => {
    expect(() => createRng('x').pick([])).toThrow('pick from empty list');
  });

  it('refuses a weighted draw with no positive weight', () => {
    expect(() => createRng('x').weighted([{ item: 'a', weight: 0 }])).toThrow(
      'weighted with no positive weights',
    );
    expect(() => createRng('x').weighted([])).toThrow();
  });

  it('treats negative weights as zero and still returns an item', () => {
    const rng = createRng('neg');
    for (let i = 0; i < 50; i += 1) {
      expect(
        rng.weighted([
          { item: 'never', weight: -5 },
          { item: 'always', weight: 1 },
        ]),
      ).toBe('always');
    }
  });

  it('keeps int() inside the inclusive range', () => {
    const rng = createRng('ints');
    for (let i = 0; i < 1000; i += 1) {
      const n = rng.int(3, 5);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('seeds an empty string without getting stuck', () => {
    const rng = createRng('');
    expect(rng.next()).not.toBe(rng.next());
  });
});
