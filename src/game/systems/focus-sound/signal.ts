// Pure sample generators for the focus sounds. No AudioContext here, so the
// shapes are testable: a buffer goes in a loop, a loop must not click.

export type Random = () => number;

// mulberry32. Seeded so tests see the same noise every run.
export function seeded(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

// Brown noise: white noise through a leaky integrator. Most of its energy
// sits low, which is why it reads as a steady rumble rather than a hiss.
export function brownNoise(length: number, random: Random): Float32Array {
  const out = new Float32Array(length);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    last = (last + 0.02 * (random() * 2 - 1)) / 1.02;
    out[i] = last;
  }
  return out;
}

// Pink noise, Paul Kellet's economy filter: equal energy per octave.
export function pinkNoise(length: number, random: Random): Float32Array {
  const out = new Float32Array(length);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < length; i += 1) {
    const white = random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    out[i] = b0 + b1 + b2 + white * 0.1848;
  }
  return out;
}

// Rain on a window: a scatter of tiny decaying plinks at random times, a few
// of them close and bright. Added on top of a pink noise bed elsewhere.
export function raindrops(
  length: number,
  sampleRate: number,
  perSecond: number,
  random: Random,
): Float32Array {
  const out = new Float32Array(length);
  const drops = Math.round((length / sampleRate) * perSecond);
  for (let d = 0; d < drops; d += 1) {
    const start = Math.floor(random() * length);
    const near = random() < 0.08;
    const amp = near ? 0.35 + random() * 0.3 : 0.04 + random() * 0.14;
    const freq = 1_400 + random() * (near ? 1_800 : 4_200);
    const tau = (0.002 + random() * (near ? 0.012 : 0.005)) * sampleRate;
    const span = Math.min(length - start, Math.ceil(tau * 6));
    const step = (2 * Math.PI * freq) / sampleRate;
    for (let i = 0; i < span; i += 1) {
      out[start + i] =
        (out[start + i] ?? 0) + amp * Math.exp(-i / tau) * Math.sin(i * step);
    }
  }
  return out;
}

// Make `raw` loop without a seam. The last `fade` samples are equal-power
// blended into the first ones, so sample L-1 runs straight into sample 0.
// Needs raw.length > fade; returns raw.length - fade samples.
export function seamlessLoop(raw: Float32Array, fade: number): Float32Array {
  const length = raw.length - fade;
  const out = raw.slice(0, length);
  for (let i = 0; i < fade; i += 1) {
    const t = (i + 0.5) / fade;
    out[i] =
      (raw[i] ?? 0) * Math.sin((t * Math.PI) / 2) +
      (raw[length + i] ?? 0) * Math.cos((t * Math.PI) / 2);
  }
  return out;
}

export function rms(samples: Float32Array): number {
  let sum = 0;
  for (const s of samples) sum += s * s;
  return samples.length ? Math.sqrt(sum / samples.length) : 0;
}

// Scale in place to a target loudness, so every sound starts at the same
// level and the volume slider means the same thing for each.
export function toRms(samples: Float32Array, target: number): Float32Array {
  const level = rms(samples);
  if (level === 0) return samples;
  const gain = target / level;
  for (let i = 0; i < samples.length; i += 1)
    samples[i] = Math.max(-1, Math.min(1, (samples[i] ?? 0) * gain));
  return samples;
}

// A room for the piano: decaying noise, darker as it fades.
export function impulseResponse(
  length: number,
  sampleRate: number,
  random: Random,
): Float32Array {
  const out = new Float32Array(length);
  let smooth = 0;
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const k = Math.min(0.9, 0.2 + t * 0.35);
    smooth = smooth * k + (random() * 2 - 1) * (1 - k);
    out[i] = smooth * Math.exp(-t * 2.6);
  }
  return out;
}
