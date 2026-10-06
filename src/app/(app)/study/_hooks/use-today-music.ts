'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  playFocusMix,
  resumeFocusSound,
  stopFocusSound,
} from '@/game/systems/focus-sound/player';

// Soft piano under Today, from the same generated voice as the Focus tab's
// piano layer. Off until chosen, like every sound here, then remembered on
// this device. It plays only while Today is open and in front: leaving the
// page or the app fades it out, and the next tap brings it back, because
// browsers start audio only from a tap.
const KEY = 'aloft:today-music';
const VOLUME = 0.42;
const listeners = new Set<() => void>();

function readOn(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

const play = () => playFocusMix([{ id: 'piano', volume: VOLUME }]);

export function useTodayMusic(): { on: boolean; toggle: () => void } {
  const on = useSyncExternalStore(subscribe, readOn, () => false);

  const toggle = useCallback(() => {
    const next = !readOn();
    // Inside the tap, so the browser lets the music start.
    if (next) resumeFocusSound();
    try {
      if (next) localStorage.setItem(KEY, 'on');
      else localStorage.removeItem(KEY);
    } catch {
      // Private mode: it still plays for this visit.
    }
    if (next) play();
    else stopFocusSound();
    for (const listener of listeners) listener();
  }, []);

  useEffect(() => {
    if (!on) return;
    play();
    const wake = () => {
      if (document.visibilityState === 'hidden') return stopFocusSound();
      resumeFocusSound();
      play();
    };
    document.addEventListener('pointerdown', wake);
    document.addEventListener('keydown', wake);
    document.addEventListener('visibilitychange', wake);
    return () => {
      document.removeEventListener('pointerdown', wake);
      document.removeEventListener('keydown', wake);
      document.removeEventListener('visibilitychange', wake);
      stopFocusSound();
    };
  }, [on]);

  return { on, toggle };
}
