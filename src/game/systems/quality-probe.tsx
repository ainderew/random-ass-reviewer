import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { WebGLRenderer } from 'three';
import {
  classifyDevice,
  readGpuString,
  readNavigatorSignals,
} from './device-tier';
import { qualityState, setDetectedTier, useQuality } from './quality-store';

const SAMPLE_SECONDS = 2;

// Inside the canvas. Measures the first two seconds of real frames, combines
// them with the GPU string and core count, and decides once.
export const QualityProbe = () => {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    if (qualityState.decided) return;
    frames.current += 1;
    elapsed.current += Math.min(delta, 0.25);
    if (elapsed.current < SAMPLE_SECONDS) return;
    const fps = frames.current / elapsed.current;
    setDetectedTier(
      classifyDevice({
        gpu: readGpuString(gl.getContext()),
        ...readNavigatorSignals(),
        fps,
      }),
    );
  });

  return null;
};

function applyShadows(gl: WebGLRenderer, enabled: boolean): void {
  gl.shadowMap.enabled = enabled;
  gl.shadowMap.needsUpdate = true;
}

// Applies the resolved settings to renderer state that R3F does not re-sync
// on its own. Everything else reads useQuality() at render time.
export const QualityApplier = () => {
  const gl = useThree((s) => s.gl);
  const setDpr = useThree((s) => s.setDpr);
  const quality = useQuality();

  useEffect(() => {
    applyShadows(gl, quality.shadows);
    setDpr([1, quality.dprMax]);
  }, [gl, setDpr, quality.shadows, quality.dprMax]);

  return null;
};
