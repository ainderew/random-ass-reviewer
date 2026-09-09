'use client';

import dynamic from 'next/dynamic';
import type { StudySceneCanvasProps } from '@/game/character/study-scene-canvas';

// three.js arrives only on the client and only once this mounts; the ring
// and the disc are already on screen by then, so nothing waits on it.
const StudySceneCanvas = dynamic(
  () =>
    import('@/game/character/study-scene-canvas').then(
      (m) => m.StudySceneCanvas,
    ),
  { ssr: false, loading: () => null },
);

export const CharacterView = (props: StudySceneCanvasProps) => (
  <StudySceneCanvas {...props} />
);
