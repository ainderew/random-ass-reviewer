'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
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

function CharacterVariant(props: StudySceneCanvasProps) {
  const query = useSearchParams();
  return query.get('cat') === 'illustrated' ? (
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
