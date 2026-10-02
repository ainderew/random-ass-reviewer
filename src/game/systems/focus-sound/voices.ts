import {
  brownNoise,
  pinkNoise,
  raindrops,
  seamlessLoop,
  toRms,
  type Random,
} from './signal';

// Each focus sound is a small graph feeding `out`. Noise is baked once into
// buffers that loop without a seam; two layers of different lengths keep the
// rain from repeating where an ear could catch it.

export interface Voice {
  stop: (at: number) => void;
}

const LEVEL = 0.16;

// Loops are whole seconds long. Chromium wraps some fractional lengths
// (11.3 s at 44.1 kHz, for one) onto the buffer's last few samples and
// buzzes; every whole-second length wraps cleanly at every sample rate.
function stereoLoop(
  ctx: BaseAudioContext,
  seconds: 7 | 11 | 13,
  make: (length: number) => Float32Array,
): AudioBuffer {
  const fade = Math.floor(ctx.sampleRate * 0.5);
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel += 1)
    buffer.copyToChannel(
      seamlessLoop(
        toRms(make(length + fade), LEVEL),
        fade,
      ) as Float32Array<ArrayBuffer>,
      channel,
    );
  return buffer;
}

function looping(ctx: BaseAudioContext, buffer: AudioBuffer) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

export function filter(
  ctx: BaseAudioContext,
  type: BiquadFilterType,
  frequency: number,
): BiquadFilterNode {
  const node = ctx.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  return node;
}

export function brownVoice(
  ctx: BaseAudioContext,
  out: AudioNode,
  random: Random,
): Voice {
  const source = looping(
    ctx,
    stereoLoop(ctx, 13, (n) => brownNoise(n, random)),
  );
  // Phone speakers cannot play the deepest part; drop it rather than waste
  // headroom, and round off the top so it never hisses.
  source
    .connect(filter(ctx, 'highpass', 40))
    .connect(filter(ctx, 'lowpass', 900))
    .connect(out);
  source.start();
  return { stop: (at) => source.stop(at) };
}

export function rainVoice(
  ctx: BaseAudioContext,
  out: AudioNode,
  random: Random,
): Voice {
  const bed = looping(
    ctx,
    stereoLoop(ctx, 11, (n) => pinkNoise(n, random)),
  );
  const drops = looping(
    ctx,
    stereoLoop(ctx, 7, (n) => raindrops(n, ctx.sampleRate, 90, random)),
  );
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.55;
  const dropGain = ctx.createGain();
  dropGain.gain.value = 0.7;
  bed
    .connect(filter(ctx, 'highpass', 350))
    .connect(filter(ctx, 'lowpass', 5_500))
    .connect(bedGain)
    .connect(out);
  drops
    .connect(filter(ctx, 'lowpass', 7_000))
    .connect(dropGain)
    .connect(out);
  // The shower thickens and thins over about half a minute.
  const swell = ctx.createOscillator();
  const depth = ctx.createGain();
  swell.frequency.value = 0.035;
  depth.gain.value = 0.12;
  swell.connect(depth).connect(bedGain.gain);
  for (const node of [bed, drops, swell]) node.start();
  return {
    stop: (at) => {
      for (const node of [bed, drops, swell]) node.stop(at);
    },
  };
}
