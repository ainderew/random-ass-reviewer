import {
  meetsRequirement,
  type CareerProgress,
  type Requirement,
} from '@/domain/career/milestones';

// The study cat's economy. Nothing here is a balance the server pays out and
// could pay twice: what she has earned is derived from the work the server
// already counts (credited focus, good quizzes, remembered cards), and the
// pet row only counts what has been used.

// One bowl of kibble for every 25 minutes of credited focus, lifetime.
export const BOWL_MS = 25 * 60_000;
// Two tuna flakes for every quiz finished at 75% or better.
export const TREATS_PER_HIGH_GRADE = 2;

// Each bowl adds 100 g, from a slim 3.6 kg to a 7.2 kg loaf.
export const START_GRAMS = 3_600;
export const MAX_GRAMS = 7_200;
export const GRAMS_PER_BOWL = 100;

export const PET_NAME_MAX = 16;
export const DEFAULT_PET_NAME = 'Toast';
export const PET_COATS = ['ginger', 'cream', 'tuxedo', 'grey'] as const;
export type PetCoat = (typeof PET_COATS)[number];

export const PET_TOYS = ['brush', 'wand', 'mouse', 'yarn'] as const;
export type PetToy = (typeof PET_TOYS)[number];

export const CARE_ACTIONS = ['feed', 'treat', 'brush', 'play'] as const;
export type CareAction = (typeof CARE_ACTIONS)[number];

export interface ToyUnlock {
  id: PetToy;
  label: string;
  requires: Requirement;
  // How the lock reads while it is still closed.
  need: string;
}

// The brush comes from good quizzes, the toys from focus and recall.
export const TOYS: readonly ToyUnlock[] = [
  {
    id: 'brush',
    label: 'Soft brush',
    requires: { highGrades: 3 },
    need: '3 quizzes at 75% or better',
  },
  {
    id: 'wand',
    label: 'Feather wand',
    requires: { focusHours: 2 },
    need: '2 hours of focus',
  },
  {
    id: 'mouse',
    label: 'Crinkle mouse',
    requires: { cardsRecalled: 150 },
    need: '150 cards remembered',
  },
  {
    id: 'yarn',
    label: 'Yarn ball',
    requires: { focusHours: 8 },
    need: '8 hours of focus',
  },
];

export function bowlsEarned(focusMs: number): number {
  return Math.floor(Math.max(0, focusMs) / BOWL_MS);
}

// Focus still needed before the next bowl, in whole minutes rounded up.
export function minutesToNextBowl(focusMs: number): number {
  const into = Math.max(0, focusMs) % BOWL_MS;
  return Math.ceil((BOWL_MS - into) / 60_000);
}

// Bowls a session filled, given lifetime focus before it and what it credited.
export function bowlsFilled(focusBeforeMs: number, creditedMs: number): number {
  return bowlsEarned(focusBeforeMs + creditedMs) - bowlsEarned(focusBeforeMs);
}

export function treatsEarned(highGrades: number): number {
  return Math.max(0, highGrades) * TREATS_PER_HIGH_GRADE;
}

export function weightGrams(bowlsFed: number): number {
  return Math.min(
    MAX_GRAMS,
    START_GRAMS + Math.max(0, bowlsFed) * GRAMS_PER_BOWL,
  );
}

// 0 at her starting weight, 1 at her roundest. Drives the model.
export function roundness(grams: number): number {
  const t = (grams - START_GRAMS) / (MAX_GRAMS - START_GRAMS);
  return Math.min(1, Math.max(0, t));
}

export function weightStage(grams: number): string {
  if (grams < 4_200) return 'Slim';
  if (grams < 5_000) return 'Round';
  if (grams < 5_800) return 'Chubby';
  if (grams < 6_600) return 'Chonky';
  return 'Absolute loaf';
}

export function toyUnlocked(toy: PetToy, p: CareerProgress): boolean {
  const unlock = TOYS.find((t) => t.id === toy);
  return unlock ? meetsRequirement(unlock.requires, p) : false;
}

// Trimmed, single-spaced, and short enough for a notification title.
export function cleanPetName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, PET_NAME_MAX).trim();
}
