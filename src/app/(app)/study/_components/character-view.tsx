'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useSyncExternalStore } from 'react';
import type { StudySceneCanvasProps } from '@/game/character/study-scene-canvas';

const StudySceneCanvas = dynamic(
  () =>
    import('@/game/character/study-scene-canvas').then(
      (m) => m.StudySceneCanvas,
    ),
  { ssr: false, loading: () => null },
);
const IllustratedCat = dynamic(
  () =>
    import('@/game/character/illustrated-cat').then((m) => m.IllustratedCat),
  { ssr: false, loading: () => null },
);

const PREFERENCE_KEY = 'aloft-cat-view';
const PREFERENCE_EVENT = 'aloft-cat-view-change';
let inMemoryView = '3d';

function savedView() {
  try {
    return localStorage.getItem(PREFERENCE_KEY) ?? inMemoryView;
  } catch {
    return inMemoryView;
  }
}
function subscribeView(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(PREFERENCE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(PREFERENCE_EVENT, onChange);
  };
}
const serverView = () => '3d';

function CharacterVariant(props: StudySceneCanvasProps) {
  const query = useSearchParams();
  const requestedView = query.get('cat');
  const saved = useSyncExternalStore(subscribeView, savedView, serverView);
  const explicit =
    requestedView === 'illustrated'
      ? 'illustrated'
      : requestedView === '3d' || requestedView === 'toon'
        ? '3d'
        : null;
  useEffect(() => {
    if (!explicit) return;
    inMemoryView = explicit;
    try {
      localStorage.setItem(PREFERENCE_KEY, explicit);
    } catch {
      // Keep the selection through client navigation even when storage is blocked.
    }
    window.dispatchEvent(new Event(PREFERENCE_EVENT));
  }, [explicit]);
  return (explicit ?? saved) === 'illustrated' ? (
    <IllustratedCat {...props} />
  ) : (
    <StudySceneCanvas {...props} />
  );
}

export const CharacterView = (props: StudySceneCanvasProps) => (
  <Suspense fallback={null}>
    <CharacterVariant {...props} />
  </Suspense>
);
