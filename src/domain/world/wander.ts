import type { GridCoord } from '@/domain/types';

// Waypoints come from what the user built. Scholars walking between real
// landmarks read as purposeful; random points read as bugs.
export function waypointsForIsland(
  placements: ReadonlyArray<{ x: number; z: number }>,
  count: number,
): GridCoord[] {
  if (placements.length < 2 || count < 2) return [];
  const sorted = [...placements].sort((a, b) => a.x - b.x || a.z - b.z);
  const take = Math.min(count, sorted.length);
  const picked: GridCoord[] = [];
  for (let i = 0; i < take; i += 1) {
    const index = Math.floor((i * sorted.length) / take);
    const p = sorted[index]!;
    picked.push({ x: p.x, z: p.z });
  }
  // Walk the loop by angle around the centroid so the path does not zigzag.
  const cx = picked.reduce((s, p) => s + p.x, 0) / picked.length;
  const cz = picked.reduce((s, p) => s + p.z, 0) / picked.length;
  return picked.sort(
    (a, b) => Math.atan2(a.z - cz, a.x - cx) - Math.atan2(b.z - cz, b.x - cx),
  );
}

export interface PathSample {
  x: number;
  z: number;
  // Y rotation that faces the direction of travel (object +z forward).
  heading: number;
  isDwelling: boolean;
}

// One loop over the closed path. Each leg spends `dwellFraction` of its time
// standing at the leg's end. t = 0 and t = 1 are the same place.
export function positionAlongPath(input: {
  path: ReadonlyArray<{ x: number; z: number }>;
  t: number;
  dwellFraction: number;
}): PathSample {
  const { path } = input;
  if (path.length === 0) return { x: 0, z: 0, heading: 0, isDwelling: true };
  const first = path[0]!;
  if (path.length === 1)
    return { x: first.x, z: first.z, heading: 0, isDwelling: true };

  const dwell = Math.max(0, Math.min(0.9, input.dwellFraction));
  const t = ((input.t % 1) + 1) % 1;
  const legs = path.length;
  const legIndex = Math.min(legs - 1, Math.floor(t * legs));
  const legT = t * legs - legIndex;
  const from = path[legIndex]!;
  const to = path[(legIndex + 1) % legs]!;
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const heading = Math.atan2(dx, dz);
  const travel = 1 - dwell;

  if (legT >= travel) return { x: to.x, z: to.z, heading, isDwelling: true };
  const k = travel === 0 ? 1 : legT / travel;
  const eased = k * k * (3 - 2 * k);
  return {
    x: from.x + dx * eased,
    z: from.z + dz * eased,
    heading,
    isDwelling: false,
  };
}
