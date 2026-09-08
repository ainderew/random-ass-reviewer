import ReactThreeTestRenderer from '@react-three/test-renderer';
import { BoxGeometry, MeshStandardMaterial } from 'three';
import { initialIslandState, useIslandStore } from '@/game/store/island-store';
import { Scholars } from './scholars';

jest.mock('@/game/assets/use-asset', () => ({
  useAsset: () => [
    { geometry: new BoxGeometry(), material: new MeshStandardMaterial() },
  ],
  preloadAsset: () => {},
}));

const placements = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    islandId: 'i1',
    assetId: 'lantern_brass',
    x: i % 9,
    z: Math.floor(i / 9),
    rotY: 0,
    placedAt: new Date(),
  }));

const instanced = (
  renderer: Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>,
) =>
  renderer.scene.findAll(
    (node) =>
      (node.instance as { isInstancedMesh?: boolean }).isInstancedMesh === true,
  );

describe('Scholars', () => {
  beforeEach(() => {
    useIslandStore.setState({ ...initialIslandState });
  });

  it('renders no scholars on a sparse island', async () => {
    useIslandStore.getState().setPlacements(placements(2));
    const renderer = await ReactThreeTestRenderer.create(<Scholars />);
    expect(instanced(renderer)).toHaveLength(0);
    await renderer.unmount();
  });

  it('renders exactly one InstancedMesh whose count follows the island', async () => {
    useIslandStore.getState().setPlacements(placements(9));
    const renderer = await ReactThreeTestRenderer.create(<Scholars />);
    const meshes = instanced(renderer);
    expect(meshes).toHaveLength(1);
    expect((meshes[0]!.instance as { count: number }).count).toBe(3);
    await renderer.unmount();
  });

  it('caps the population at eight', async () => {
    useIslandStore.getState().setPlacements(placements(40));
    const renderer = await ReactThreeTestRenderer.create(<Scholars />);
    expect((instanced(renderer)[0]!.instance as { count: number }).count).toBe(
      8,
    );
    await renderer.unmount();
  });
});
