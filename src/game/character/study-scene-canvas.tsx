'use client';

import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { NeutralToneMapping } from 'three';
import type { CatMood } from './cat-brain';
import { CLAY } from './look';
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

// Clay light: a soft studio made once from light panels (no image file), a
// warm key, a rim from behind so her outline glows, and a contact shadow
// under the cushion, drawn once since the floor does not move.
const ClayLight = () => (
  <>
    <Environment resolution={64} frames={1} environmentIntensity={0.7}>
      <Lightformer
        form="rect"
        intensity={2.2}
        color="#fff3e8"
        position={[0, 4, 3]}
        scale={[6, 3, 1]}
      />
      <Lightformer
        form="circle"
        intensity={1.4}
        color="#ffd9c4"
        position={[-4, 2, -1]}
        scale={3}
      />
      <Lightformer
        form="circle"
        intensity={0.9}
        color="#e9dcff"
        position={[4, 1.5, 1]}
        scale={3}
      />
    </Environment>
    <hemisphereLight args={['#fff6ef', '#e9c3b4', 0.55]} />
    <directionalLight
      color="#fff4ea"
      intensity={1.35}
      position={[2.2, 4, 3.2]}
    />
    <directionalLight
      color="#ffdccb"
      intensity={1.1}
      position={[-1.5, 2.2, -3]}
    />
    <ContactShadows
      position={[0, 0.002, 0.25]}
      scale={2.6}
      far={1.1}
      blur={2.6}
      opacity={0.32}
      resolution={256}
      frames={1}
      color="#6d3c33"
    />
  </>
);

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
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'low-power',
          // Clay keeps its colours true; the default film curve pales them.
          ...(CLAY ? { toneMapping: NeutralToneMapping } : {}),
        }}
        dpr={[1, 2]}
        frameloop={reducedMotion ? 'demand' : 'always'}
        camera={{ fov: 30, position: [0, 2.05, 4.3], near: 0.1, far: 30 }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor(0x000000, 0);
          camera.lookAt(0, 0.55, 0);
        }}
        style={{ background: 'transparent' }}
      >
        {CLAY ? (
          <ClayLight />
        ) : (
          <>
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
          </>
        )}
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
