'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type RevealStage =
  | 'closed'
  | 'wobble1'
  | 'wobble2'
  | 'wobble3'
  | 'hitstop'
  | 'burst'
  | 'glow'
  | 'item'
  | 'name'
  | 'done';

// The timing is the design. Accelerating wobbles are the whole anticipation
// mechanic; do not shorten them. Any click jumps straight to the end.
export const REVEAL_BEATS: ReadonlyArray<{ at: number; stage: RevealStage }> = [
  { at: 300, stage: 'wobble1' },
  { at: 700, stage: 'wobble2' },
  { at: 1000, stage: 'wobble3' },
  { at: 1250, stage: 'hitstop' },
  { at: 1350, stage: 'burst' },
  { at: 1500, stage: 'glow' },
  { at: 1750, stage: 'item' },
  { at: 2000, stage: 'name' },
  { at: 2200, stage: 'done' },
];

export function useRevealTimeline(input: {
  reducedMotion: boolean;
  onStage?: (stage: RevealStage) => void;
}): { stage: RevealStage; skip: () => void } {
  const [stage, setStage] = useState<RevealStage>(
    input.reducedMotion ? 'done' : 'closed',
  );
  const timers = useRef<number[]>([]);
  const onStage = useRef(input.onStage);
  useEffect(() => {
    onStage.current = input.onStage;
  });

  const clear = () => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  };

  useEffect(() => {
    if (input.reducedMotion) return;
    for (const beat of REVEAL_BEATS) {
      timers.current.push(
        window.setTimeout(() => {
          setStage(beat.stage);
          onStage.current?.(beat.stage);
        }, beat.at),
      );
    }
    return clear;
  }, [input.reducedMotion]);

  const skip = useCallback(() => {
    clear();
    setStage('done');
    onStage.current?.('done');
  }, []);

  return { stage, skip };
}
