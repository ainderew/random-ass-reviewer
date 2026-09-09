import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

// Runs after `next build`. Fails when the budget is broken:
//   - an optimised island GLB over 150 KB
//   - a development-only surface in the production output
// It also prints each route's first-load size so a regression is visible in
// the CI log. There is no JS budget any more: the study tab draws the
// character in three.js by decision 52, so every app route carries it.

const ROOT = process.cwd();
const NEXT = join(ROOT, '.next');
const GLB_BUDGET_BYTES = 150 * 1024;
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

function reportRoute(route: string) {
  const files = [...new Set([...rootMainFiles(), ...routeChunks(route)])];
  const total = files.reduce((sum, f) => sum + gzipBytes(f), 0);
  console.log(
    `${route}: ${(total / 1024).toFixed(1)} KB gzip across ${files.length} files`,
  );
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
reportRoute('/(app)/study');
reportRoute('/(app)/review');
reportRoute('/(app)/notes');
reportRoute('/(app)/island');
checkModels();
checkDevSurfaces();

if (failures.length > 0) {
  for (const failure of failures) console.error(`✗ ${failure.message}`);
  process.exit(1);
}
console.log('✓ bundle within budget');
