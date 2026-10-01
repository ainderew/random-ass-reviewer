import { Vector3, type Camera } from 'three';
import type { FxKind } from './cat-brain';

// Her small reactions as DOM over the canvas, so the words stay crisp: a
// heart, a purr, a sleepy z, a nom, a sparkle from the brush. Each floats up
// and removes itself. The styles live in globals.css under .cat-fx.
const HEART =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" stroke="#38273d" stroke-width="1.6" stroke-linejoin="round" d="M12 20.5s-7.6-4.6-9.4-9.4C1.4 7.8 3.6 4.8 6.7 4.8c2 0 3.6 1.1 5.3 3 1.7-1.9 3.3-3 5.3-3 3.1 0 5.3 3 4.1 6.3-1.8 4.8-9.4 9.4-9.4 9.4z"/></svg>';
const WORD: Record<Exclude<FxKind, 'heart'>, string> = {
  prr: 'prrr',
  z: 'z',
  boop: 'boop!',
  nom: 'nom',
  spark: '✦',
  gain: '',
};

const screen = new Vector3();

export function emitFx(
  layer: HTMLElement,
  camera: Camera,
  kind: FxKind,
  at: Vector3,
  drift: number,
  text?: string,
): void {
  screen.copy(at).project(camera);
  const el = document.createElement('span');
  el.className = `cat-fx cat-fx-${kind}`;
  el.style.left = `${(screen.x * 0.5 + 0.5) * layer.clientWidth}px`;
  el.style.top = `${(-screen.y * 0.5 + 0.5) * layer.clientHeight}px`;
  el.style.setProperty('--drift', `${drift}px`);
  if (kind === 'heart') el.innerHTML = HEART;
  else el.textContent = text ?? WORD[kind];
  layer.appendChild(el);
  const remove = () => el.remove();
  el.addEventListener('animationend', remove);
  window.setTimeout(remove, 4000);
}
