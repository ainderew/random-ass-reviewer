import { useThree } from '@react-three/fiber';
import { useLayoutEffect } from 'react';
import { PerspectiveCamera } from 'three';

// Frames the whole island once, for any island size and any viewport shape.
// Portrait phones need more distance than landscape desktops; OrbitControls
// takes over from wherever this leaves the camera.
export const CameraRig = ({ radius }: { radius: number }) => {
  const camera = useThree((s) => s.camera);
  const aspect = useThree((s) => s.size.width / s.size.height);

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const fov = (camera.fov * Math.PI) / 180;
    // The underside hangs below the origin, so frame a sphere a little larger
    // than the disc.
    const fit = (radius * 1.25) / Math.sin(fov / 2);
    const distance = fit * (aspect < 1 ? 1 / aspect : 1.02);
    // 35 degrees above the horizon, looking down at the origin.
    const elevation = (35 * Math.PI) / 180;
    const azimuth = Math.PI / 4;
    camera.position.set(
      Math.cos(elevation) * Math.sin(azimuth) * distance,
      Math.sin(elevation) * distance,
      Math.cos(elevation) * Math.cos(azimuth) * distance,
    );
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, aspect, radius]);

  return null;
};
