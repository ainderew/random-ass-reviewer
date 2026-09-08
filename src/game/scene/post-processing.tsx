import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
} from '@react-three/postprocessing';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { BloomEffect, ChromaticAberrationEffect } from 'postprocessing';
import { postFx } from '@/game/post-fx';
import { worldState } from '@/game/systems/world-state';

const BASELINE_BLOOM = 0.18;

// Bloom sits at a subtle baseline so a spike has headroom. Rare drops spike
// it and add a brief chromatic fringe, both decaying over about 600ms.
// `mode` comes from the device tier: low ends skip the composer entirely.
export const PostProcessing = ({
  mode = 'full',
}: {
  mode?: 'off' | 'bloom' | 'full';
}) => {
  const bloom = useRef<BloomEffect>(null);
  const aberration = useRef<ChromaticAberrationEffect>(null);

  useFrame((_, delta) => {
    const decay = Math.exp(-delta * 4.5);
    postFx.bloom *= decay;
    postFx.aberration *= decay;
    if (worldState.reducedMotion) {
      postFx.bloom = 0;
      postFx.aberration = 0;
    }
    if (bloom.current) bloom.current.intensity = BASELINE_BLOOM + postFx.bloom;
    if (aberration.current)
      aberration.current.offset.set(postFx.aberration, postFx.aberration * 0.6);
  });

  if (mode === 'off') return null;
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        ref={bloom}
        intensity={BASELINE_BLOOM}
        luminanceThreshold={0.75}
        luminanceSmoothing={0.2}
        mipmapBlur
      />
      {mode === 'full' ? (
        <ChromaticAberration ref={aberration} offset={[0, 0]} />
      ) : null}
    </EffectComposer>
  );
};
