import { useFrame } from '@react-three/fiber';
import { emissiveEntries } from './emissive-registry';
import { worldState } from './world-state';

const LIT = 1.3;

// Windows and lanterns come on through dusk, each group at its own moment.
// Simultaneous ignition reads as a switch; staggered reads as people home.
export const EmissiveController = () => {
  useFrame((_, delta) => {
    const night = Math.max(
      0,
      Math.min(1, (0.35 - worldState.dayFactor) / 0.35),
    );
    const k = Math.min(1, delta * 0.8);
    for (const entry of emissiveEntries.values()) {
      const target = night > entry.stagger ? LIT : 0;
      const current = entry.material.emissiveIntensity;
      entry.material.emissiveIntensity = current + (target - current) * k;
    }
  });
  return null;
};
