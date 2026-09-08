import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { perfStats } from '@/game/perf-store';

import type { WebGLRenderer } from 'three';

function setAutoReset(gl: WebGLRenderer, value: boolean): void {
  gl.info.autoReset = value;
}

function sample(gl: WebGLRenderer, delta: number): void {
  perfStats.calls = gl.info.render.calls;
  perfStats.triangles = gl.info.render.triangles;
  if (delta > 0) perfStats.fps = Math.round(1 / delta);
  gl.info.reset();
}

// Inside the canvas: samples renderer info once per frame into a plain object.
// The composer renders several passes per frame, so auto-reset would only
// ever show the last one; totals are reset here by hand instead.
export const DevStatsSampler = () => {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    setAutoReset(gl, false);
    return () => setAutoReset(gl, true);
  }, [gl]);

  useFrame((_, delta) => sample(gl, delta), -5);

  return null;
};

// Outside the canvas: reads that object twice a second. Never per frame.
export const DevStatsOverlay = () => {
  const [stats, setStats] = useState({ calls: 0, triangles: 0, fps: 0 });
  useEffect(() => {
    const id = setInterval(() => setStats({ ...perfStats }), 500);
    return () => clearInterval(id);
  }, []);
  const over = stats.calls >= 100;
  return (
    <p
      className={`pointer-events-none absolute bottom-2 left-2 rounded-md bg-ground/80 px-2 py-1 font-mono text-xs tabular-nums ${over ? 'text-warn' : 'text-muted'}`}
    >
      {stats.calls} calls · {stats.triangles.toLocaleString()} tris ·{' '}
      {stats.fps} fps
    </p>
  );
};
