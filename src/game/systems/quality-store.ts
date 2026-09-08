'use client';

import { useSyncExternalStore } from 'react';
import type { DeviceTier } from './device-tier';
import {
  QUALITY,
  resolveTier,
  type QualityOverride,
  type QualitySettings,
} from './quality-settings';

const KEY = 'aloft:quality';
const listeners = new Set<() => void>();

// Plain module state, like worldState: the frame loop reads it directly.
export const qualityState = {
  detected: 'medium' as DeviceTier,
  decided: false,
};

function readOverride(): QualityOverride {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === 'low' || raw === 'medium' || raw === 'high' ? raw : 'auto';
  } catch {
    return 'auto';
  }
}

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function setQualityOverride(next: QualityOverride): void {
  try {
    if (next === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch {
    // Private mode. Listeners still fire for this session.
  }
  notify();
}

export function setDetectedTier(tier: DeviceTier): void {
  qualityState.detected = tier;
  qualityState.decided = true;
  notify();
}

export function currentTier(): DeviceTier {
  return resolveTier(qualityState.detected, readOverride());
}

export function currentQuality(): QualitySettings {
  return QUALITY[currentTier()];
}

export function useQualityOverride(): QualityOverride {
  return useSyncExternalStore(subscribe, readOverride, () => 'auto');
}

export function useQualityTier(): DeviceTier {
  return useSyncExternalStore(subscribe, currentTier, () => 'medium');
}

export function useQuality(): QualitySettings {
  const tier = useQualityTier();
  return QUALITY[tier];
}
