import type { FocusLayerId } from '@/domain/session/focus-sound';
import { pianoVoice } from './piano-voice';
import { brownVoice, rainVoice, type Voice } from './voices';

// One shared AudioContext for the focus sounds. Layers play side by side,
// each with its own fade and volume: a new layer fades in, a dropped one
// fades out. When the last stops, the context suspends so an idle tab does
// no audio work. Every call is a no-op where Web Audio does not exist.

export interface LayerLevel {
  id: FocusLayerId;
  volume: number;
}

interface Playing {
  fade: GainNode;
  level: GainNode;
  voice: Voice;
}

const VOICES: Record<
  FocusLayerId,
  (ctx: BaseAudioContext, out: AudioNode, random: () => number) => Voice
> = { rain: rainVoice, brown: brownVoice, piano: pianoVoice };

const FADE_IN = 2.5;
const FADE_OUT = 1.2;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const playing = new Map<FocusLayerId, Playing>();
let idle: ReturnType<typeof setTimeout> | null = null;

// Safari 17+. 'playback' lets a chosen sound play with the ring switch on
// silent; 'auto' hands the switch back once it stops.
function audioSession(type: 'playback' | 'auto'): void {
  const session = (navigator as Navigator & { audioSession?: { type: string } })
    .audioSession;
  try {
    if (session) session.type = type;
  } catch {
    // Older Safari rejects the assignment. Sound still plays off silent.
  }
}

function context(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    // A limiter, so the top of the volume slider is loud but never harsh.
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -3;
    limit.knee.value = 3;
    limit.ratio.value = 12;
    limit.attack.value = 0.003;
    limit.release.value = 0.25;
    master.connect(limit).connect(ctx.destination);
  }
  return ctx;
}

// Browsers start audio only from a tap. Call this inside the tap handler
// that will lead to sound; later calls from effects are then allowed.
export function resumeFocusSound(): void {
  const c = context();
  if (c && c.state !== 'running') void c.resume().catch(() => undefined);
}

// Loudness is heard roughly on a square law; this keeps the slider even.
const loudness = (volume: number) => Math.max(0, Math.min(1, volume)) ** 2;

function fadeOut(layer: Playing, c: AudioContext): void {
  const at = c.currentTime;
  layer.fade.gain.setTargetAtTime(0, at, FADE_OUT / 4);
  layer.voice.stop(at + FADE_OUT + 0.2);
  setTimeout(() => layer.level.disconnect(), (FADE_OUT + 0.4) * 1000);
}

function start(
  { id, volume }: LayerLevel,
  c: AudioContext,
  out: AudioNode,
): void {
  const level = c.createGain();
  level.gain.value = loudness(volume);
  const fade = c.createGain();
  fade.gain.value = 0;
  fade.connect(level).connect(out);
  fade.gain.setTargetAtTime(1, c.currentTime, FADE_IN / 4);
  try {
    playing.set(id, { fade, level, voice: VOICES[id](c, fade, Math.random) });
  } catch (error) {
    // Sound is extra. A failure here must never touch the timer.
    console.error('[focus] sound unavailable', error);
    level.disconnect();
  }
}

// Make the layers playing match `layers`: start the new ones, fade out the
// ones left out, and move every volume to its new level.
export function playFocusMix(layers: LayerLevel[]): void {
  if (layers.length === 0) return stopFocusSound();
  const c = context();
  if (!c || !master) return;
  if (idle) clearTimeout(idle);
  idle = null;
  audioSession('playback');
  resumeFocusSound();
  for (const [id, layer] of playing)
    if (!layers.some((l) => l.id === id)) {
      fadeOut(layer, c);
      playing.delete(id);
    }
  for (const layer of layers) {
    const current = playing.get(layer.id);
    if (current)
      current.level.gain.setTargetAtTime(
        loudness(layer.volume),
        c.currentTime,
        0.05,
      );
    else start(layer, c, master);
  }
}

export function stopFocusSound(): void {
  if (!ctx || playing.size === 0) return;
  for (const layer of playing.values()) fadeOut(layer, ctx);
  playing.clear();
  const c = ctx;
  idle = setTimeout(
    () => {
      idle = null;
      audioSession('auto');
      void c.suspend().catch(() => undefined);
    },
    (FADE_OUT + 0.6) * 1000,
  );
}
