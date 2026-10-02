import { BEATS_PER_BLOCK, MELODY, START, composeBlock } from './piano-score';
import {
  brownNoise,
  impulseResponse,
  pinkNoise,
  raindrops,
  rms,
  seamlessLoop,
  seeded,
  toRms,
} from './signal';

const RATE = 8_000;

// The biggest jump between neighbouring samples, the loop seam included.
function worstStep(samples: Float32Array): number {
  let worst = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const next = samples[(i + 1) % samples.length] ?? 0;
    worst = Math.max(worst, Math.abs(next - (samples[i] ?? 0)));
  }
  return worst;
}

describe('focus sound signals', () => {
  it('is the same noise for the same seed', () => {
    expect(brownNoise(64, seeded(7))).toEqual(brownNoise(64, seeded(7)));
    expect(pinkNoise(64, seeded(7))).not.toEqual(pinkNoise(64, seeded(8)));
  });

  it('loops brown noise without a click at the seam', () => {
    const raw = toRms(brownNoise(RATE * 3, seeded(1)), 0.2);
    const loop = seamlessLoop(raw, RATE / 4);
    expect(loop).toHaveLength(RATE * 3 - RATE / 4);
    // A good seam is no bigger than the steps inside the noise itself.
    const inner = worstStep(raw.slice(0, loop.length - 1));
    expect(worstStep(loop)).toBeLessThanOrEqual(inner * 1.5);
  });

  it('keeps the loudness through the crossfade', () => {
    const raw = toRms(pinkNoise(RATE * 4, seeded(2)), 0.2);
    const loop = seamlessLoop(raw, RATE);
    expect(rms(loop.slice(0, RATE))).toBeGreaterThan(0.16);
    expect(rms(loop.slice(0, RATE))).toBeLessThan(0.24);
  });

  it('levels every sound to the same loudness without clipping', () => {
    const drops = toRms(raindrops(RATE * 2, RATE, 40, seeded(3)), 0.1);
    expect(rms(drops)).toBeCloseTo(0.1, 1);
    expect(Math.max(...drops.map(Math.abs))).toBeLessThanOrEqual(1);
    expect(toRms(new Float32Array(4), 0.1)).toEqual(new Float32Array(4));
  });

  it('has a room that fades out', () => {
    const room = impulseResponse(RATE * 2, RATE, seeded(4));
    expect(rms(room.slice(-RATE / 4))).toBeLessThan(
      rms(room.slice(0, RATE / 4)) / 20,
    );
  });
});

describe('soft piano score', () => {
  it('stays in key, inside the block, and soft', () => {
    let state = START;
    const random = seeded(5);
    for (let block = 0; block < 64; block += 1) {
      const { notes, next } = composeBlock(state, random);
      expect(next.chord).toBe((state.chord + 1) % 4);
      const melody = notes.slice(1).filter((n) => n.at >= 1);
      expect(melody.length).toBeLessThanOrEqual(4);
      for (const note of notes) {
        expect(note.at).toBeGreaterThanOrEqual(0);
        expect(note.at).toBeLessThan(BEATS_PER_BLOCK);
        expect(note.velocity).toBeLessThanOrEqual(0.42);
      }
      for (const note of melody)
        expect(MELODY).toContain(note.midi as (typeof MELODY)[number]);
      state = next;
    }
  });

  it('moves the melody by small steps', () => {
    let state = START;
    const random = seeded(6);
    let last = MELODY[START.melody] as number;
    for (let block = 0; block < 64; block += 1) {
      const { notes, next } = composeBlock(state, random);
      for (const note of notes.filter((n) => n.at >= 1)) {
        const from = MELODY.indexOf(last as (typeof MELODY)[number]);
        const to = MELODY.indexOf(note.midi as (typeof MELODY)[number]);
        expect(Math.abs(to - from)).toBeLessThanOrEqual(2);
        last = note.midi;
      }
      state = next;
    }
  });
});
