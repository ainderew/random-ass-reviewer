'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect } from 'react';
import type { Island, WorldSignals } from '@/domain/types';
import { preloadAsset } from './assets/use-asset';
import type { Balances } from './entities/ghost-preview';
import { LoadingOverlay } from './scene/loading-overlay';
import { IslandScene } from './scene/island-scene';
import type { PlaceHandler } from './systems/build-controller';

export interface IslandCanvasProps {
  island: Island;
  timeZone: string;
  signals: WorldSignals;
  balances: Balances;
  onPlace: PlaceHandler;
  onSelectPlacement: (id: string) => void;
}

// The dynamic-import target. Nothing outside src/game imports three.js, and
// nothing in here imports the server.
export const IslandCanvas = ({
  island,
  timeZone,
  signals,
  balances,
  onPlace,
  onSelectPlacement,
}: IslandCanvasProps) => {
  useEffect(() => {
    preloadAsset('island_base_meadow');
    if (process.env.NODE_ENV !== 'production') {
      void import('./dev/handle').then((m) => m.exposeDevHandle());
    }
  }, []);

  return (
    <div className="absolute inset-0">
      <Canvas
        shadows
        // Cap at 2x. A 3x phone would render nine times the pixels for nothing.
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [12, 10, 12], fov: 45 }}
      >
        <Suspense fallback={null}>
          <IslandScene
            island={island}
            timeZone={timeZone}
            signals={signals}
            balances={balances}
            onPlace={onPlace}
            onSelectPlacement={onSelectPlacement}
          />
        </Suspense>
      </Canvas>
      <LoadingOverlay />
    </div>
  );
};
