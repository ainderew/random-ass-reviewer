'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { worldState } from '@/game/systems/world-state';
import { HIT_STOP_MS } from './constants';

// Freeze everything for a beat before a reward resolves. The world clock
// honours `worldState.frozen`; 2D callers pause CSS animations with `frozen`.
export function useHitStop(): {
  frozen: boolean;
  freeze: (ms?: number) => void;
} {
  const [frozen, setFrozen] = useState(false);
  const timer = useRef<number | null>(null);

  const freeze = useCallback((ms: number = HIT_STOP_MS) => {
    if (worldState.reducedMotion) return;
    worldState.frozen = true;
    setFrozen(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      worldState.frozen = false;
      setFrozen(false);
    }, ms);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
      worldState.frozen = false;
    },
    [],
  );

  return { frozen, freeze };
}
