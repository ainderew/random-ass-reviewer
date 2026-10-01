'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { CatMood } from './cat-brain';
import { StudyCat, type CareCue, type CatLook } from './study-cat';
import { StudyRoom, type SceneState } from './study-scene';

// Dev only: the renderer state on window, so the scene can be inspected from
// the page while tuning.
const DevProbe = () => {
  const state = useThree();
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as { __studyScene: unknown }).__studyScene = state;
    }
  }, [state]);
  return null;
};

export interface StudySceneCanvasProps {
  scene: SceneState;
  mood: CatMood;
  reducedMotion: boolean;
  look?: CatLook;
  cue?: CareCue | null;
}

// The diorama inside the focus circle: the room on a round platform, seen
// from the front and a little above, with the cat on her cushion. Transparent
// clear colour so the disc behind it shows through. Pixel ratio up to 2 so
// she is not upscaled on a phone; a low-power context, since this runs for a
// whole session. Touch is hers: strokes pet her instead of scrolling the page.
export const StudySceneCanvas = ({
  scene,
  mood,
  reducedMotion,
  look,
  cue = null,
}: StudySceneCanvasProps) => {
  const fx = useRef<HTMLDivElement>(null);
  return (
    <div className="relative h-full w-full cursor-grab touch-none select-none active:cursor-grabbing">
      <Canvas
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        dpr={[1, 2]}
        frameloop={reducedMotion ? 'demand' : 'always'}
        camera={{ fov: 30, position: [0, 2.05, 4.3], near: 0.1, far: 30 }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor(0x000000, 0);
          camera.lookAt(0, 0.55, 0);
        }}
        style={{ background: 'transparent' }}
      >
        <hemisphereLight args={['#fff4ec', '#e6b8a6', 1.2]} />
        <directionalLight
          color="#fff0de"
          intensity={2}
          position={[2.2, 4, 3.2]}
        />
        <directionalLight
          color="#f0dcff"
          intensity={0.35}
          position={[-3, 1.5, 1]}
        />
        {process.env.NODE_ENV !== 'production' ? <DevProbe /> : null}
        <StudyRoom scene={scene} />
        <StudyCat
          mood={mood}
          reducedMotion={reducedMotion}
          fxLayer={fx}
          {...(look ? { look } : {})}
          cue={cue}
        />
      </Canvas>
      <div
        ref={fx}
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
    </div>
  );
};
