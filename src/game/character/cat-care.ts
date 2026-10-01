import { Vector3, type Ray } from 'three';
import type { Action } from './cat-actions';
import { CATCH, careProgress, envelope, isCare, smooth } from './cat-care-goal';
import { buildCareProps } from './cat-care-props';
import type { CatRig } from './cat-model';
import { createToyPlay } from './cat-toys';

export { CARE_SECONDS, careGoal, isCare, type CareKind } from './cat-care-goal';
export type { ToyKind } from './cat-care-props';

// Plays out each act of care with its props: the bowl empties, a treat falls
// into her mouth, the brush strokes down her sides, a toy runs and she swats.
const MUZZLE = new Vector3(0, -0.12, 0.37);

export interface CareFrame {
  rig: CatRig;
  round: number;
  reduced: boolean;
  fx: (kind: 'heart' | 'nom' | 'spark', at: Vector3, drift: number) => void;
  kick: (v: number) => void;
}

export type CareStage = ReturnType<typeof createCareStage>;

export function createCareStage() {
  const props = buildCareProps();
  const play = createToyPlay(props);
  const v = new Vector3();
  const w = new Vector3();
  let nextFx = 0;
  const world = (p: Vector3) => props.group.localToWorld(p.clone());

  function eat(p: number, t: number, f: CareFrame) {
    props.bowl.scale.setScalar(
      f.reduced ? 1 : Math.max(0.001, envelope(p, 0.07, 0.93)),
    );
    const left = 1 - smooth(Math.min(1, Math.max(0, (p - 0.2) / 0.65)));
    props.kibble.visible = left > 0.02;
    props.kibble.scale.setScalar(Math.max(0.001, left));
    if (p > 0.25 && p < 0.85 && t > nextFx) {
      nextFx = t + 0.6;
      f.fx('nom', world(v.set((Math.random() - 0.5) * 0.5, 0.75, 0.4)), 10);
    }
  }

  function treat(a: Action, p: number, t: number, f: CareFrame) {
    const mouth = props.group.worldToLocal(
      f.rig.head.localToWorld(MUZZLE.clone()),
    );
    if (p < CATCH) {
      const q = f.reduced ? 1 : (p / CATCH) ** 2;
      props.treat.position
        .copy(mouth)
        .add(w.set(0.05, 0.85, 0.05).multiplyScalar(1 - q));
      props.treat.rotation.set(t * 5, t * 3, 0);
      return;
    }
    if (a.caught) return;
    a.caught = true;
    f.kick(-1.6);
    f.fx('heart', world(v.copy(mouth).add(w.set(-0.14, 0.5, 0))), -12);
    f.fx('heart', world(v.copy(mouth).add(w.set(0.14, 0.55, 0))), 12);
  }

  // Three strokes, alternating sides, from the top of her head down.
  function brush(p: number, t: number, f: CareFrame) {
    const stroke = Math.min(2, Math.floor(p * 3));
    const q = smooth(p * 3 - stroke);
    const side = stroke % 2 ? 1 : -1;
    const wide = 1 + 0.35 * f.round;
    v.set(side * 0.28 * wide, 1.0, 0.2 + 0.05 * f.round).lerp(
      w.set(side * 0.53 * wide, 0.4, 0.18 + 0.1 * f.round),
      q,
    );
    props.brush.position.copy(v);
    props.brush.rotation.set(0.2, -side * 0.3, -side * Math.PI * 0.4);
    if (t > nextFx && q > 0.1 && q < 0.9) {
      nextFx = t + 0.22;
      f.fx('spark', world(v), side * 14);
    }
  }

  function update(a: Action | null, t: number, dt: number, f: CareFrame) {
    const p = a ? careProgress(a) : 0;
    const playing = a?.name === 'play' ? (a.toy ?? null) : null;
    props.bowl.visible = a?.name === 'eat';
    props.treat.visible = a?.name === 'treat' && p < CATCH;
    props.brush.visible = a?.name === 'brush';
    for (const kind of ['wand', 'mouse', 'yarn'] as const) {
      props.toys[kind].visible = playing === kind;
    }
    props.wandString.visible = playing === 'wand';
    if (!a || !isCare(a)) return;
    if (a.name === 'eat') eat(p, t, f);
    else if (a.name === 'treat') treat(a, p, t, f);
    else if (a.name === 'brush') brush(p, t, f);
    else if (playing) {
      play.move(playing, t, dt, f.reduced);
      if (!f.reduced) play.swat(a, playing, t, f.round, f.kick);
    }
  }

  return {
    props: props.group,
    swats: play.swats,
    update,
    begin(now: number) {
      nextFx = 0;
      play.begin(now);
    },
    // Where the toy is, so she can watch it.
    toyWorld(a: Action | null): Vector3 | null {
      if (a?.name !== 'play' || !a.toy) return null;
      return world(props.toys[a.toy].position);
    },
    // A finger on the circle while she plays moves the toy; null lets go.
    drag: (ray: Ray | null) => play.drag(ray),
  };
}
