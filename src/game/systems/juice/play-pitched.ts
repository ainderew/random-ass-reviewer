// Tiny synthesised UI sounds. Each consecutive success can play a semitone
// higher, which is nearly free and disproportionately effective.

let context: AudioContext | null = null;

// The island's audio toggle. Muted by default, always; a tone without consent
// is a surprise, and surprises are not what a calm product does.
function audioEnabled(): boolean {
  try {
    return localStorage.getItem('aloft:audio') === 'on';
  } catch {
    return false;
  }
}

function getContext(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
  return context;
}

export interface ToneOptions {
  frequency: number;
  durationMs?: number;
  type?: OscillatorType;
  semitones?: number;
  gain?: number;
}

export function playPitched(options: ToneOptions): void {
  if (!audioEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;
  const {
    frequency,
    durationMs = 140,
    type = 'sine',
    semitones = 0,
    gain = 0.18,
  } = options;
  const rate = 2 ** (Math.min(semitones, 12) / 12);
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  const now = ctx.currentTime;
  osc.type = type;
  osc.frequency.setValueAtTime(frequency * rate, now);
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(gain, now + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.connect(env).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.05);
}

// A short ascending arpeggio for the moments that earn one.
export function playFanfare(
  notes: number[] = [523, 659, 784, 1047],
  gapMs = 90,
): void {
  notes.forEach((frequency, i) => {
    setTimeout(
      () =>
        playPitched({
          frequency,
          durationMs: 220,
          type: 'triangle',
          gain: 0.14,
        }),
      i * gapMs,
    );
  });
}
