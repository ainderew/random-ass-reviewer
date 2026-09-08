import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

// The lantern post, drawn once as SVG and rasterised at every size the
// platforms want. Maskable variants keep the mark inside the safe zone.
function lantern(size: number, padding: number): string {
  const inner = size - padding * 2;
  const s = (n: number) => padding + (n / 100) * inner;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#14161f"/>
  <rect x="${s(47)}" y="${s(52)}" width="${s(6) - padding}" height="${s(96) - s(52)}" rx="${(inner / 100) * 2}" fill="#8b91a8"/>
  <path d="M ${s(50)} ${s(10)} L ${s(66)} ${s(24)} L ${s(66)} ${s(50)} L ${s(34)} ${s(50)} L ${s(34)} ${s(24)} Z" fill="#c9932f"/>
  <path d="M ${s(50)} ${s(16)} L ${s(61)} ${s(26)} L ${s(61)} ${s(46)} L ${s(39)} ${s(46)} L ${s(39)} ${s(26)} Z" fill="#e8b04b"/>
  <ellipse cx="${s(50)}" cy="${s(36)}" rx="${(inner / 100) * 6}" ry="${(inner / 100) * 8}" fill="#fff1d6"/>
  <rect x="${s(45)}" y="${s(6)}" width="${s(55) - s(45)}" height="${s(10) - s(6)}" rx="${(inner / 100) * 1.5}" fill="#8b91a8"/>
</svg>`;
}

async function main(): Promise<void> {
  const dir = join(process.cwd(), 'public', 'icons');
  mkdirSync(dir, { recursive: true });
  const jobs: Array<[string, number, number]> = [
    ['icon-192.png', 192, 20],
    ['icon-512.png', 512, 54],
    ['icon-maskable-512.png', 512, 110],
    ['apple-touch-icon.png', 180, 24],
  ];
  for (const [name, size, padding] of jobs) {
    const png = await sharp(Buffer.from(lantern(size, padding)))
      .png()
      .toBuffer();
    writeFileSync(join(dir, name), png);
    console.log(`wrote public/icons/${name}`);
  }
  writeFileSync(join(dir, 'lantern.svg'), lantern(64, 6));
}

void main();
