import type { Action, Goal } from './cat-actions';

// How she holds herself through each kind of care: head down into the bowl,
// chin up for a falling treat, leaning into the brush, eyes wide on a toy.
export type CareKind = 'eat' | 'treat' | 'brush' | 'play';

export const CARE_SECONDS: Record<CareKind, number> = {
  eat: 3.6,
  treat: 2.4,
  brush: 4.6,
  play: 9,
};

// The treat lands in her mouth this far through.
export const CATCH = 0.45;

export const smooth = (x: number) => x * x * (3 - 2 * x);
export const envelope = (p: number, a: number, b: number) =>
  p < a ? smooth(p / a) : p > b ? smooth(1 - (p - b) / (1 - b)) : 1;

export function isCare(a: Action | null): boolean {
  return (
    a !== null &&
    (a.name === 'eat' ||
      a.name === 'treat' ||
      a.name === 'brush' ||
      a.name === 'play')
  );
}

export function careProgress(a: Action): number {
  return isCare(a) ? Math.min(1, a.t / CARE_SECONDS[a.name as CareKind]) : 0;
}

export function careGoal(a: Action, g: Goal, t: number): void {
  const p = careProgress(a);
  if (a.name === 'eat') {
    const e = envelope(p, 0.12, 0.88);
    Object.assign(g, {
      pitch: 0.62 * e,
      drop: e,
      yaw: 0,
      roll: 0,
      back: 0.2 * e,
      lookX: 0,
      lookY: -e,
      tailLift: 0.4 * e,
    });
    if (e > 0.3) {
      g.eyes = 'happy';
      g.mouth = 0.25 + 0.25 * Math.sin(t * 13);
    }
  } else if (a.name === 'treat') {
    Object.assign(g, { yaw: 0, roll: 0, lookX: 0, perk: 1 });
    if (p < CATCH) {
      const q = smooth(p / CATCH);
      Object.assign(g, {
        pitch: -0.42 * q,
        mouth: 0.85 * q,
        wide: 1,
        lookY: q,
      });
    } else {
      const q = (p - CATCH) / (1 - CATCH);
      g.pitch = -0.42 * (1 - smooth(q));
      g.mouth = q < 0.6 ? 0.3 + 0.3 * Math.sin(t * 16) : 0;
      g.eyes = 'happy';
      g.tailLift = 0.8;
    }
  } else if (a.name === 'brush') {
    const side = Math.floor(p * 3) % 2 ? 1 : -1;
    Object.assign(g, {
      eyes: 'happy',
      back: 0.45,
      roll: 0.14 * side,
      yaw: 0.1 * side,
      pitch: -0.05,
      tailLift: 0.6,
    });
  } else if (a.name === 'play') {
    const q = (t - (a.pounceAt ?? -10)) / 0.45;
    Object.assign(g, {
      perk: 1,
      wide: 1,
      tailSway: 0.3,
      tailSpeed: 8,
      eyes: 'open',
      roll: 0,
    });
    g.hop = q >= 0 && q < 1 ? Math.sin(q * Math.PI) * 0.1 : 0;
  }
}
