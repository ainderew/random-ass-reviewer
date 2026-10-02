'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  parseMix,
  setLayerVolume,
  silence,
  toggleLayer,
  type FocusLayerId,
  type FocusMix,
} from '@/domain/session/focus-sound';
import {
  playFocusMix,
  resumeFocusSound,
  stopFocusSound,
} from '@/game/systems/focus-sound/player';

// The mix is this device's, like the session length. "Auditioning" is the
// sound sheet being open on the idle screen: the mix plays so it can be
// heard and set, and stops when the sheet closes.
const KEY = 'aloft:focus-mix';
const listeners = new Set<() => void>();
let auditioning = false;

// The raw string is the snapshot: it compares by value, so the store does
// not hand React a new object on every read.
function readRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    // Private mode. Silence.
    return '';
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

function update(change: (mix: FocusMix) => FocusMix): void {
  const next = change(parseMix(readRaw() || null));
  // Called from a tap, so the browser lets a new layer start.
  if (next.on.length > 0) resumeFocusSound();
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode. Listeners still fire, but the mix is not kept.
  }
  for (const listener of listeners) listener();
}

export function useFocusSound(): {
  mix: FocusMix;
  toggle: (id: FocusLayerId) => void;
  silence: () => void;
  setVolume: (id: FocusLayerId, volume: number) => void;
  setAuditioning: (on: boolean) => void;
} {
  const raw = useSyncExternalStore(subscribe, readRaw, () => '');
  const mix = useMemo(() => parseMix(raw || null), [raw]);
  const toggle = useCallback(
    (id: FocusLayerId) => update((m) => toggleLayer(m, id)),
    [],
  );
  const quiet = useCallback(() => update(silence), []);
  const setVolume = useCallback(
    (id: FocusLayerId, volume: number) =>
      update((m) => setLayerVolume(m, id, volume)),
    [],
  );
  const setAuditioning = useCallback((on: boolean) => {
    auditioning = on;
    for (const listener of listeners) listener();
  }, []);
  return { mix, toggle, silence: quiet, setVolume, setAuditioning };
}

// Plays the mix while a session runs (or the sheet is open), and fades it
// out when either ends or the Focus tab is left.
export function useFocusSoundPlayback(session: boolean): void {
  const { mix } = useFocusSound();
  const audition = useSyncExternalStore(
    subscribe,
    () => auditioning,
    () => false,
  );
  const live = session || audition;
  // A string, so the effect runs only when what should play changes.
  const layers = JSON.stringify(
    live ? mix.on.map((id) => ({ id, volume: mix.volume[id] })) : [],
  );

  useEffect(() => {
    playFocusMix(JSON.parse(layers));
  }, [layers]);

  useEffect(() => () => stopFocusSound(), []);

  // After a reload, or when the phone suspended audio in the background,
  // the next tap or return to the tab brings it back.
  const on = layers !== '[]';
  useEffect(() => {
    if (!on) return;
    const wake = () => resumeFocusSound();
    document.addEventListener('pointerdown', wake);
    document.addEventListener('keydown', wake);
    document.addEventListener('visibilitychange', wake);
    return () => {
      document.removeEventListener('pointerdown', wake);
      document.removeEventListener('keydown', wake);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [on]);
}

// For the tap that starts a session: wake audio inside the gesture.
export function wakeFocusSound(mix: FocusMix): void {
  if (mix.on.length > 0) resumeFocusSound();
}
