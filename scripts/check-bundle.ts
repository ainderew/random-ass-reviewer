import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

// Runs after `next build`. Fails when the budget is broken:
//   - /study first-load JS over 300 KB (gzip)
//   - three.js inside any route bundle other than /island
//   - an optimised GLB over 150 KB
//   - a development-only surface in the production output
// The three.js check is the important one: one static import from src/game
// into a study component silently adds ~600 KB to a page that never draws 3D.

const ROOT = process.cwd();
const NEXT = join(ROOT, '.next');
const STUDY_BUDGET_BYTES = 300 * 1024;
const GLB_BUDGET_BYTES = 150 * 1024;
const THREE_MARKER = /WebGLRenderer/;
const DEV_MARKERS = [
  /DevTimeScrubber/,
  /Time of day override/,
  /DevStatsOverlay/,
];

interface Failure {
  message: string;
}
const failures: Failure[] = [];

function routeChunks(route: string): string[] {
  const file = join(
    NEXT,
    'server',
    'app',
    ...route.split('/').filter(Boolean),
    'page_client-reference-manifest.js',
  );
  if (!existsSync(file)) {
    failures.push({ message: `No client manifest for ${route} at ${file}` });
    return [];
  }
  const source = readFileSync(file, 'utf8');
  const chunks = new Set<string>();
  for (const match of source.matchAll(/"chunks":\[([^\]]*)\]/g)) {
    for (const raw of match[1]!.split(',')) {
      const path = raw.trim().replace(/^"|"$/g, '');
      if (path.endsWith('.js')) chunks.add(path.replace(/^\/_next\//, ''));
    }
  }
  return [...chunks];
}

function rootMainFiles(): string[] {
  const manifest = JSON.parse(
    readFileSync(join(NEXT, 'build-manifest.json'), 'utf8'),
  ) as {
    rootMainFiles?: string[];
  };
  return manifest.rootMainFiles ?? [];
}

function gzipBytes(relative: string): number {
  const file = join(NEXT, relative);
  if (!existsSync(file)) return 0;
  return gzipSync(readFileSync(file)).length;
}

function containsThree(relative: string): boolean {
  const file = join(NEXT, relative);
  return existsSync(file) && THREE_MARKER.test(readFileSync(file, 'utf8'));
}

function checkRoute(
  route: string,
  { allowThree, budget }: { allowThree: boolean; budget?: number },
) {
  const files = [...new Set([...rootMainFiles(), ...routeChunks(route)])];
  const total = files.reduce((sum, f) => sum + gzipBytes(f), 0);
  const withThree = files.filter(containsThree);
  console.log(
    `${route}: ${(total / 1024).toFixed(1)} KB gzip across ${files.length} files`,
  );
  if (budget !== undefined && total > budget) {
    failures.push({
      message: `${route} first-load JS is ${(total / 1024).toFixed(1)} KB, over ${budget / 1024} KB`,
    });
  }
  if (!allowThree && withThree.length > 0) {
    failures.push({
      message: `${route} bundle contains three.js via ${withThree.join(', ')}`,
    });
  }
}

function checkModels() {
  const dir = join(ROOT, 'public', 'models');
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.glb'))) {
    const size = statSync(join(dir, name)).size;
    if (size > GLB_BUDGET_BYTES) {
      failures.push({
        message: `public/models/${name} is ${(size / 1024).toFixed(0)} KB, over 150 KB`,
      });
    }
  }
}

function checkDevSurfaces() {
  const dir = join(NEXT, 'static', 'chunks');
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const source = readFileSync(join(dir, name), 'utf8');
    for (const marker of DEV_MARKERS) {
      if (marker.test(source))
        failures.push({
          message: `Dev-only surface ${marker} shipped in ${name}`,
        });
    }
  }
}

if (!existsSync(NEXT)) {
  console.error('No .next directory. Run `pnpm build` first.');
  process.exit(1);
}
checkRoute('/(app)/study', { allowThree: false, budget: STUDY_BUDGET_BYTES });
checkRoute('/(app)/review', { allowThree: false });
checkRoute('/(app)/notes', { allowThree: false });
checkRoute('/(app)/island', { allowThree: true });
checkModels();
checkDevSurfaces();

if (failures.length > 0) {
  for (const failure of failures) console.error(`✗ ${failure.message}`);
  process.exit(1);
}
console.log('✓ bundle within budget');
