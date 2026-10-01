import { Vector3, type Camera, type Ray } from 'three';
import { flickOf, type Action, type ActionName } from './cat-actions';
import {
  isCare,
  type CareKind,
  type CareStage,
  type ToyKind,
} from './cat-care';
import { composeGoal, type CatMood, type Feeling } from './cat-goals';
import type { CatRig, CatZone } from './cat-model';
import { RATES, poseCat, restChannels, type Channels } from './cat-pose';
import { advance, initialState } from './cat-rhythm';

export type { CatMood, Feeling } from './cat-goals';
export type FxKind = 'heart' | 'prr' | 'z' | 'boop' | 'nom' | 'spark' | 'gain';
export type Emit = (
  kind: FxKind,
  at: Vector3,
  drift: number,
  text?: string,
) => void;
export type CatBrain = ReturnType<typeof createCatBrain>;

const PETTABLE: ReadonlySet<CatZone> = new Set(['head', 'back', 'chin']);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const damp = (c: number, g: number, rate: number, dt: number) =>
  c + (g - c) * (1 - Math.exp(-rate * dt));

export function createCatBrain(
  rig: CatRig,
  camera: Camera,
  emit: Emit,
  stage: CareStage,
) {
  const s = initialState();
  const cur = restChannels();
  const v = new Vector3();

  // A reaction above her head, unless motion is reduced.
  const fx = (
    kind: FxKind,
    x: number,
    y: number,
    drift: number,
    text?: string,
  ) => {
    if (s.reduced) return;
    rig.head.getWorldPosition(v);
    emit(kind, v.clone().add(new Vector3(x, y, 0.1)), drift, text);
  };
  const kick = (amount: number) => {
    if (!s.reduced) s.squashV += amount;
  };

  function start(name: ActionName, opts: Partial<Action> = {}) {
    if (s.action?.thenNap) return;
    s.action = { name, t: 0, side: 1, ...opts };
    if (name === 'chirp') {
      kick(-2.2);
      fx('heart', rand(-0.15, 0.15), 0.45, rand(-12, 12));
    } else if (name === 'boop') {
      kick(-1.4);
      fx('boop', 0.34, 0.12, 10);
    } else if (name === 'welcome') {
      fx('heart', 0.05, 0.45, 0);
    }
  }

  function finished(done: Action) {
    if (done.name === 'eat' && done.note) fx('gain', 0.36, 0.22, 12, done.note);
    if (done.name === 'play') stage.drag(null);
  }

  // One frame. Returns whether she is still doing something, so a canvas
  // that only draws on demand (reduced motion) knows to keep drawing.
  function tick(dt: number, t: number): boolean {
    s.now = t;
    const stroking = s.petting && t - s.lastStrokeAt < 0.3;
    advance(s, dt, t, stroking, start, finished);

    // While she plays, she watches the toy the way she watches a finger.
    const toy = stage.toyWorld(s.action);
    const look = toy
      ? (toy.project(camera),
        { active: true, x: toy.x, y: toy.y, watching: true, until: 0 })
      : s.look;
    rig.head.getWorldPosition(v).project(camera);
    const g = composeGoal({
      ...s,
      t,
      stroking: stroking && !isCare(s.action),
      look,
      head: { x: v.x, y: v.y },
    });
    if (!s.reduced && g.eyes === 'open' && !s.napping) {
      if (t > s.next.blink) {
        s.blinkAt = t;
        s.next.blink = t + rand(2.5, 6.5);
      }
      if (t - s.blinkAt < 0.15) g.open = Math.min(g.open, 0.06);
    }
    for (const key of Object.keys(cur) as (keyof Channels)[]) {
      cur[key] = s.reduced
        ? g[key]
        : damp(cur[key], g[key], RATES[key] ?? 9, dt);
    }
    if (s.reduced) {
      s.squash = 0;
      s.squashV = 0;
    } else {
      s.squashV += (-260 * s.squash - 15 * s.squashV) * dt;
      s.squash += s.squashV * dt;
      s.tailPhase += dt * cur.tailSpeed;
    }
    stage.update(s.action, t, dt, {
      rig,
      round: s.round,
      reduced: s.reduced,
      kick,
      fx: (kind, at, drift) => !s.reduced && emit(kind, at, drift),
    });
    const breath = s.napping
      ? Math.sin(t * 1.05) * 0.024
      : Math.sin(t * 1.7) * 0.012;
    poseCat(rig, cur, {
      t,
      eyes: g.eyes,
      squash: s.squash,
      tailPhase: s.tailPhase,
      breathe: s.reduced ? 0 : breath,
      jitter: s.reduced ? 0 : (Math.random() - 0.5) * s.purr * 0.003,
      flick: s.reduced ? [0, 0] : flickOf(s.action),
      pawTarget: g.pawTarget ?? 'wave',
      wave: s.action?.name === 'wave' ? 1 : 0,
      round: s.round,
      swats: stage.swats,
      reduced: s.reduced,
    });

    if (s.purr > 0.35 && t > s.next.prr) {
      s.side = -s.side;
      fx('prr', s.side * 0.46, 0.06, s.side * 14);
      s.next.prr = t + 1.15;
    }
    if (s.purr > 0.75 && !s.napping && t > s.next.heart) {
      fx('heart', rand(-0.18, 0.18), 0.46, rand(-14, 14));
      s.next.heart = t + 1.6;
    }
    if (s.napping && t > s.next.z) {
      fx('z', 0.3, 0.32, 18);
      s.next.z = t + 2.4;
    }
    return (
      s.action !== null ||
      s.petting ||
      s.purr > 0 ||
      s.look.active ||
      t < s.look.until
    );
  }

  return {
    tick,
    setReduced(value: boolean) {
      s.reduced = value;
    },
    setLook(look: { round: number; feeling: Feeling }) {
      s.round = Math.min(1, Math.max(0, look.round));
      s.feeling = look.feeling;
    },
    setMood(value: CatMood) {
      const was = s.mood;
      s.mood = value;
      // A break's nap ends with a yawn on the next frame.
      if (was === 'resting' && value !== 'resting') s.napUntil = 0;
      if (
        was === 'away' &&
        value !== 'away' &&
        !s.napping &&
        !isCare(s.action)
      ) {
        s.action = null;
        start('welcome');
      }
    },
    // Care wakes her and takes over until it is done.
    care(kind: CareKind, toy: ToyKind | null, note?: string) {
      s.napping = false;
      s.petting = false;
      s.action = null;
      start(kind, { toy, ...(note ? { note } : {}) });
      stage.begin(s.now);
    },
    caring: () => isCare(s.action),
    playing: () => s.action?.name === 'play',
    dragToy: (ray: Ray | null) => stage.drag(ray),
    tap(at: CatZone | null, which: -1 | 1) {
      if (isCare(s.action)) return;
      s.attention += 1;
      s.lastInteract = s.now;
      if (s.napping) start('stir', { side: which });
      else if (at === 'nose') start('boop');
      else if (at === 'paw') start('wave');
      else if (at === 'ear') start('earFlick', { side: which });
      else if (at === 'tail') start('tailFlick');
      else if (at) start('chirp');
    },
    stroke(at: CatZone, dx: number) {
      if (!PETTABLE.has(at) || isCare(s.action)) return;
      s.petting = true;
      s.zone = at;
      s.look.active = false;
      s.lastStrokeAt = s.now;
      s.lean = Math.min(0.24, Math.max(-0.24, s.lean * 0.85 - dx * 0.012));
    },
    endStroke() {
      s.petting = false;
    },
    watch(x: number, y: number, watching: boolean) {
      Object.assign(s.look, { active: true, x, y, watching });
    },
    stopWatching(linger: number) {
      s.look.active = false;
      s.look.until = s.now + linger;
    },
    isPettable: (at: CatZone) => PETTABLE.has(at),
  };
}
