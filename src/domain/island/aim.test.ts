import { aimById, aimCandidates, defaultAim, minutesToAfford } from './aim';

describe('study aim', () => {
  it('counts whole minutes to afford, never negative', () => {
    expect(minutesToAfford(120, 0)).toBe(12);
    expect(minutesToAfford(120, 115)).toBe(1);
    expect(minutesToAfford(120, 500)).toBe(0);
  });

  it('offers starter pieces open at the level, cheapest first', () => {
    const level1 = aimCandidates(1);
    expect(level1.map((c) => c.assetId)).toEqual([
      'grass_tuft',
      'bench_wood',
      'lantern_brass',
    ]);
    expect(aimCandidates(3).map((c) => c.assetId)).toContain('cottage_scholar');
    expect(level1.every((c) => c.priceFocus > 0)).toBe(true);
  });

  it('aims a little ahead of the balance', () => {
    expect(defaultAim(1, 0)?.assetId).toBe('grass_tuft');
    expect(defaultAim(1, 50)?.assetId).toBe('bench_wood');
    expect(defaultAim(1, 5000)?.assetId).toBe('lantern_brass');
    expect(aimById('lantern_brass', 1)?.priceFocus).toBe(120);
    expect(aimById('orrery_brass', 9)).toBeNull();
  });
});
