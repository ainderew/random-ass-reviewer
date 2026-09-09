import type { Document } from '@gltf-transform/core';
import {
  dedup,
  meshopt,
  prune,
  simplify,
  textureCompress,
  weld,
} from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { countTriangles } from './gltf';

export interface OptimizeOptions {
  targetTriangles: number;
  // Props get 512, hero pieces 1024.
  textureSize: number;
  // Simplification error as a fraction of the mesh extent. Island props take
  // the default; a character seen up close wants a tighter budget.
  simplifyError?: number;
}

// dedup -> weld -> prune -> simplify -> textureCompress -> meshopt.
// Mutates and returns the document. Texture output is WebP via sharp; KTX2
// needs the external toktx binary, so it is a follow-up once real textured
// Tripo3D assets arrive.
export async function optimizeGlb(
  doc: Document,
  options: OptimizeOptions,
): Promise<{ doc: Document; triangles: number }> {
  await MeshoptSimplifier.ready;
  await MeshoptEncoder.ready;

  await doc.transform(dedup(), weld(), prune());

  const before = countTriangles(doc);
  if (before > options.targetTriangles) {
    const ratio = Math.max(0.05, Math.min(1, options.targetTriangles / before));
    await doc.transform(
      simplify({
        simplifier: MeshoptSimplifier,
        ratio,
        error: options.simplifyError ?? 0.01,
      }),
    );
  }

  await doc.transform(
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      resize: [options.textureSize, options.textureSize],
    }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );

  return { doc, triangles: countTriangles(doc) };
}
