import { applyAction, type Action, type Goal } from './cat-actions';
import type { CatZone } from './cat-parts';
import { restChannels } from './cat-pose';

// What the session is doing, which sets her baseline: up and about before a
// session, quiet company during one, looking away while you are away, and
// asleep on a break.
export type CatMood = 'wandering' | 'studying' | 'away' | 'resting';

// How she has been looked after lately, from the happiness meter. It sets how
// she carries herself when nothing else is going on.
export type Feeling = 'sad' | 'lonely' | 'content' | 'happy';

const CARRIAGE: Record<Feeling, Partial<Goal>> = {
  // Ears down, head low, eyes half closed, tail still.
  sad: { back: 0.6, pitch: 0.2, open: 0.55, tailSway: 0.05, tailSpeed: 0.8 },
  lonely: { back: 0.35, pitch: 0.1, open: 0.78, tailSway: 0.15 },
  content: {},
  happy: { tailLift: 0.25 },
};

export interface Look {
  active: boolean;
  x: number;
  y: number;
  watching: boolean;
  until: number;
}

export interface GoalState {
  t: number;
  mood: CatMood;
  feeling: Feeling;
  reduced: boolean;
  napping: boolean;
  stroking: boolean;
  purr: number;
  zone: CatZone;
  lean: number;
  action: Action | null;
  look: Look;
  // Where her head is on screen, to turn toward a finger.
  head: { x: number; y: number };
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// Layered, last word wins: the session, then how she feels, then a finger to
// watch, then petting, then whatever she is in the middle of.
export function composeGoal(s: GoalState): Goal {
  const g: Goal = { ...restChannels(), eyes: 'open', pawTarget: null };
  if (!s.reduced) {
    g.yaw = Math.sin(s.t * 0.29) * 0.07;
    g.pitch = Math.sin(s.t * 0.21) * 0.04;
  }
  if (s.napping) {
    Object.assign(g, {
      drop: 1,
      pitch: 0.36,
      yaw: 0.12,
      back: 0.45,
      eyes: 'closed',
      curl: 1,
      tailSway: 0.04,
      tailSpeed: 0.6,
    });
  } else if (s.mood !== 'away') {
    const carriage = CARRIAGE[s.feeling];
    Object.assign(g, carriage, {
      pitch: g.pitch + (carriage.pitch ?? 0),
    });
  } else {
    Object.assign(g, {
      yaw: -0.8,
      pitch: -0.12,
      perk: 1,
      tailSway: 0.1,
      lookX: -0.9,
      lookY: 0.4,
    });
  }

  if (!s.napping && (s.look.active || s.t < s.look.until)) {
    const dx = s.look.x - s.head.x;
    const dy = s.look.y - s.head.y;
    g.yaw = clamp(dx * 1.15, -0.7, 0.7);
    g.pitch = clamp(-dy * 0.95, -0.4, 0.35);
    g.lookX = clamp(dx * 2.2, -1, 1);
    g.lookY = clamp(dy * 2.2, -1, 1);
    if (s.look.watching) {
      Object.assign(g, { perk: 1, wide: 1, tailSway: 0.22, tailSpeed: 7 });
    }
  }

  if (s.stroking || s.purr > 0.2) {
    if (s.napping) {
      g.tailSway = 0.12;
      g.back = 0.55;
    } else {
      g.eyes = 'happy';
      g.lookX = 0;
      g.lookY = 0;
      g.yaw *= 0.3;
      g.roll = s.lean;
      // Chin up for a chin scratch, tail up for a back stroke, ears down
      // under a hand on her head.
      if (s.zone === 'chin') Object.assign(g, { pitch: -0.34, back: 0.2 });
      else if (s.zone === 'back')
        Object.assign(g, { tailLift: 1, back: 0.25, pitch: -0.06 });
      else Object.assign(g, { back: 0.5, pitch: 0.1 });
    }
  }

  if (s.action) applyAction(s.action, g, s.t);
  return g;
}
