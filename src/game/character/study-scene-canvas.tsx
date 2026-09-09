'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect } from 'react';
import { StudyRoom, type SceneState } from './study-scene';
import { WhiskerScholar, type CharacterMood } from './whisker-scholar';

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
  mood: CharacterMood;
  reducedMotion: boolean;
}

// The diorama inside the focus circle: her room on a round platform, seen
// from the front and a little above. Transparent clear colour so the disc
// behind it shows through. Pixel ratio up to 2 so she is not upscaled on a
// phone; a low-power context, since this runs for a whole session.
export const StudySceneCanvas = ({
  scene,
  mood,
  reducedMotion,
}: StudySceneCanvasProps) => (
  <Canvas
    gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
    dpr={[1, 2]}
    frameloop={reducedMotion ? 'demand' : 'always'}
    camera={{ fov: 30, position: [0, 2.45, 3.95], near: 0.1, far: 30 }}
    onCreated={({ gl, camera }) => {
      gl.setClearColor(0x000000, 0);
      camera.lookAt(0, 0.52, 0);
    }}
    style={{ background: 'transparent' }}
  >
    <hemisphereLight args={['#c9d4ff', '#1b1f2c', 0.95]} />
    <directionalLight
      color="#ffd9a0"
      intensity={1.7}
      position={[2, 3.5, 2.5]}
    />
    <directionalLight
      color="#6fd6c4"
      intensity={0.3}
      position={[-2.5, 1.5, -2]}
    />
    {process.env.NODE_ENV !== 'production' ? <DevProbe /> : null}
    <StudyRoom scene={scene} />
    <Suspense fallback={null}>
      <WhiskerScholar mood={mood} reducedMotion={reducedMotion} />
    </Suspense>
  </Canvas>
);
