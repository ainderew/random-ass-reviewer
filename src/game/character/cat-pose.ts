import { SHAPE } from './look';
import { poseLimbs, type Swat } from './cat-limbs';
import type { CatRig } from './cat-model';
import { poseTail } from './cat-tail';

export type EyeMode = 'open' | 'happy' | 'squint' | 'closed';

// Every number the behaviour can ask of her body. Goals are written fresh
// each frame and the pose eases toward them.
export interface Channels {
  yaw: number;
  pitch: number;
  roll: number;
  drop: number;
  perk: number;
  back: number;
  open: number;
  mouth: number;
  tailLift: number;
  tailSway: number;
  tailSpeed: number;
  curl: number;
  paw: number;
  stretch: number;
  hop: number;
  lookX: number;
  lookY: number;
  wide: number;
}

export function restChannels(): Channels {
  return {
    yaw: 0,
    pitch: 0,
    roll: 0,
    drop: 0,
    perk: 0,
    back: 0,
    open: 1,
    mouth: 0,
    tailLift: 0,
    tailSway: 0.35,
    tailSpeed: 1.2,
    curl: 0,
    paw: 0,
    stretch: 0,
    hop: 0,
    lookX: 0,
    lookY: 0,
    wide: 0,
  };
}

// How fast each channel follows its goal, per second. Blinks and hops are
// quick; settling into a nap is slow.
export const RATES: Partial<Record<keyof Channels, number>> = {
  open: 30,
  hop: 30,
  mouth: 14,
  paw: 8,
  yaw: 7,
  pitch: 7,
  roll: 6,
  tailSpeed: 4,
  curl: 2.5,
  drop: 4,
};

export interface PoseFrame {
  t: number;
  eyes: EyeMode;
  squash: number;
  breathe: number;
  jitter: number;
  tailPhase: number;
  flick: readonly [number, number];
  pawTarget: 'wave' | 'groom';
  wave: number;
  // 0 slim to 1 roundest, from how much she has been fed.
  round: number;
  swats: readonly (Swat | null)[];
  reduced: boolean;
}

export function poseCat(rig: CatRig, c: Channels, f: PoseFrame): void {
  const st = c.stretch * 0.12;
  const squash = f.squash * SHAPE.squash;
  const sx = 1 - squash * 0.45 + f.breathe - st * 0.3;
  const sy = 1 + squash - f.breathe * 0.4 + st;
  const wide = 1 + 0.42 * f.round;
  const tall = 1 + 0.05 * f.round;
  rig.torso.scale.set(sx * wide, sy * tall, sx * wide);
  rig.torso.position.x = f.jitter;
  // A rounder cat's head sits lower in her fluff and her face is broader.
  rig.headPivot.position.set(
    f.jitter,
    0.56 * sy * tall - c.drop * 0.06 - 0.04 * f.round + SHAPE.headLift,
    0.03 + c.drop * 0.03 + 0.03 * f.round,
  );
  rig.headPivot.rotation.set(c.pitch, c.yaw, c.roll, 'YXZ');
  // The head follows the body's squash a little, so a bounce reads as one
  // soft creature rather than a body under a rigid ball.
  const follow = squash * SHAPE.headFollow;
  rig.head.scale.set(
    SHAPE.head * (1 + 0.1 * f.round) * (1 - follow * 0.45),
    SHAPE.head * (1 + 0.02 * f.round) * (1 + follow),
    SHAPE.head * (1 + 0.05 * f.round) * (1 - follow * 0.45),
  );
  rig.root.position.y = c.hop;

  // Ears flatten back when she is content or low, and tip forward when she
  // is curious.
  const out = 0.3 + 0.42 * c.back - 0.1 * c.perk;
  const tip = 0.16 * c.perk - 0.5 * c.back;
  const [left, right] = rig.ears;
  left.rotation.set(tip + f.flick[0] * 0.5, 0, out + f.flick[0]);
  right.rotation.set(tip + f.flick[1] * 0.5, 0, -out - f.flick[1]);

  for (const eye of rig.eyes) {
    eye.open.visible = f.eyes === 'open';
    eye.happy.visible = f.eyes === 'happy' || f.eyes === 'squint';
    eye.closed.visible = f.eyes === 'closed';
    const w = (1 + c.wide * 0.12) * SHAPE.eyes;
    eye.open.scale.set(w, Math.max(0.06, c.open) * w, 1);
    eye.open.position.set(c.lookX * 0.016, c.lookY * 0.012, 0);
    eye.happy.rotation.z = f.eyes === 'squint' ? eye.side * 1.15 : 0;
  }
  rig.mouth.visible = c.mouth > 0.03;
  rig.mouth.scale.set(0.028 + 0.018 * c.mouth, 0.006 + 0.05 * c.mouth, 0.02);

  poseLimbs(rig, {
    t: f.t,
    round: f.round,
    raise: c.paw,
    raiseTo: f.pawTarget,
    wave: f.wave,
    swats: f.swats,
    reduced: f.reduced,
  });
  poseTail(rig, {
    phase: f.tailPhase,
    sway: c.tailSway,
    lift: c.tailLift,
    curl: c.curl,
    round: f.round,
  });
}
