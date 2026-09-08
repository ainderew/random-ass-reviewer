import {
  type Material,
  MeshDepthMaterial,
  type MeshStandardMaterial,
  RGBADepthPacking,
  type WebGLProgramParametersWithUniforms,
} from 'three';
import type { WindSettings } from '@/domain/assets/types';

// Shared by every wind material. The world clock writes them once per frame.
export const windUniforms = {
  uTime: { value: 0 },
  uGlobalAmplitude: { value: 1 },
};

const applied = new WeakSet<Material>();

// Vertex-stage sway injected into three's own chunk pipeline, so lighting,
// shadows, fog, and tone mapping stay intact. Weight grows with height above
// the object origin: trunks stay planted, canopies move.
function makeInjector(settings: WindSettings, height: number) {
  return (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.uniforms.uGlobalAmplitude = windUniforms.uGlobalAmplitude;
    shader.uniforms.uAmplitude = { value: settings.amplitude };
    shader.uniforms.uSpeed = { value: settings.speed };
    shader.uniforms.uHeight = { value: Math.max(height, 0.001) };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        [
          '#include <common>',
          'uniform float uTime;',
          'uniform float uGlobalAmplitude;',
          'uniform float uAmplitude;',
          'uniform float uSpeed;',
          'uniform float uHeight;',
        ].join('\n'),
      )
      .replace(
        '#include <begin_vertex>',
        [
          '#include <begin_vertex>',
          '{',
          '  float weight = clamp(transformed.y / uHeight, 0.0, 1.0);',
          '  weight *= weight;',
          '  vec4 wp = modelMatrix * vec4(transformed, 1.0);',
          '  #ifdef USE_INSTANCING',
          '  wp = modelMatrix * instanceMatrix * vec4(transformed, 1.0);',
          '  #endif',
          '  float sway = sin(uTime * uSpeed + wp.x * 0.4 + wp.z * 0.4);',
          '  float amp = uAmplitude * uGlobalAmplitude * weight;',
          '  transformed.x += sway * amp;',
          '  transformed.z += sway * amp * 0.6;',
          '}',
        ].join('\n'),
      );
  };
}

const cacheKey = (settings: WindSettings, height: number) =>
  `wind-${settings.amplitude}-${settings.speed}-${height.toFixed(3)}`;

export function applyWind(
  material: MeshStandardMaterial,
  settings: WindSettings,
  height: number,
): void {
  if (applied.has(material)) return;
  applied.add(material);
  try {
    material.onBeforeCompile = makeInjector(settings, height);
    material.customProgramCacheKey = () => cacheKey(settings, height);
    material.needsUpdate = true;
  } catch (error) {
    console.error('[island] wind injection failed, rendering unswayed', error);
  }
}

// Shadows need the same displacement or they detach from the geometry.
export function windDepthMaterial(
  settings: WindSettings,
  height: number,
): MeshDepthMaterial {
  const material = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
  material.onBeforeCompile = makeInjector(settings, height);
  material.customProgramCacheKey = () => `depth-${cacheKey(settings, height)}`;
  return material;
}
