import ReactThreeTestRenderer from '@react-three/test-renderer';
import { AmbientParticles } from './ambient-particles';

const reduced = { value: false };
jest.mock('@/lib/use-reduced-motion', () => ({
  useReducedMotion: () => reduced.value,
}));

const pointsIn = (
  renderer: Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>,
) =>
  renderer.scene.findAll(
    (node) => (node.instance as { isPoints?: boolean }).isPoints === true,
  );

describe('AmbientParticles', () => {
  it('renders one points node normally', async () => {
    reduced.value = false;
    const renderer = await ReactThreeTestRenderer.create(
      <AmbientParticles radius={10} count={80} />,
    );
    expect(pointsIn(renderer)).toHaveLength(1);
  });

  it('renders nothing under reduced motion or at a zero particle budget', async () => {
    reduced.value = true;
    const still = await ReactThreeTestRenderer.create(
      <AmbientParticles radius={10} count={80} />,
    );
    expect(pointsIn(still)).toHaveLength(0);
    reduced.value = false;
    const low = await ReactThreeTestRenderer.create(
      <AmbientParticles radius={10} count={0} />,
    );
    expect(pointsIn(low)).toHaveLength(0);
  });
});
