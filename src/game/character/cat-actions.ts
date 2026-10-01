import { CARE_SECONDS, careGoal } from './cat-care-goal';
import type { ToyKind } from './cat-care-props';
import type { Channels, EyeMode } from './cat-pose';

// Short timed things she does: reactions to a touch and the small habits
// that keep a long session from feeling like a still picture.
export type ActionName =
  | 'eat'
  | 'treat'
  | 'brush'
  | 'play'
  | 'chirp'
  | 'boop'
  | 'wave'
  | 'earFlick'
  | 'stir'
  | 'tailFlick'
  | 'slowBlink'
  | 'lookAround'
  | 'yawn'
  | 'groom'
  | 'welcome';

export interface Action {
  name: ActionName;
  t: number;
  // Which ear flicks: -1 is the one on our left.
  side: -1 | 1;
  // The yawn that ends in a nap.
  thenNap?: boolean;
  // Care: which toy, the line to show after a meal, and moments inside it.
  toy?: ToyKind | null;
  note?: string;
  caught?: boolean;
  pounceAt?: number;
}

export interface Goal extends Channels {
  eyes: EyeMode;
  pawTarget: 'wave' | 'groom' | null;
}

export const DURATION: Record<ActionName, number> = {
  ...CARE_SECONDS,
  chirp: 0.9,
  boop: 0.9,
  wave: 1.7,
  earFlick: 0.45,
  stir: 0.6,
  tailFlick: 0.9,
  slowBlink: 1.6,
  lookAround: 2.8,
  yawn: 2.2,
  groom: 2.8,
  welcome: 1.9,
};

// The habits, weighted. Slow blinks and looking about are most of it.
export const HABITS: readonly (readonly [ActionName, number])[] = [
  ['slowBlink', 3],
  ['lookAround', 3],
  ['earFlick', 2],
  ['groom', 2],
  ['yawn', 1],
  ['tailFlick', 1],
];

const smooth = (x: number) => x * x * (3 - 2 * x);
// Up over [0, a], held, down over [b, 1].
const envelope = (p: number, a: number, b: number) =>
  p < a ? smooth(p / a) : p > b ? smooth(1 - (p - b) / (1 - b)) : 1;

export function progress(a: Action): number {
  return Math.min(1, a.t / DURATION[a.name]);
}

// An ear flick that dies away, for the ear on `side`.
export function flickOf(a: Action | null): [number, number] {
  if (!a || (a.name !== 'earFlick' && a.name !== 'stir')) return [0, 0];
  const p = progress(a);
  const f = Math.sin(p * Math.PI * 3) * (1 - p) * 0.6;
  return a.side < 0 ? [f, 0] : [0, f];
}

export function applyAction(a: Action, g: Goal, t: number): void {
  const p = progress(a);
  const bell = Math.sin(p * Math.PI);
  switch (a.name) {
    case 'eat':
    case 'treat':
    case 'brush':
    case 'play':
      careGoal(a, g, t);
      return;
    case 'chirp':
      g.eyes = 'happy';
      g.perk = 1;
      g.yaw *= 0.4;
      g.mouth = p < 0.45 ? Math.sin((p / 0.45) * Math.PI) * 0.55 : 0;
      g.tailLift = Math.max(g.tailLift, bell * 0.5);
      return;
    case 'boop':
      g.eyes = 'squint';
      g.pitch = -0.14 * bell;
      g.back = 0.7 * bell;
      g.yaw *= 0.2;
      return;
    case 'wave': {
      const e = envelope(p, 0.2, 0.75);
      g.paw = e;
      g.pawTarget = 'wave';
      g.eyes = 'happy';
      g.perk = 1;
      g.roll = 0.1 * e;
      g.yaw *= 0.3;
      return;
    }
    case 'tailFlick':
      g.tailSway = 1.1;
      g.tailSpeed = 10;
      g.yaw = -0.5 * bell;
      g.back = 0.45 * bell;
      g.lookX = -0.9 * bell;
      return;
    case 'slowBlink':
      g.open = 1 - 0.94 * bell;
      g.back = 0.1;
      g.yaw *= 0.2;
      g.pitch *= 0.2;
      g.lookX = 0;
      g.lookY = 0;
      return;
    case 'lookAround':
      g.yaw = Math.sin(p * Math.PI * 2) * 0.55;
      g.lookX = Math.sin(p * Math.PI * 2);
      g.pitch = -0.06 * bell;
      g.perk = 0.6 * bell;
      return;
    case 'yawn': {
      const e = envelope(p, 0.2, 0.62);
      g.mouth = e;
      if (e > 0.25) g.eyes = 'squint';
      g.pitch = -0.22 * e;
      g.back = 0.55 * e;
      g.yaw *= 0.3;
      return;
    }
    case 'groom': {
      const e = envelope(p, 0.18, 0.82);
      g.paw = e;
      g.pawTarget = 'groom';
      g.pitch = 0.2 * e + Math.sin(t * 9) * 0.04 * e;
      g.yaw = -0.14 * e;
      g.mouth = e * (0.2 + 0.15 * Math.sin(t * 13));
      if (e > 0.4) g.eyes = 'happy';
      return;
    }
    case 'welcome': {
      const q = Math.min(1, Math.max(0, (p - 0.25) / 0.55));
      g.perk = 1;
      g.yaw *= 0.2;
      g.pitch *= 0.2;
      g.lookX = 0;
      g.lookY = 0;
      g.open = 1 - 0.94 * Math.sin(q * Math.PI);
      g.tailLift = 0.5 * bell;
      return;
    }
    case 'earFlick':
      return;
    case 'stir':
      g.back = Math.max(g.back, 0.3);
      return;
  }
}
