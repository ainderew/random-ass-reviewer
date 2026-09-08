import ReactThreeTestRenderer from '@react-three/test-renderer';
import { BoxGeometry, MeshStandardMaterial } from 'three';
import { initialIslandState, useIslandStore } from '@/game/store/island-store';
import { PlacedProps } from './placed-props';

jest.mock('@/game/assets/use-asset', () => ({
  useAsset: () => [
    { geometry: new BoxGeometry(), material: new MeshStandardMaterial() },
  ],
  preloadAsset: () => {},
}));

const placement = (id: string, assetId: string, x: number, z: number) => ({
  id,
  islandId: 'i1',
  assetId,
  x,
  z,
  rotY: 0,
  placedAt: new Date(),
});

describe('PlacedProps', () => {
  beforeEach(() => {
    useIslandStore.setState({ ...initialIslandState });
  });

  it('renders one InstancedMesh per distinct asset with the right instance counts', async () => {
    useIslandStore
      .getState()
      .setPlacements([
        placement('a', 'lantern_brass', 0, 0),
        placement('b', 'lantern_brass', 1, 0),
        placement('c', 'lantern_brass', 2, 0),
        placement('d', 'bench_wood', 0, 1),
      ]);

    const renderer = await ReactThreeTestRenderer.create(<PlacedProps />);
    // three keeps type 'Mesh' on InstancedMesh, so match on the flag instead.
    const meshes = renderer.scene.findAll(
      (node) =>
        (node.instance as { isInstancedMesh?: boolean }).isInstancedMesh ===
        true,
    );

    expect(meshes).toHaveLength(2);
    const counts = meshes
      .map((m) => (m.instance as { count: number }).count)
      .sort();
    expect(counts).toEqual([1, 3]);
    await renderer.unmount();
  });

  it('skips placements whose asset is no longer in the manifest', async () => {
    useIslandStore
      .getState()
      .setPlacements([placement('x', 'retired_asset', 0, 0)]);

    const renderer = await ReactThreeTestRenderer.create(<PlacedProps />);

    expect(
      renderer.scene.findAll(
        (node) =>
          (node.instance as { isInstancedMesh?: boolean }).isInstancedMesh ===
          true,
      ),
    ).toHaveLength(0);
    await renderer.unmount();
  });
});
