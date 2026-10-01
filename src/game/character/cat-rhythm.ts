import { DURATION, HABITS, type Action, type ActionName } from './cat-actions';
import { isCare } from './cat-care-goal';
import type { CatMood, Feeling, Look } from './cat-goals';
import type { CatZone } from './cat-parts';

// Everything the brain remembers between frames, and the slow clock that
// moves it on: attention and naps, actions running out, habits coming due.

// A lot of attention (ten taps, or about half a minute of petting) and she
// yawns and naps for a minute. A nudge back to work, never a refusal: she
// still purrs in her sleep.
export const NAP_AT = 10;
export const NAP_SECONDS = 60;

export interface BrainState {
  mood: CatMood;
  feeling: Feeling;
  reduced: boolean;
  round: number;
  napping: boolean;
  napUntil: number;
  action: Action | null;
  now: number;
  attention: number;
  petting: boolean;
  zone: CatZone;
  lean: number;
  purr: number;
  lastStrokeAt: number;
  lastInteract: number;
  blinkAt: number;
  squash: number;
  squashV: number;
  tailPhase: number;
  side: number;
  next: { habit: number; blink: number; prr: number; heart: number; z: number };
  look: Look;
}

export function initialState(): BrainState {
  return {
    mood: 'studying',
    feeling: 'happy',
    reduced: false,
    round: 0,
    napping: false,
    napUntil: 0,
    action: null,
    now: 0,
    attention: 0,
    petting: false,
    zone: 'head',
    lean: 0,
    purr: 0,
    lastStrokeAt: -10,
    lastInteract: -10,
    blinkAt: -10,
    squash: 0,
    squashV: 0,
    tailPhase: 0,
    side: 1,
    next: { habit: 6, blink: 2, prr: 0, heart: 0, z: 0 },
    look: { active: false, x: 0, y: 0, watching: false, until: 0 },
  };
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function pickHabit(feeling: Feeling): ActionName {
  // A low cat does not look about or wash; she blinks and flicks an ear.
  const habits =
    feeling === 'sad' || feeling === 'lonely'
      ? HABITS.filter(([name]) => name !== 'lookAround' && name !== 'groom')
      : HABITS;
  let r = Math.random() * habits.reduce((sum, [, w]) => sum + w, 0);
  for (const [name, w] of habits) {
    r -= w;
    if (r <= 0) return name;
  }
  return 'slowBlink';
}

type Start = (name: ActionName, opts?: Partial<Action>) => void;

export function advance(
  s: BrainState,
  dt: number,
  t: number,
  stroking: boolean,
  start: Start,
  finished: (done: Action) => void,
): void {
  const care = isCare(s.action);
  s.purr =
    stroking || s.action?.name === 'brush'
      ? Math.min(s.napping ? 0.55 : 1, s.purr + dt * 0.9)
      : Math.max(0, s.purr - dt * 0.4);
  if (stroking) {
    s.attention += dt * 0.35;
    s.lastInteract = t;
  }
  s.attention = Math.max(0, s.attention - dt * 0.08);
  if (!stroking) s.lean *= Math.exp(-3 * dt);

  if (s.mood === 'resting') {
    s.napping = true;
    s.napUntil = Infinity;
  } else if (s.napping && t > s.napUntil && !s.action) {
    s.napping = false;
    start('yawn');
  }
  if (!s.napping && s.attention >= NAP_AT && !s.action) {
    s.attention = 0;
    start('yawn', { thenNap: true });
  }
  if (s.action) {
    s.action.t += dt;
    if (s.action.t >= DURATION[s.action.name]) {
      const done = s.action;
      s.action = null;
      if (done.thenNap) {
        s.napping = true;
        s.napUntil = t + NAP_SECONDS;
      }
      s.next.habit = Math.max(s.next.habit, t + 5);
      finished(done);
    }
  }

  const quiet =
    !s.action && !care && !s.petting && !s.look.active && t >= s.look.until;
  const due = t > s.next.habit && t - s.lastInteract > 4 && s.purr < 0.05;
  if (!s.reduced && !s.napping && s.mood !== 'away' && quiet && due) {
    start(pickHabit(s.feeling), { side: Math.random() < 0.5 ? -1 : 1 });
    const gap = s.mood === 'studying' ? rand(10, 18) : rand(6, 11);
    s.next.habit = t + (s.feeling === 'sad' ? gap * 1.6 : gap);
  }
}
