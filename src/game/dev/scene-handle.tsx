import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { devHandle } from './handle';

// Development only: puts the three.js scene on the console handle.
export const DevSceneHandle = () => {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    devHandle.scene = scene;
  }, [scene]);
  return null;
};
