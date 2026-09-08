import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { ASSET_CATEGORIES, type AssetRecord } from '@/domain/assets/types';
import { RARITIES } from '@/domain/types/cache';
import { assertWithinBudget } from './lib/budget';
import { getIO } from './lib/gltf';
import { renderManifest } from './lib/manifest';
import { optimizeGlb } from './lib/optimize-glb';

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'assets', 'raw');
const OUT_DIR = path.join(ROOT, 'public', 'models');
const META_PATH = path.join(ROOT, 'assets', 'asset-meta.json');
const MANIFEST_PATH = path.join(
  ROOT,
  'src',
  'domain',
  'assets',
  'manifest.generated.ts',
);

const metaSchema = z.record(
  z.string().regex(/^[a-z][a-z0-9_]*$/),
  z.object({
    category: z.enum(ASSET_CATEGORIES),
    footprint: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
    wind: z
      .object({
        amplitude: z.number().positive(),
        speed: z.number().positive(),
      })
      .optional(),
    priceFocus: z.number().int().nonnegative(),
    priceInsight: z.number().int().nonnegative(),
    rarity: z.enum(RARITIES),
    targetTriangles: z.number().int().positive(),
    label: z.string().min(1),
    minLevel: z.number().int().min(1).default(1),
  }),
);

async function main(): Promise<void> {
  const meta = metaSchema.parse(JSON.parse(await readFile(META_PATH, 'utf8')));
  const rawFiles = (await readdir(RAW_DIR)).filter((f) => f.endsWith('.glb'));
  const rawIds = new Set(rawFiles.map((f) => f.replace(/\.glb$/, '')));

  const missingRaw = Object.keys(meta).filter((id) => !rawIds.has(id));
  const missingMeta = [...rawIds].filter((id) => !(id in meta));
  if (missingRaw.length || missingMeta.length) {
    throw new Error(
      `asset-meta.json and assets/raw disagree.\n  no raw file: ${missingRaw.join(', ') || '-'}\n  no meta: ${missingMeta.join(', ') || '-'}`,
    );
  }

  await mkdir(OUT_DIR, { recursive: true });
  const io = await getIO();
  const records: AssetRecord[] = [];

  for (const id of Object.keys(meta).sort()) {
    const entry = meta[id]!;
    const doc = await io.read(path.join(RAW_DIR, `${id}.glb`));
    const textureSize = entry.category === 'building' ? 1024 : 512;
    const { triangles } = await optimizeGlb(doc, {
      targetTriangles: entry.targetTriangles,
      textureSize,
    });
    const glb = await io.writeBinary(doc);
    assertWithinBudget(id, { bytes: glb.byteLength, triangles });
    await writeFile(path.join(OUT_DIR, `${id}.glb`), glb);

    records.push({
      id,
      label: entry.label,
      url: `/models/${id}.glb`,
      bytes: glb.byteLength,
      triangles,
      category: entry.category,
      footprint: entry.footprint,
      priceFocus: entry.priceFocus,
      priceInsight: entry.priceInsight,
      rarity: entry.rarity,
      minLevel: entry.minLevel,
      ...(entry.wind ? { wind: entry.wind } : {}),
    });
    console.log(
      `${id.padEnd(22)} ${(glb.byteLength / 1024).toFixed(1).padStart(7)} KB ${String(triangles).padStart(6)} tris`,
    );
  }

  await writeFile(MANIFEST_PATH, renderManifest(records));
  console.log(
    `\nWrote ${records.length} assets and ${path.relative(ROOT, MANIFEST_PATH)}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
