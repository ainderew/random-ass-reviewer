import type { Random } from './signal';

// The soft piano: a slow loop of four warm chords in D with a few melody notes
// from the pentatonic scale over each. No words, no beat, no surprises; the
// melody moves by small steps and often rests.

export interface Note {
  // Beats from the start of the block, and how long the key is held.
  at: number;
  hold: number;
  midi: number;
  velocity: number;
}

export interface ScoreState {
  chord: number;
  // Index into MELODY of the last melody note.
  melody: number;
}

export const BEAT_SECONDS = 60 / 62;
export const BEATS_PER_BLOCK = 8;

// Dmaj9, F#m11, Gmaj9, Em9 over A. The bass climbs D, F#, G, A and comes home.
const CHORDS = [
  { bass: 38, tones: [50, 57, 61, 64, 66] },
  { bass: 42, tones: [54, 57, 61, 64, 69] },
  { bass: 43, tones: [55, 59, 62, 66, 69] },
  { bass: 45, tones: [52, 57, 59, 62, 66] },
] as const;

// D major pentatonic from F#4 to A5.
export const MELODY = [66, 69, 71, 74, 76, 78, 81] as const;

const SLOTS = [1, 1.5, 2, 3, 3.5, 4, 5, 5.5, 6, 7];
const COUNTS = [0, 1, 2, 2, 3, 3, 4];
const STEPS = [-2, -1, -1, 0, 1, 1, 2];

export const START: ScoreState = { chord: 0, melody: 2 };

const pick = <T>(items: readonly T[], random: Random): T =>
  items[Math.floor(random() * items.length)] as T;

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function composeBlock(
  state: ScoreState,
  random: Random,
): { notes: Note[]; next: ScoreState } {
  const chord = CHORDS[state.chord % CHORDS.length] ?? CHORDS[0];
  const notes: Note[] = [
    { at: 0, hold: BEATS_PER_BLOCK, midi: chord.bass, velocity: 0.42 },
  ];

  // Roll three chord tones upward, the lowest always included.
  const upper = chord.tones.slice(1).filter(() => random() < 0.6);
  const rolled = [chord.tones[0], ...upper.slice(0, 2)];
  rolled.forEach((midi, i) => {
    notes.push({
      at: 0.14 * (i + 1),
      hold: BEATS_PER_BLOCK - 1,
      midi,
      velocity: 0.2 + random() * 0.08,
    });
  });

  // A few melody notes on half-beat slots, moving by small steps.
  const count = pick(COUNTS, random);
  const slots = [...SLOTS]
    .sort(() => random() - 0.5)
    .slice(0, count)
    .sort((a, b) => a - b);
  let melody = state.melody;
  for (const at of slots) {
    melody = Math.max(
      0,
      Math.min(MELODY.length - 1, melody + pick(STEPS, random)),
    );
    notes.push({
      at,
      hold: 2 + random() * 2,
      midi: MELODY[melody] ?? MELODY[0],
      velocity: 0.24 + random() * 0.14,
    });
  }

  return {
    notes,
    next: { chord: (state.chord + 1) % CHORDS.length, melody },
  };
}
