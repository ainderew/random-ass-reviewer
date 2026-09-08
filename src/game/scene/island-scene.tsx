import { TILE_SIZE } from '@/domain/island/constants';
import type { Island, WorldSignals } from '@/domain/types';
import { PlacedProps } from '@/game/entities/placed-props';
import { GhostPreview, type Balances } from '@/game/entities/ghost-preview';
import { Scholars } from '@/game/entities/scholars';
import { StudyShelf } from '@/game/entities/study-shelf';
import { AmbientParticles } from '@/game/systems/ambient-particles';
import {
  BuildController,
  type PlaceHandler,
} from '@/game/systems/build-controller';
import { CameraController } from '@/game/systems/camera-controller';
import { CameraRig } from '@/game/systems/camera-rig';
import { EmissiveController } from '@/game/systems/emissive-controller';
import { QualityApplier, QualityProbe } from '@/game/systems/quality-probe';
import { useQuality } from '@/game/systems/quality-store';
import { WorldClock } from '@/game/systems/world-clock';
import { GridOverlay } from './grid-overlay';
import { IslandTerrain } from './island-terrain';
import { Lighting } from './lighting';
import { PostProcessing } from './post-processing';
import { Sky } from './sky';
import { DevSceneTools } from '@/game/dev/scene-tools';

// The disc must cover the grid's corners, so radius is the half-diagonal plus a rim.
export function islandRadius(tileCount: number): number {
  return ((tileCount * TILE_SIZE) / 2) * Math.SQRT2 * 1.04;
}

export const IslandScene = ({
  island,
  timeZone,
  signals,
  balances,
  onPlace,
  onSelectPlacement,
}: {
  island: Island;
  timeZone: string;
  signals: WorldSignals;
  balances: Balances;
  onPlace: PlaceHandler;
  onSelectPlacement: (id: string) => void;
}) => {
  const radius = islandRadius(island.tileCount);
  const quality = useQuality();
  return (
    <>
      {/* First, so every other system reads a finished frame state. */}
      <WorldClock timeZone={timeZone} wind={quality.wind} />
      <QualityProbe />
      <QualityApplier />
      <fog attach="fog" args={['#14161f', radius * 3.5, radius * 7]} />
      <Sky radius={radius} />
      <Lighting
        radius={radius}
        shadows={quality.shadows}
        shadowMapSize={quality.shadowMapSize}
      />
      <EmissiveController />
      <IslandTerrain island={island} />
      <GridOverlay tileCount={island.tileCount} />
      <PlacedProps onSelect={onSelectPlacement} />
      <Scholars max={quality.scholarsMax} />
      <StudyShelf signals={signals} radius={radius} />
      <AmbientParticles radius={radius} count={quality.particles} />
      <GhostPreview tileCount={island.tileCount} balances={balances} />
      <BuildController onPlace={onPlace} />
      <CameraRig radius={radius} />
      <CameraController radius={radius} />
      <PostProcessing mode={quality.postProcessing} />
      {process.env.NODE_ENV !== 'production' ? <DevSceneTools /> : null}
    </>
  );
};
