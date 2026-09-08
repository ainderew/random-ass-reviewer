import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import {
  type AmbientLight,
  Color,
  type DirectionalLight,
  type HemisphereLight,
} from 'three';
import { worldState } from '@/game/systems/world-state';

const tmp = new Color();
const ground = new Color();
const MOON_SKY = new Color('#7f93c8');
const MOON_AMBIENT = new Color('#8a93b8');

// Lights are refs mutated every frame from worldState. Never React state:
// re-rendering a light at 60fps reconciles the whole subtree for nothing.
// Night palette colours are too dark to use as light colours directly, so
// the lights lean toward a moonlit blue as the day factor falls.
export const Lighting = ({
  radius,
  shadows = true,
  shadowMapSize = 1024,
}: {
  radius: number;
  shadows?: boolean;
  shadowMapSize?: number;
}) => {
  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const ambient = useRef<AmbientLight>(null);

  useFrame(({ gl }, delta) => {
    const k = 1 - Math.exp(-delta * 2.5);
    const { palette, dayFactor, sunAltitude, sunAzimuth } = worldState;
    const night = 1 - dayFactor;
    // Lift exposure at night so the island stays readable in the dark.
    gl.toneMappingExposure +=
      (1.4 - 0.4 * dayFactor - gl.toneMappingExposure) * k;

    const s = sun.current;
    if (s) {
      // Below the horizon the same light stands in for the moon, low and cool.
      const altitude = sunAltitude > 0.12 ? sunAltitude : 0.4;
      const azimuth = sunAltitude > 0.12 ? sunAzimuth : sunAzimuth + Math.PI;
      s.position.setFromSphericalCoords(
        radius * 4,
        Math.PI / 2 - altitude,
        azimuth,
      );
      s.intensity += (0.8 + 1.3 * dayFactor - s.intensity) * k;
      s.color.lerp(tmp.set(palette.sunColor), k);
    }
    const h = hemi.current;
    if (h) {
      h.color.lerp(tmp.set(palette.topColor).lerp(MOON_SKY, 0.7 * night), k);
      h.groundColor.lerp(
        ground.set('#3a4a3c').multiplyScalar(0.55 + 0.45 * dayFactor),
        k,
      );
      h.intensity += (0.8 + 0.15 * dayFactor - h.intensity) * k;
    }
    const a = ambient.current;
    if (a) {
      a.color.lerp(
        tmp.set(palette.ambientColor).lerp(MOON_AMBIENT, 0.65 * night),
        k,
      );
      a.intensity += (palette.ambientIntensity - a.intensity) * k;
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#6fa8dc', '#3a4a3c', 0.9]} />
      <ambientLight ref={ambient} intensity={0.6} />
      <directionalLight
        ref={sun}
        position={[radius * 2, radius * 3, radius * 1.5]}
        intensity={1.7}
        castShadow={shadows}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-left={-radius * 1.2}
        shadow-camera-right={radius * 1.2}
        shadow-camera-top={radius * 1.2}
        shadow-camera-bottom={-radius * 1.2}
        shadow-camera-near={1}
        shadow-camera-far={radius * 9}
        shadow-bias={-0.0004}
      />
    </>
  );
};
