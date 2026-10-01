import { Raycaster, Vector2, Vector3, type Camera } from 'three';
import type { CatBrain } from './cat-brain';
import type { CatRig, CatZone } from './cat-model';

// Touch on the circle, read as a cat would feel it. A quick tap is a tap; a
// finger that keeps moving over her head, back or chin is petting; a finger
// on the floor is something to watch.
interface Hit {
  zone: CatZone;
  side: -1 | 1;
}
interface Press {
  id: number;
  x: number;
  y: number;
  start: number;
  travel: number;
  hit: Hit | null;
  toy?: boolean;
}

const TAP_MS = 380;
const TAP_TRAVEL = 12;
const STROKE_AFTER = 10;

export function attachCatTouch(
  canvas: HTMLElement,
  camera: Camera,
  rig: CatRig,
  brain: CatBrain,
  onInput: () => void,
): () => void {
  const ray = new Raycaster();
  const ndc = new Vector2();
  const local = new Vector3();
  let press: Press | null = null;

  const toNdc = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
    return ndc;
  };

  const pick = (e: PointerEvent): Hit | null => {
    ray.setFromCamera(toNdc(e), camera);
    const hit = ray.intersectObjects(rig.pickables, false)[0];
    if (!hit) return null;
    let zone = hit.object.userData.zone as CatZone;
    local.copy(hit.point);
    rig.root.worldToLocal(local);
    // Under the muzzle and down the chest is the chin.
    const underChin =
      local.y > 0.38 &&
      local.y < 0.64 &&
      Math.abs(local.x) < 0.26 &&
      local.z > 0.1;
    if ((zone === 'head' || zone === 'back') && underChin) zone = 'chin';
    return { zone, side: local.x < 0 ? -1 : 1 };
  };

  const watch = (e: PointerEvent, watching: boolean) => {
    toNdc(e);
    brain.watch(ndc.x, ndc.y, watching);
  };

  // While she plays, a finger moves the toy instead of touching her.
  const drag = (e: PointerEvent | null) => {
    if (!e) return brain.dragToy(null);
    ray.setFromCamera(toNdc(e), camera);
    brain.dragToy(ray.ray);
  };

  const down = (e: PointerEvent) => {
    if (e.button > 0) return;
    // Keep the stroke when the finger slides off the canvas. It throws for a
    // pointer the browser no longer tracks; the stroke still works without it.
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Nothing to capture.
    }
    if (brain.playing()) {
      press = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        start: 0,
        travel: 0,
        hit: null,
        toy: true,
      };
      drag(e);
      onInput();
      return;
    }
    const hit = pick(e);
    press = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      start: performance.now(),
      travel: 0,
      hit,
    };
    if (!hit) watch(e, true);
    onInput();
  };

  const move = (e: PointerEvent) => {
    if (!press || e.pointerId !== press.id) {
      if (!press && e.pointerType === 'mouse') {
        watch(e, false);
        onInput();
      }
      return;
    }
    if (press.toy) {
      drag(e);
      onInput();
      return;
    }
    const dx = e.clientX - press.x;
    const dy = e.clientY - press.y;
    press.x = e.clientX;
    press.y = e.clientY;
    press.travel += Math.hypot(dx, dy);
    if (press.travel < STROKE_AFTER) return;
    const hit = pick(e);
    if (hit && brain.isPettable(hit.zone)) {
      if (Math.hypot(dx, dy) > 0.5) brain.stroke(hit.zone, dx);
    } else {
      brain.endStroke();
      if (!hit) watch(e, true);
    }
    onInput();
  };

  const up = (e: PointerEvent) => {
    if (!press || e.pointerId !== press.id) return;
    if (press.toy) {
      drag(null);
      press = null;
      onInput();
      return;
    }
    const quick =
      performance.now() - press.start < TAP_MS && press.travel < TAP_TRAVEL;
    if (quick) brain.tap(press.hit?.zone ?? null, press.hit?.side ?? 1);
    brain.endStroke();
    // A tap on the floor, or a finger lifted off it, keeps her looking there
    // for a moment.
    brain.stopWatching(press.hit ? 0 : quick ? 1.6 : 1.4);
    press = null;
    onInput();
  };

  const leave = (e: PointerEvent) => {
    if (press || e.pointerType !== 'mouse') return;
    brain.stopWatching(0.6);
    onInput();
  };

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', leave);
  return () => {
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    canvas.removeEventListener('pointerleave', leave);
  };
}
