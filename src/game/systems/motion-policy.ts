// The reduced-motion contract in one place. Every animated system asks here.

export function windAmplitude(base: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : base;
}

export function particlesEnabled(reducedMotion: boolean): boolean {
  return !reducedMotion;
}

export const CAMERA_IDLE_MS = 4000;

export function cameraDriftEnabled(
  reducedMotion: boolean,
  idleMs: number,
): boolean {
  return !reducedMotion && idleMs >= CAMERA_IDLE_MS;
}

// Population grows with the island and caps so the draw-call budget holds.
export function scholarCountFor(placementCount: number, max = 8): number {
  return Math.min(max, Math.floor(placementCount / 3));
}
