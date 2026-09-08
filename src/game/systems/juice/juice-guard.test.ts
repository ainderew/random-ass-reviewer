import { readdirSync } from 'node:fs';
import { join } from 'node:path';

// Phase 8's lint rule catches misuse; this catches omission. A new export
// from the juice layer must be added to the reduced-motion table before it
// can ship, so nothing animates without asking worldState.reducedMotion.
const COVERED_BY_REDUCED_MOTION_TESTS = new Set([
  'useHitStop',
  'useScreenShake',
  'shakeOffset',
  'useSpringPop',
  'playPitched',
  'playFanfare',
  'HIT_STOP_MS',
  'SHAKE',
  'SPRING',
]);

describe('juice exports', () => {
  it('are all covered by the reduced-motion table', () => {
    const dir = join(__dirname);
    const modules = readdirSync(dir).filter(
      (f) => /^[a-z-]+\.ts$/.test(f) && !f.endsWith('.test.ts'),
    );
    expect(modules.length).toBeGreaterThan(0);
    const exported = new Set<string>();
    for (const file of modules) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(join(dir, file)) as Record<string, unknown>;
      for (const name of Object.keys(mod)) exported.add(name);
    }
    const missing = [...exported].filter(
      (name) => !COVERED_BY_REDUCED_MOTION_TESTS.has(name),
    );
    expect(missing).toEqual([]);
  });
});
