'use client';

import { useEffect } from 'react';
import { createAmbientEngine } from './audio-engine';
import { worldState } from './world-state';

// Lives outside the canvas. Starts only after the unmute gesture and follows
// the world clock's day factor. Audio is strictly additive: any failure here
// leaves the visuals untouched.
export const AudioSystem = ({ enabled }: { enabled: boolean }) => {
  useEffect(() => {
    if (!enabled || typeof AudioContext === 'undefined') return;
    let engine: ReturnType<typeof createAmbientEngine> | null = null;
    try {
      engine = createAmbientEngine();
    } catch (error) {
      console.error('[island] audio unavailable', error);
      return;
    }
    const id = setInterval(
      () => engine?.setDayFactor(worldState.dayFactor),
      250,
    );
    return () => {
      clearInterval(id);
      engine?.stop();
    };
  }, [enabled]);
  return null;
};
