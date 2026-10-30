import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

// The study cat, drawn as a circle on transparent corners. No single file suits
// every platform, so each size is cut from that art the way its platform needs.
// Run with `npx tsx scripts/generate-icons.ts`, and bump the service worker's
// VERSION afterwards: it serves /icons/ cache-first.
const SOURCE = join(process.cwd(), 'assets', 'app-icon.webp');
// The largest square inside the circle, which still holds the whole cat.
const INNER_SQUARE = { left: 196, top: 198, width: 860, height: 860 };

const PAPER = '#fcf2ec';

const encode = (image: ReturnType<typeof sharp>) =>
  image.png({ compressionLevel: 9 }).toBuffer();

// Browsers and desktops show the art as it was drawn.
function round(size: number): Promise<Buffer> {
  return encode(sharp(SOURCE).resize(size, size));
}

// iOS fills transparency with black, so its icon fills the whole square.
function fullBleed(size: number): Promise<Buffer> {
  return encode(
    sharp(SOURCE).extract(INNER_SQUARE).resize(size, size).flatten(),
  );
}

// An Android mask can leave as little as the centre 80%, which the whole circle
// keeps the cat's ears inside. Softer masks show the corners too, so they get
// the app's paper colour, the same as the install splash.
function maskable(size: number): Promise<Buffer> {
  return encode(
    sharp(SOURCE).resize(size, size).flatten({ background: PAPER }),
  );
}

async function main(): Promise<void> {
  const dir = join(process.cwd(), 'public', 'icons');
  mkdirSync(dir, { recursive: true });
  const jobs: Array<[string, Promise<Buffer>]> = [
    ['icon-192.png', round(192)],
    ['icon-512.png', round(512)],
    ['icon-maskable-512.png', maskable(512)],
    ['apple-touch-icon.png', fullBleed(180)],
  ];
  for (const [name, png] of jobs) {
    writeFileSync(join(dir, name), await png);
    console.log(`wrote public/icons/${name}`);
  }
}

void main();
