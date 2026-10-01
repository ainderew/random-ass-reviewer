import { Matrix4, Plane, Ray, Vector3 } from 'three';
import type { Action } from './cat-actions';
import type { CareProps, ToyKind } from './cat-care-props';
import { shoulderAt, type Swat } from './cat-limbs';

// Play: the toy runs along the front of her cushion on its own path, or
// wherever a finger drags it, and she swats at it when it is in reach.
const RIM = 0.54;
const FLOOR_Y: Record<ToyKind, number> = { wand: 0, mouse: 0.085, yarn: 0.115 };
const REACH = 0.66;
const ARM = 0.46;
// A plane just in front of her, in her own space, for a dragging finger.
const fingerPlane = new Plane(new Vector3(0, 0, 1), -0.5);
const UP = new Vector3(0, 1, 0);

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const damp = (c: number, g: number, r: number, dt: number) =>
  c + (g - c) * (1 - Math.exp(-r * dt));

export function createToyPlay(props: CareProps) {
  const toy = {
    a: 0,
    y: 0.6,
    prevA: 0,
    drag: null as null | { a: number; y: number },
  };
  const swats: [Swat | null, Swat | null] = [null, null];
  const from = new Vector3();
  const to = new Vector3();
  const inverse = new Matrix4();
  const local = new Ray();
  const hit = new Vector3();
  let nextSwat = 0;

  function begin(t: number) {
    toy.drag = null;
    toy.a = toy.prevA = (Math.random() - 0.5) * 1.2;
    toy.y = 0.62;
    swats[0] = swats[1] = null;
    nextSwat = t + 0.6;
  }

  function path(kind: ToyKind, t: number): { a: number; y: number } {
    if (toy.drag) return toy.drag;
    if (kind === 'wand')
      return { a: Math.sin(t * 1.1) * 0.8, y: 0.61 + 0.2 * Math.sin(t * 2.3) };
    if (kind === 'mouse')
      return {
        a: 0.85 * Math.sin(t * 0.9 + Math.sin(t * 2.2) * 0.7),
        y: toy.y,
      };
    return { a: 0.75 * Math.sin(t * 0.8), y: toy.y };
  }

  function move(kind: ToyKind, t: number, dt: number, reduced: boolean) {
    const want = path(kind, t);
    const rate = toy.drag ? 14 : 3.5;
    toy.a = reduced ? want.a : damp(toy.a, want.a, rate, dt);
    toy.y = reduced ? want.y : damp(toy.y, want.y, rate, dt);
    const piece = props.toys[kind];
    piece.position.set(
      RIM * Math.sin(toy.a),
      kind === 'wand' ? toy.y : FLOOR_Y[kind],
      RIM * Math.cos(toy.a),
    );
    const da = toy.a - toy.prevA;
    toy.prevA = toy.a;
    if (kind === 'yarn') props.yarnBall.rotation.z -= (da * RIM) / 0.09;
    if (kind === 'mouse' && Math.abs(da) > 0.0004) {
      piece.rotation.y = da > 0 ? toy.a : Math.PI + toy.a;
    }
    if (kind === 'wand') {
      piece.rotation.z = reduced ? 0 : Math.sin(t * 6) * 0.25;
      // The string runs up out of the circle, to a hand we never see.
      from.set(piece.position.x, piece.position.y + 0.025, piece.position.z);
      to.set(piece.position.x + 0.3, 2.2, piece.position.z + 0.1);
      const string = props.wandString;
      string.position.copy(from).lerp(to, 0.5);
      string.quaternion.setFromUnitVectors(
        UP,
        to.clone().sub(from).normalize(),
      );
      string.scale.set(1, from.distanceTo(to), 1);
    }
  }

  // The nearer paw swats when the toy is in reach; a mouse right in front of
  // her gets a pounce with both.
  function swat(
    a: Action,
    kind: ToyKind,
    t: number,
    round: number,
    kick: (v: number) => void,
  ) {
    if (t < nextSwat) return;
    const target = props.toys[kind].position;
    const side = target.x < 0 ? 0 : 1;
    if (target.distanceTo(shoulderAt(side, round, from)) > REACH) return;
    const reach = (s: 0 | 1): Swat => {
      const shoulder = shoulderAt(s, round, new Vector3());
      const span = target.clone().sub(shoulder);
      if (span.length() > ARM) span.setLength(ARM);
      return { at: t, target: shoulder.add(span) };
    };
    swats[side] = reach(side);
    if (kind === 'mouse' && Math.abs(target.x) < 0.16) {
      swats[side === 0 ? 1 : 0] = reach(side === 0 ? 1 : 0);
      a.pounceAt = t;
      kick(-1.4);
    } else {
      kick(-0.5);
    }
    nextSwat = t + 0.5 + Math.random() * 0.5;
  }

  return {
    swats,
    begin,
    move,
    swat,
    drag(ray: Ray | null) {
      if (!ray) {
        toy.drag = null;
        return;
      }
      inverse.copy(props.group.matrixWorld).invert();
      local.copy(ray).applyMatrix4(inverse);
      if (!local.intersectPlane(fingerPlane, hit)) return;
      toy.drag = {
        a: clamp(Math.asin(clamp(hit.x / RIM, -0.97, 0.97)), -1.05, 1.05),
        y: clamp(hit.y, 0.28, 1.03),
      };
    },
  };
}
