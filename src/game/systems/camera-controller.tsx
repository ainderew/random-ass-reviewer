import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { createRef, useEffect, useRef, type ComponentRef } from 'react';
import { cameraDriftEnabled } from './motion-policy';
import { worldState } from './world-state';

// Exposed so other systems can nudge the camera without fighting OrbitControls.
export const cameraControlsRef =
  createRef<ComponentRef<typeof OrbitControls>>();

const DRIFT_RAD_PER_S = 0.02;

export const CameraController = ({ radius }: { radius: number }) => {
  const lastInput = useRef(0);

  useEffect(() => {
    lastInput.current = performance.now();
    const touch = () => {
      lastInput.current = performance.now();
    };
    const events: (keyof WindowEventMap)[] = [
      'pointerdown',
      'pointermove',
      'wheel',
      'keydown',
      'touchstart',
    ];
    for (const name of events)
      window.addEventListener(name, touch, { passive: true });
    return () => {
      for (const name of events) window.removeEventListener(name, touch);
    };
  }, []);

  // Idle drift goes through the controls' own angle setter. Writing camera
  // position directly gets overwritten by OrbitControls and jitters.
  useFrame((_, delta) => {
    const controls = cameraControlsRef.current;
    if (!controls) return;
    const idleMs = performance.now() - lastInput.current;
    if (!cameraDriftEnabled(worldState.reducedMotion, idleMs)) return;
    controls.setAzimuthalAngle(
      controls.getAzimuthalAngle() + DRIFT_RAD_PER_S * delta,
    );
  });

  return (
    <OrbitControls
      ref={cameraControlsRef}
      makeDefault
      enablePan={false}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2.2}
      minDistance={radius * 0.6}
      maxDistance={radius * 5}
      enableDamping
      dampingFactor={0.08}
      target={[0, 0, 0]}
    />
  );
};
