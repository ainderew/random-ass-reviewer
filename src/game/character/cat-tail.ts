import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import type { CatRig } from './cat-model';

// The tail is a tube through five points, rebuilt each frame. It lies round
// her side on the cushion, lifts when she is happy, curls in when she naps,
// and swings wider the rounder she gets.
export interface TailFrame {
  phase: number;
  sway: number;
  lift: number;
  curl: number;
  round: number;
}

const points = Array.from({ length: 5 }, () => new Vector3());
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function poseTail(rig: CatRig, f: TailFrame): void {
  const s = Math.sin(f.phase);
  const s2 = Math.cos(f.phase * 0.8);
  const wide = 1 + 0.4 * f.round;
  const [p0, p1, p2, p3, p4] = points as [
    Vector3,
    Vector3,
    Vector3,
    Vector3,
    Vector3,
  ];
  p0.set(-0.12 * wide, 0.12, -0.3);
  p1.set(-0.42 * wide, 0.07 + f.lift * 0.05, -0.25);
  p2.set(-0.57 * wide, 0.055 + f.lift * 0.12, 0);
  p3.set(
    (lerp(-0.47, -0.4, f.curl) - f.lift * 0.08) * wide + s * f.sway * 0.03,
    0.06 + f.lift * 0.25,
    lerp(0.27, 0.36, f.curl) - f.lift * 0.08 + 0.05 * f.round,
  );
  p4.set(
    (lerp(-0.24, -0.08, f.curl) - f.lift * 0.2) * (1 + 0.6 * f.round) +
      s * f.sway * 0.1,
    0.075 + f.lift * 0.42 + Math.max(0, s2) * f.sway * 0.05,
    lerp(0.43, 0.47, f.curl) -
      f.lift * 0.25 +
      s2 * f.sway * 0.03 +
      0.08 * f.round,
  );
  const geometry = new TubeGeometry(
    new CatmullRomCurve3(points),
    30,
    0.058,
    12,
    false,
  );
  rig.tail.geometry.dispose();
  rig.tail.geometry = geometry;
  const line = rig.tail.userData.outline as
    { geometry: TubeGeometry } | undefined;
  if (line) line.geometry = geometry;
  rig.tailTip.position.copy(p4);
}
