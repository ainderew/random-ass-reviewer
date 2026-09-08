import { TILE_SIZE } from './constants';
import {
  checkPlacement,
  footprintCenterWorld,
  gridRange,
  gridToWorld,
  isInBounds,
  normalizeRotation,
  occupiedTileKeys,
  rotationToRadians,
  tileKey,
  tilesForFootprint,
  worldToGrid,
} from './grid';

describe('gridToWorld / worldToGrid', () => {
  it('round-trips exactly for every in-bounds coordinate of a 9x9 grid', () => {
    for (let x = -4; x <= 4; x += 1) {
      for (let z = -4; z <= 4; z += 1) {
        expect(worldToGrid(gridToWorld({ x, z }))).toEqual({ x, z });
      }
    }
  });

  it('snaps points near a tile edge to the correct tile', () => {
    const half = TILE_SIZE / 2;
    expect(worldToGrid({ x: half - 0.01, z: 0 })).toEqual({ x: 0, z: 0 });
    expect(worldToGrid({ x: half + 0.01, z: 0 })).toEqual({ x: 1, z: 0 });
    expect(worldToGrid({ x: -half - 0.01, z: -half - 0.01 })).toEqual({
      x: -1,
      z: -1,
    });
  });
});

describe('gridRange / isInBounds', () => {
  it('centres an odd grid on the origin', () => {
    expect(gridRange(9)).toEqual({ min: -4, max: 4 });
  });

  it('leans an even grid negative', () => {
    expect(gridRange(10)).toEqual({ min: -5, max: 4 });
  });

  it('rejects coordinates outside a 9x9 grid', () => {
    expect(isInBounds({ x: 4, z: -4 }, 9)).toBe(true);
    expect(isInBounds({ x: 5, z: 0 }, 9)).toBe(false);
    expect(isInBounds({ x: 0, z: -5 }, 9)).toBe(false);
    expect(isInBounds({ x: 1.5, z: 0 }, 9)).toBe(false);
  });
});

describe('rotation', () => {
  it('normalises any integer to 0-3', () => {
    expect(normalizeRotation(5)).toBe(1);
    expect(normalizeRotation(-1)).toBe(3);
    expect(rotationToRadians(2)).toBeCloseTo(Math.PI);
  });
});

describe('tilesForFootprint', () => {
  it('returns one tile for a 1x1 asset', () => {
    expect(tilesForFootprint({ x: 2, z: -3 }, [1, 1], 0)).toEqual([
      { x: 2, z: -3 },
    ]);
  });

  it('returns different tiles for a 2x1 asset at rotation 0 and rotation 1', () => {
    const flat = tilesForFootprint({ x: 0, z: 0 }, [2, 1], 0);
    const turned = tilesForFootprint({ x: 0, z: 0 }, [2, 1], 1);
    expect(flat).toEqual([
      { x: 0, z: 0 },
      { x: 1, z: 0 },
    ]);
    expect(turned).toEqual([
      { x: 0, z: 0 },
      { x: 0, z: 1 },
    ]);
  });

  it('centres a 2x2 footprint between its tiles', () => {
    expect(footprintCenterWorld({ x: 0, z: 0 }, [2, 2], 0)).toEqual({
      x: TILE_SIZE / 2,
      z: TILE_SIZE / 2,
    });
  });
});

describe('checkPlacement', () => {
  const occupied = occupiedTileKeys([
    { x: 1, z: 1, rotY: 0, footprint: [1, 1] },
  ]);

  it('accepts a free, in-bounds tile', () => {
    const verdict = checkPlacement({
      origin: { x: 0, z: 0 },
      footprint: [1, 1],
      rotY: 0,
      tileCount: 9,
      occupied,
    });
    expect(verdict.ok).toBe(true);
  });

  it('rejects an occupied tile, including one covered by a wide footprint', () => {
    const verdict = checkPlacement({
      origin: { x: 0, z: 1 },
      footprint: [2, 1],
      rotY: 0,
      tileCount: 9,
      occupied,
    });
    expect(verdict).toMatchObject({ ok: false, reason: 'OCCUPIED' });
  });

  it('rejects a footprint that hangs off the edge', () => {
    const verdict = checkPlacement({
      origin: { x: 4, z: 0 },
      footprint: [2, 1],
      rotY: 0,
      tileCount: 9,
      occupied,
    });
    expect(verdict).toMatchObject({ ok: false, reason: 'OUT_OF_BOUNDS' });
    expect(tileKey({ x: 5, z: 0 })).toBe('5,0');
  });
});
