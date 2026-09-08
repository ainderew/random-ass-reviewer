import type { Island } from '@/domain/types';
import { useAsset } from '@/game/assets/use-asset';
import { islandRadius } from './island-scene';

// The base is authored as a unit disc. Scale carries the tile count, so an
// expansion grows the island without a new model.
export const IslandTerrain = ({ island }: { island: Island }) => {
  const parts = useAsset('island_base_meadow');
  const radius = islandRadius(island.tileCount);
  return (
    <group scale={[radius, radius * 0.9, radius]}>
      {parts.map((part, index) => (
        <mesh
          key={index}
          geometry={part.geometry}
          material={part.material}
          receiveShadow
        />
      ))}
    </group>
  );
};
