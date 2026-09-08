import { assetAvailability, starterAssetIds, unlocksForLevel } from './unlocks';

describe('unlocks', () => {
  it('keeps rare and epic pieces out of the starter set', () => {
    const starters = starterAssetIds();
    expect(starters).toContain('lantern_brass');
    expect(starters).not.toContain('fountain_stone');
    expect(starters).not.toContain('orrery_brass');
  });

  it('gates starters by level and won pieces by ownership', () => {
    const owned = new Set<string>();
    expect(
      assetAvailability({
        assetId: 'tree_round',
        level: 1,
        ownedAssetIds: owned,
      }),
    ).toBe('locked-level');
    expect(
      assetAvailability({
        assetId: 'tree_round',
        level: 2,
        ownedAssetIds: owned,
      }),
    ).toBe('available');
    expect(
      assetAvailability({
        assetId: 'fountain_stone',
        level: 9,
        ownedAssetIds: owned,
      }),
    ).toBe('locked-won');
    expect(
      assetAvailability({
        assetId: 'fountain_stone',
        level: 1,
        ownedAssetIds: new Set(['fountain_stone']),
      }),
    ).toBe('available');
  });

  it('names what a level opens', () => {
    expect(unlocksForLevel(2)).toEqual(['Round tree']);
    expect(unlocksForLevel(3)).toEqual(["Scholar's cottage"]);
    expect(unlocksForLevel(4)).toEqual([]);
  });
});
