'use client';

import { useEffect, useRef } from 'react';
import { SESSION_RUNGS, type Rung } from '@/domain/session/rungs';
import { playPitched } from '@/game/systems/juice/play-pitched';

// One soft tone the first time each rung is passed, a step higher each time.
// The note itself is derived from focused time in render; this only sounds.
export function useRungTone(note: Rung | null, active: boolean): void {
  const played = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!active) {
      played.current.clear();
      return;
    }
    if (!note || played.current.has(note.atMs)) return;
    played.current.add(note.atMs);
    const index = SESSION_RUNGS.findIndex((r) => r.atMs === note.atMs);
    playPitched({
      frequency: 523.25,
      semitones: Math.max(0, index) * 2,
      durationMs: 180,
    });
  }, [note, active]);
}
