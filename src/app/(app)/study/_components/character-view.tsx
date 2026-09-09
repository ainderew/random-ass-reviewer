'use client';

import dynamic from 'next/dynamic';
import type { WhiskerScholarCanvasProps } from '@/game/character/whisker-scholar-canvas';

// three.js arrives only on the client and only once this mounts; the SVG room
// is already on screen by then, so nothing waits on it.
const WhiskerScholarCanvas = dynamic(
  () =>
    import('@/game/character/whisker-scholar-canvas').then(
      (m) => m.WhiskerScholarCanvas,
    ),
  { ssr: false, loading: () => null },
);

export const CharacterView = (props: WhiskerScholarCanvasProps) => (
  <WhiskerScholarCanvas {...props} />
);
