'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { WhiskerScholar, type CharacterMood } from './whisker-scholar';

export interface WhiskerScholarCanvasProps {
  mood: CharacterMood;
  lampOn: boolean;
  reducedMotion: boolean;
}

// A transparent canvas the room's SVG sits behind and in front of. The
// character is the only thing drawn here; the desk, lamp, and walls stay
// cheap vectors. Low dpr and a low-power context: this runs for a whole
// study session on a phone.
export const WhiskerScholarCanvas = ({
  mood,
  lampOn,
  reducedMotion,
}: WhiskerScholarCanvasProps) => (
  <Canvas
    gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
    dpr={[1, 1.5]}
    frameloop={reducedMotion && mood !== 'away' ? 'demand' : 'always'}
    camera={{ fov: 26, position: [1.5, 1.05, 2.9], near: 0.1, far: 20 }}
    onCreated={({ gl, camera }) => {
      gl.setClearColor(0x000000, 0);
      camera.lookAt(0, 0.62, 0);
    }}
    style={{ background: 'transparent' }}
  >
    <hemisphereLight args={['#c9d4ff', '#2a2f45', 0.8]} />
    <directionalLight
      color={lampOn ? '#ffd37a' : '#8b91a8'}
      intensity={lampOn ? 2.6 : 0.9}
      position={[-1.4, 1.6, 1.2]}
    />
    <directionalLight color="#6fd6c4" intensity={0.35} position={[2, 1, -2]} />
    <Suspense fallback={null}>
      <WhiskerScholar mood={mood} reducedMotion={reducedMotion} />
    </Suspense>
  </Canvas>
);
