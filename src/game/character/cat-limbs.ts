import { Vector3 } from 'three';
import type { CatRig } from './cat-model';

// Her front legs and feet. A leg is a capsule stretched from the shoulder to
// the paw; the paw rests on the cushion, rises to wave or wash her face, and
// swats at a toy. The rounder she is, the wider everything sits.

export interface Swat {
  // Seconds on the brain's clock when the swipe started.
  at: number;
  // Where the paw reaches, in her own space.
  target: Vector3;
}

export interface LimbFrame {
  t: number;
  round: number;
  // 0 at rest, 1 fully raised; only her left paw (on our left) raises.
  raise: number;
  raiseTo: 'wave' | 'groom';
  wave: number;
  swats: readonly (Swat | null)[];
  reduced: boolean;
}

export const SWAT_SECONDS = 0.4;
const UP = new Vector3(0, 1, 0);
const span = new Vector3();
const goal = new Vector3();
const rest = [new Vector3(), new Vector3()] as const;
const shoulders = [new Vector3(), new Vector3()] as const;

const smooth = (x: number) => x * x * (3 - 2 * x);

export function shoulderAt(side: 0 | 1, round: number, out: Vector3): Vector3 {
  return out.set(
    (side ? 1 : -1) * 0.2 * (1 + 0.35 * round),
    0.33,
    0.17 + 0.08 * round,
  );
}

function pawRestAt(side: 0 | 1, round: number, out: Vector3): Vector3 {
  return out.set(
    (side ? 1 : -1) * 0.13 * (1 + 0.45 * round),
    0.04,
    0.37 + 0.13 * round,
  );
}

function raisedAt(to: 'wave' | 'groom', round: number, out: Vector3): Vector3 {
  return to === 'wave'
    ? out.set(-0.28 * (1 + 0.3 * round), 0.57, 0.42 + 0.1 * round)
    : out.set(-0.06, 0.6, 0.47 + 0.1 * round);
}

function between(limb: CatRig['arms'][number], from: Vector3, to: Vector3) {
  span.subVectors(to, from);
  const length = span.length();
  limb.position.copy(from).addScaledVector(span, 0.5);
  limb.quaternion.setFromUnitVectors(UP, span.normalize());
  limb.scale.set(1, length / 0.25, 1);
}

export function poseLimbs(rig: CatRig, f: LimbFrame): void {
  for (const side of [0, 1] as const) {
    pawRestAt(side, f.round, rest[side]);
    shoulderAt(side, f.round, shoulders[side]);
    let k = side === 0 ? smooth(Math.min(1, Math.max(0, f.raise))) : 0;
    raisedAt(f.raiseTo, f.round, goal);
    const swat = f.swats[side];
    if (swat && !f.reduced) {
      const q = (f.t - swat.at) / SWAT_SECONDS;
      const s = q >= 0 && q < 1 ? Math.sin(q * Math.PI) : 0;
      if (s > k) {
        k = s;
        goal.copy(swat.target);
      }
    }
    const paw = rig.paws[side];
    paw.position.lerpVectors(rest[side], goal, k);
    if (side === 0 && !f.reduced)
      paw.position.x += Math.sin(f.t * 13) * 0.04 * k * f.wave;
    paw.rotation.x = -1.2 * k;
    between(rig.arms[side], shoulders[side], paw.position);
  }
  for (const [i, foot] of rig.hind.entries()) {
    foot.position.set(
      (i ? 1 : -1) * 0.33 * (1 + 0.42 * f.round),
      0.035,
      0.2 + 0.06 * f.round,
    );
  }
}
