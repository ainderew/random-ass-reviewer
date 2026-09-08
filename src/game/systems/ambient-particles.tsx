import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  NormalBlending,
  ShaderMaterial,
  type WebGLRenderer,
} from 'three';
import { unitHash } from '@/domain/world/hash';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { particlesEnabled } from './motion-policy';
import { worldState } from './world-state';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uDayFactor;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vAlpha;
  varying float vNight;
  void main() {
    float night = 1.0 - smoothstep(0.15, 0.45, uDayFactor);
    vNight = night;
    vec3 p = position;
    float rise = fract(aSeed + uTime * mix(0.02, 0.045, night));
    p.y = mix(0.2, 3.6, rise);
    p.x += sin(uTime * 0.3 + aSeed * 40.0) * mix(0.3, 0.9, night);
    p.z += cos(uTime * 0.25 + aSeed * 30.0) * mix(0.3, 0.9, night);
    // Day shows every mote; night keeps roughly forty fireflies.
    float show = mix(1.0, step(0.8, aSeed), night);
    float pulse = mix(1.0, 0.5 + 0.5 * sin(uTime * 3.0 + aSeed * 60.0), night);
    float fade = sin(rise * 3.14159);
    vAlpha = show * fade * pulse * mix(0.35, 0.9, night);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = mix(3.0, 5.5, night) * uPixelRatio * (24.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uDayColor;
  uniform vec3 uNightColor;
  varying float vAlpha;
  varying float vNight;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.1, d) * vAlpha;
    gl_FragColor = vec4(mix(uDayColor, uNightColor, vNight), a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Deterministic scatter inside the island disc. Same island, same motes.
function buildGeometry(radius: number, count: number): BufferGeometry {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const r = Math.sqrt(unitHash(`mote-r-${i}`)) * radius * 0.85;
    const a = unitHash(`mote-a-${i}`) * Math.PI * 2;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = 1;
    positions[i * 3 + 2] = Math.sin(a) * r;
    seeds[i] = unitHash(`mote-seed-${i}`);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(positions, 3));
  g.setAttribute('aSeed', new Float32BufferAttribute(seeds, 1));
  return g;
}

function buildMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDayFactor: { value: 1 },
      uPixelRatio: { value: 1 },
      uDayColor: { value: new Color('#fff1d6') },
      uNightColor: { value: new Color('#e8b04b') },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  });
}

// Additive only at night: glowing fireflies, matte daytime dust.
function tick(material: ShaderMaterial, gl: WebGLRenderer): void {
  material.uniforms.uTime!.value = worldState.elapsed;
  material.uniforms.uDayFactor!.value = worldState.dayFactor;
  material.uniforms.uPixelRatio!.value = gl.getPixelRatio();
  const blending =
    worldState.dayFactor < 0.3 ? AdditiveBlending : NormalBlending;
  if (material.blending !== blending) {
    material.blending = blending;
    material.needsUpdate = true;
  }
}

// Positions live in a static buffer; all motion is in the vertex shader from
// uTime. The CPU never touches a particle after this. One draw call.
export const AmbientParticles = ({
  radius,
  count = 200,
}: {
  radius: number;
  count?: number;
}) => {
  const reducedMotion = useReducedMotion();
  const geometry = useMemo(() => buildGeometry(radius, count), [radius, count]);
  const material = useMemo(() => buildMaterial(), []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ gl }) => tick(material, gl));

  if (!particlesEnabled(reducedMotion) || count === 0) return null;
  return (
    <points geometry={geometry} material={material} frustumCulled={false} />
  );
};
