import { MAX_ASSET_TRIANGLES } from '@/domain/assets/types';
import { assertWithinBudget } from './budget';
import { countTriangles, documentFromBuilders, getIO } from './gltf';
import { MeshBuilder } from './mesh-builder';
import { optimizeGlb } from './optimize-glb';

// A dense lathe: 120 segments x 30 rings = 7200 triangles before caps.
function denseDoc() {
  const b = new MeshBuilder();
  const profile = Array.from(
    { length: 31 },
    (_, i) => [1, i / 30, [0.5, 0.5, 0.5]] as const,
  );
  b.lathe(profile, 120);
  return documentFromBuilders('dense', [{ builder: b }]);
}

describe('optimizeGlb', () => {
  it('simplifies down to the target and stays within budget', async () => {
    const { triangles } = await optimizeGlb(denseDoc(), {
      targetTriangles: 1500,
      textureSize: 512,
    });
    const glb = await (await getIO()).writeBinary(denseDoc());

    expect(triangles).toBeLessThanOrEqual(MAX_ASSET_TRIANGLES);
    expect(() =>
      assertWithinBudget('dense', { bytes: glb.byteLength, triangles }),
    ).not.toThrow();
  });

  it('is caught by the budget when the target is set too high', async () => {
    const doc = denseDoc();
    expect(countTriangles(doc)).toBeGreaterThan(MAX_ASSET_TRIANGLES);

    const { triangles } = await optimizeGlb(doc, {
      targetTriangles: 50_000,
      textureSize: 512,
    });

    expect(() => assertWithinBudget('dense', { bytes: 1, triangles })).toThrow(
      /triangles/,
    );
  });
});
