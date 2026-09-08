import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import { BackSide, Color, Fog, ShaderMaterial } from 'three';
import { worldState } from '@/game/systems/world-state';

const vertexShader = /* glsl */ `
  varying float vY;
  void main() {
    vY = normalize(position).y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Three bands: the void below the island, a horizon glow, and the sky above.
// The camera looks down, so the void is most of what it sees; it stays dark
// and close to the page ground so the island reads as floating, not pasted.
const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBelow;
  varying float vY;
  void main() {
    vec3 sky = mix(uHorizon, uTop, smoothstep(0.02, 0.55, vY));
    vec3 color = mix(uBelow, sky, smoothstep(-0.28, 0.02, vY));
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const tmp = new Color();
const ground = new Color('#14161f');

// The Lantern Post: a calm dark scene. The palette tints the backdrop; the
// island's own lighting carries the time of day.
function tick(material: ShaderMaterial, fog: Fog | null, delta: number): void {
  const k = 1 - Math.exp(-delta * 2.5);
  const { palette } = worldState;
  const top = material.uniforms.uTop!.value as Color;
  const horizon = material.uniforms.uHorizon!.value as Color;
  const below = material.uniforms.uBelow!.value as Color;
  top.lerp(tmp.set(palette.topColor).lerp(ground, 0.55), k);
  horizon.lerp(tmp.set(palette.horizonColor).lerp(ground, 0.6), k);
  below.lerp(tmp.set(palette.fogColor).lerp(ground, 0.8), k);
  if (fog) fog.color.lerp(tmp.set(palette.fogColor).lerp(ground, 0.7), k);
}

// A gradient dome plus the fog colour, both following the palette. One draw call.
export const Sky = ({ radius }: { radius: number }) => {
  const scene = useThree((s) => s.scene);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTop: { value: new Color('#2f4a68') },
          uHorizon: { value: new Color('#4f5f70') },
          uBelow: { value: new Color('#14161f') },
        },
        vertexShader,
        fragmentShader,
        side: BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );

  useFrame((_, delta) =>
    tick(material, scene.fog instanceof Fog ? scene.fog : null, delta),
  );

  return (
    <mesh
      material={material}
      scale={radius * 14}
      frustumCulled={false}
      renderOrder={-1}
    >
      <sphereGeometry args={[1, 24, 12]} />
    </mesh>
  );
};
