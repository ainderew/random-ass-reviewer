import type { GridCoord } from '@/domain/types';
import { TILE_SIZE } from './constants';

// Shared by the R3F build controller and the server validator. If these two
// ever disagree the client shows a valid ghost the server rejects, so there
// is exactly one implementation.

export type Footprint = readonly [number, number];

export function gridToWorld(coord: GridCoord): { x: number; z: number } {
  return { x: coord.x * TILE_SIZE, z: coord.z * TILE_SIZE };
}

export function worldToGrid(pos: { x: number; z: number }): GridCoord {
  return { x: Math.round(pos.x / TILE_SIZE), z: Math.round(pos.z / TILE_SIZE) };
}

// A tileCount of 9 is a 9x9 grid centred on the origin: -4..4 on both axes.
// Even counts lean negative: 10 gives -5..4.
export function gridRange(tileCount: number): { min: number; max: number } {
  const min = -Math.floor(tileCount / 2);
  return { min, max: min + tileCount - 1 };
}

export function isInBounds(coord: GridCoord, tileCount: number): boolean {
  if (!Number.isInteger(coord.x) || !Number.isInteger(coord.z)) return false;
  const { min, max } = gridRange(tileCount);
  return coord.x >= min && coord.x <= max && coord.z >= min && coord.z <= max;
}

export function normalizeRotation(rotY: number): number {
  return ((Math.round(rotY) % 4) + 4) % 4;
}

export function rotationToRadians(rotY: number): number {
  return normalizeRotation(rotY) * (Math.PI / 2);
}

// Width runs along x and depth along z at rotation 0. Odd quarter turns swap
// them. The origin is always the minimum corner of the footprint.
export function rotatedFootprint(
  footprint: Footprint,
  rotY: number,
): Footprint {
  const [w, d] = footprint;
  return normalizeRotation(rotY) % 2 === 0 ? [w, d] : [d, w];
}

export function tilesForFootprint(
  origin: GridCoord,
  footprint: Footprint,
  rotY: number,
): GridCoord[] {
  const [w, d] = rotatedFootprint(footprint, rotY);
  const tiles: GridCoord[] = [];
  for (let dz = 0; dz < d; dz += 1) {
    for (let dx = 0; dx < w; dx += 1) {
      tiles.push({ x: origin.x + dx, z: origin.z + dz });
    }
  }
  return tiles;
}

// World-space centre of a footprint, where the prop's mesh should sit.
export function footprintCenterWorld(
  origin: GridCoord,
  footprint: Footprint,
  rotY: number,
): { x: number; z: number } {
  const [w, d] = rotatedFootprint(footprint, rotY);
  return gridToWorld({ x: origin.x + (w - 1) / 2, z: origin.z + (d - 1) / 2 });
}

export function tileKey(coord: GridCoord): string {
  return `${coord.x},${coord.z}`;
}

export function occupiedTileKeys(
  placements: ReadonlyArray<{
    x: number;
    z: number;
    rotY: number;
    footprint: Footprint;
  }>,
): Set<string> {
  const keys = new Set<string>();
  for (const p of placements) {
    for (const tile of tilesForFootprint(
      { x: p.x, z: p.z },
      p.footprint,
      p.rotY,
    )) {
      keys.add(tileKey(tile));
    }
  }
  return keys;
}

export type PlacementVerdict =
  | { ok: true; tiles: GridCoord[] }
  | { ok: false; reason: 'OUT_OF_BOUNDS' | 'OCCUPIED'; tiles: GridCoord[] };

export function checkPlacement(input: {
  origin: GridCoord;
  footprint: Footprint;
  rotY: number;
  tileCount: number;
  occupied: ReadonlySet<string>;
}): PlacementVerdict {
  const tiles = tilesForFootprint(input.origin, input.footprint, input.rotY);
  if (tiles.some((t) => !isInBounds(t, input.tileCount))) {
    return { ok: false, reason: 'OUT_OF_BOUNDS', tiles };
  }
  if (tiles.some((t) => input.occupied.has(tileKey(t)))) {
    return { ok: false, reason: 'OCCUPIED', tiles };
  }
  return { ok: true, tiles };
}
