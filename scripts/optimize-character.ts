import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getIO } from './lib/gltf';
import { optimizeGlb } from './lib/optimize-glb';

// The study tab's character: a rigged Meshy export (one skinned mesh, one
// texture, a walking clip) cut down to something a phone draws every frame.
// 60k triangles with a tight error budget keeps her face and hair smooth at
// the size she is drawn; 24k looked blocky.
// Meshy ships the base colour as emissive too, with metallic 1, so the model
// only looks right unlit. We keep a third of that glow so the texture reads
// in a dark room and let the lamp do the rest.
const RAW = 'assets/characters/whisker-scholar.glb';
const OUT = 'public/characters/whisker-scholar.glb';
const TARGET_TRIANGLES = 60_000;
const SIMPLIFY_ERROR = 0.003;
const TEXTURE_SIZE = 1024;

async function main() {
  const io = await getIO();
  const doc = await io.read(RAW);
  for (const material of doc.getRoot().listMaterials()) {
    material
      .setMetallicFactor(0)
      .setRoughnessFactor(0.9)
      .setEmissiveFactor([0.35, 0.35, 0.35]);
  }
  const { triangles } = await optimizeGlb(doc, {
    targetTriangles: TARGET_TRIANGLES,
    textureSize: TEXTURE_SIZE,
    simplifyError: SIMPLIFY_ERROR,
  });
  await mkdir(path.dirname(OUT), { recursive: true });
  const glb = await io.writeBinary(doc);
  await writeFile(OUT, glb);
  console.log(
    `${OUT}: ${(glb.byteLength / 1024).toFixed(0)} KB, ${triangles} triangles`,
  );
}

void main();
