// Procedural ambient bed. No audio files: wind is filtered noise, crickets
// and birds are short oscillator envelopes. Cross-faded by day factor.

export interface AmbientEngine {
  setDayFactor: (dayFactor: number) => void;
  stop: () => void;
}

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(
    1,
    Math.floor(ctx.sampleRate * seconds),
    ctx.sampleRate,
  );
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    // Brown-ish noise: integrate white noise with a leak.
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  return buffer;
}

function chirp(
  ctx: AudioContext,
  out: GainNode,
  at: number,
  from: number,
  to: number,
  seconds: number,
  peak: number,
): void {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + seconds);
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(peak, at + seconds * 0.25);
  env.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  osc.connect(env).connect(out);
  osc.start(at);
  osc.stop(at + seconds + 0.05);
}

export function createAmbientEngine(): AmbientEngine {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  master.gain.setTargetAtTime(0.6, ctx.currentTime, 0.8);

  // Wind
  const wind = ctx.createBufferSource();
  wind.buffer = noiseBuffer(ctx, 4);
  wind.loop = true;
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'lowpass';
  windFilter.frequency.value = 320;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.3;
  wind.connect(windFilter).connect(windGain).connect(master);
  wind.start();
  const gust = ctx.createOscillator();
  const gustDepth = ctx.createGain();
  gust.frequency.value = 0.08;
  gustDepth.gain.value = 140;
  gust.connect(gustDepth).connect(windFilter.frequency);
  gust.start();

  const cricketGain = ctx.createGain();
  cricketGain.gain.value = 0;
  cricketGain.connect(master);
  const birdGain = ctx.createGain();
  birdGain.gain.value = 0;
  birdGain.connect(master);

  let dayFactor = 1;
  const timers: number[] = [];

  const scheduleCrickets = () => {
    const now = ctx.currentTime;
    for (let i = 0; i < 6; i += 1)
      chirp(ctx, cricketGain, now + i * 0.07, 4300, 4100, 0.05, 0.5);
    timers.push(
      window.setTimeout(scheduleCrickets, 700 + Math.random() * 1200),
    );
  };
  const scheduleBirds = () => {
    const now = ctx.currentTime;
    chirp(ctx, birdGain, now, 2200, 3300, 0.14, 0.5);
    chirp(ctx, birdGain, now + 0.2, 2900, 2400, 0.12, 0.4);
    timers.push(window.setTimeout(scheduleBirds, 2500 + Math.random() * 6000));
  };
  scheduleCrickets();
  scheduleBirds();

  return {
    setDayFactor: (next) => {
      if (Math.abs(next - dayFactor) < 0.01) return;
      dayFactor = next;
      const t = ctx.currentTime;
      windGain.gain.setTargetAtTime(0.18 + 0.14 * dayFactor, t, 1.5);
      cricketGain.gain.setTargetAtTime(dayFactor < 0.3 ? 0.16 : 0, t, 1.5);
      birdGain.gain.setTargetAtTime(dayFactor > 0.6 ? 0.1 : 0, t, 1.5);
    },
    stop: () => {
      for (const id of timers) window.clearTimeout(id);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      window.setTimeout(() => void ctx.close(), 1200);
    },
  };
}
