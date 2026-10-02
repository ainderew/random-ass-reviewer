import {
  BEATS_PER_BLOCK,
  BEAT_SECONDS,
  START,
  composeBlock,
  midiToHz,
  type ScoreState,
} from './piano-score';
import { impulseResponse, type Random } from './signal';
import { filter, type Voice } from './voices';

// Calibrated by rendering offline: at this level the piano sits within a dB
// of the rain and the brown noise, so switching does not jump. The held
// chord is about 5 dB under the keys and mostly fills the gaps between them.
const LEVEL = 7.5;
const PAD = 0.012;

// One felt-piano key: a sine with quieter overtones, a quick touch and a long
// natural fade. Low notes ring longer, as on a real piano.
function strike(
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  midi: number,
  velocity: number,
  hold: number,
): void {
  const tau = 0.9 + (72 - midi) * 0.035;
  const end = at + Math.max(hold, tau * 5);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(velocity, at + 0.01);
  env.gain.setTargetAtTime(0, at + 0.01, tau);
  env.connect(out);
  [
    { ratio: 1, gain: 1 },
    { ratio: 2, gain: 0.18 },
    { ratio: 3, gain: 0.05 },
  ].forEach(({ ratio, gain }) => {
    const osc = ctx.createOscillator();
    const level = ctx.createGain();
    osc.frequency.value = midiToHz(midi) * ratio;
    level.gain.value = gain;
    osc.connect(level).connect(env);
    osc.start(at);
    osc.stop(end);
  });
}

// A held chord under the keys, swelling in and out with each block, so the
// music never drops to nothing between phrases.
function pad(
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  midis: number[],
  seconds: number,
): void {
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.setTargetAtTime(1, at, 0.9);
  env.gain.setTargetAtTime(0, at + seconds, 1.1);
  env.connect(out);
  for (const midi of midis)
    for (const detune of [-4, 4]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = midiToHz(midi);
      osc.detune.value = detune;
      osc.connect(env);
      osc.start(at);
      osc.stop(at + seconds + 6);
    }
}

// Notes are scheduled a few seconds ahead, so a throttled background tab
// still has a full bar queued when its timer fires late.
export function pianoVoice(
  ctx: BaseAudioContext,
  out: AudioNode,
  random: Random,
): Voice {
  const tone = filter(ctx, 'lowpass', 2_400);
  const dry = ctx.createGain();
  dry.gain.value = 0.75;
  const room = ctx.createConvolver();
  const length = Math.floor(ctx.sampleRate * 2.8);
  const ir = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel += 1)
    ir.copyToChannel(
      impulseResponse(
        length,
        ctx.sampleRate,
        random,
      ) as Float32Array<ArrayBuffer>,
      channel,
    );
  room.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.4;
  const level = ctx.createGain();
  level.gain.value = LEVEL;
  level.connect(out);
  tone.connect(dry).connect(level);
  tone.connect(room).connect(wet).connect(level);
  const padBus = ctx.createGain();
  padBus.gain.value = PAD;
  padBus.connect(filter(ctx, 'lowpass', 900)).connect(tone);

  let state: ScoreState = START;
  let blockAt = ctx.currentTime + 0.3;
  let stopped = false;
  const fill = () => {
    while (!stopped && blockAt < ctx.currentTime + 4) {
      const { notes, next } = composeBlock(state, random);
      const seconds = BEATS_PER_BLOCK * BEAT_SECONDS;
      pad(
        ctx,
        padBus,
        blockAt,
        notes.filter((n) => n.at > 0 && n.at < 1).map((n) => n.midi),
        seconds,
      );
      for (const n of notes)
        strike(
          ctx,
          tone,
          blockAt + n.at * BEAT_SECONDS,
          n.midi,
          n.velocity * 0.16,
          n.hold * BEAT_SECONDS,
        );
      state = next;
      blockAt += seconds;
    }
  };
  fill();
  const timer = setInterval(fill, 1_000);
  return {
    stop: () => {
      stopped = true;
      clearInterval(timer);
    },
  };
}
