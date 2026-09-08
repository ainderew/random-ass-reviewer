'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { worldState } from '@/game/systems/world-state';
import { SHAKE } from './constants';

// Directional shake with exponential decay. Linear decay reads as a wobble;
// exponential reads as an impact. No-op under reduced motion.
export function shakeOffset(amplitude: number, tSeconds: number): number {
  return (
    amplitude *
    Math.exp(-SHAKE.decay * tSeconds) *
    Math.sin(tSeconds * SHAKE.frequency)
  );
}

export function useScreenShake(): {
  ref: RefObject<HTMLDivElement | null>;
  shake: (amplitude: number) => void;
} {
  const ref = useRef<HTMLDivElement | null>(null);
  const frame = useRef<number | null>(null);

  const shake = useCallback((amplitude: number) => {
    const el = ref.current;
    if (!el || amplitude <= 0 || worldState.reducedMotion) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    const started = performance.now();
    const tick = (now: number) => {
      const t = (now - started) / 1000;
      if (t * 1000 >= SHAKE.durationMs) {
        el.style.transform = '';
        frame.current = null;
        return;
      }
      const x = shakeOffset(amplitude, t);
      const y = shakeOffset(amplitude * 0.6, t + 0.013);
      el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, []);

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  return { ref, shake };
}
