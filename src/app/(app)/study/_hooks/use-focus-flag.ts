'use client';

import { useSyncExternalStore } from 'react';

// Advisory only. The server applies caps regardless of what this says.
export function readFocus(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible' && document.hasFocus();
}

function subscribe(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  window.addEventListener('blur', onChange);
  window.addEventListener('focus', onChange);
  return () => {
    document.removeEventListener('visibilitychange', onChange);
    window.removeEventListener('blur', onChange);
    window.removeEventListener('focus', onChange);
  };
}

export function useFocusFlag(): boolean {
  return useSyncExternalStore(subscribe, readFocus, () => true);
}
