import { hashString, unitHash } from './hash';

describe('hash', () => {
  it('is stable and unsigned', () => {
    expect(hashString('lantern')).toBe(hashString('lantern'));
    expect(hashString('lantern')).toBeGreaterThanOrEqual(0);
    expect(hashString('lantern')).not.toBe(hashString('lantern2'));
  });

  it('maps to [0, 1)', () => {
    for (const s of ['', 'a', 'mote-seed-17', 'scholar-phase-3']) {
      const u = unitHash(s);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });
});
