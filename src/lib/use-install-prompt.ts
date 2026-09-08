'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallState =
  | { kind: 'installed' }
  | { kind: 'prompt'; install: () => Promise<void> }
  | { kind: 'ios' }
  | { kind: 'unavailable' };

const STANDALONE = '(display-mode: standalone)';

function readStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.(STANDALONE).matches === true ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function subscribeStandalone(onChange: () => void): () => void {
  const media = window.matchMedia?.(STANDALONE);
  media?.addEventListener('change', onChange);
  window.addEventListener('appinstalled', onChange);
  return () => {
    media?.removeEventListener('change', onChange);
    window.removeEventListener('appinstalled', onChange);
  };
}

const isIos = () =>
  typeof navigator !== 'undefined' &&
  /iphone|ipad|ipod/i.test(navigator.userAgent);

// Chrome and Edge hand us a deferred prompt; Safari on iOS needs the Share
// sheet, which cannot be triggered from a page. Say so instead of hiding it.
export function useInstallPrompt(): InstallState {
  const standalone = useSyncExternalStore(
    subscribeStandalone,
    readStandalone,
    () => false,
  );
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (standalone || accepted) return { kind: 'installed' };
  if (deferred) {
    return {
      kind: 'prompt',
      install: async () => {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === 'accepted') setAccepted(true);
        setDeferred(null);
      },
    };
  }
  if (isIos()) return { kind: 'ios' };
  return { kind: 'unavailable' };
}
