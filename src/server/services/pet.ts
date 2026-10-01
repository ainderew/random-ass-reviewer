import {
  meetsRequirement,
  type CareerProgress,
} from '@/domain/career/milestones';
import {
  TOYS,
  bowlsEarned,
  cleanPetName,
  minutesToNextBowl,
  roundness,
  toyUnlocked,
  treatsEarned,
  weightGrams,
  weightStage,
} from '@/domain/pet/care';
import {
  CARE_GAIN,
  REPEAT_COOLDOWN_MS,
  happinessNow,
  missesYou,
  petMood,
} from '@/domain/pet/happiness';
import type {
  CareRequest,
  CareResult,
  PetView,
  UpdatePetRequest,
} from '@/domain/types';
import { db } from '@/server/db';
import { AppError } from '@/server/errors';
import {
  ensurePet,
  playTogether,
  spendOne,
  updatePetDetails,
  type PetRecord,
} from '@/server/repositories/pet';
import { getCareerProgress } from './user-stats';

// The study cat. What she has earned is derived from the student's real work
// on every read; the pet row only counts what has been used.
export function toPetView(
  row: PetRecord,
  progress: CareerProgress,
  now: Date,
): PetView {
  const grams = weightGrams(row.bowlsFed);
  // Whole points, and the mood read from the same number the meter shows.
  const happiness = Math.round(
    happinessNow(row.happiness, row.happinessAt, now),
  );
  return {
    name: row.name,
    coat: row.coat,
    grams,
    roundness: roundness(grams),
    stage: weightStage(grams),
    happiness,
    mood: petMood(happiness),
    missesYou: missesYou(row.happinessAt, now),
    kibble: {
      bowls: Math.max(0, bowlsEarned(progress.focusMs) - row.bowlsFed),
      minutesToNext: minutesToNextBowl(progress.focusMs),
    },
    treats: Math.max(0, treatsEarned(progress.highGrades) - row.treatsGiven),
    toys: TOYS.map((t) => ({
      id: t.id,
      label: t.label,
      unlocked: meetsRequirement(t.requires, progress),
      need: t.need,
    })),
  };
}

export async function getPet(
  userId: string,
  now: Date = new Date(),
): Promise<PetView> {
  const [row, progress] = await Promise.all([
    ensurePet(db, userId),
    getCareerProgress(userId),
  ]);
  return toPetView(row, progress, now);
}

export async function updatePet(
  userId: string,
  patch: UpdatePetRequest,
  now: Date = new Date(),
): Promise<PetView> {
  const name = patch.name === undefined ? undefined : cleanPetName(patch.name);
  if (name === '') throw new AppError('VALIDATION', 'Give her a name');
  await ensurePet(db, userId);
  const row = await updatePetDetails(db, userId, {
    ...(name === undefined ? {} : { name }),
    ...(patch.coat === undefined ? {} : { coat: patch.coat }),
  });
  return toPetView(row, await getCareerProgress(userId), now);
}

// Feeding and treats use what the work has earned and fail kindly when there
// is none. Brushing and toys need their unlock; past that they are free.
export async function careForPet(
  userId: string,
  request: CareRequest,
  now: Date = new Date(),
): Promise<CareResult> {
  await ensurePet(db, userId);
  const progress = await getCareerProgress(userId);
  const toy = request.action === 'play' ? request.toy : null;

  if (request.action === 'feed' || request.action === 'treat') {
    const bowls = request.action === 'feed';
    const row = await spendOne(db, userId, {
      what: bowls ? 'bowls' : 'treats',
      earned: bowls
        ? bowlsEarned(progress.focusMs)
        : treatsEarned(progress.highGrades),
      gain: CARE_GAIN[request.action],
      now,
    });
    if (!row) {
      throw new AppError(
        'INSUFFICIENT_FUNDS',
        bowls
          ? 'Her bowl is empty. 25 minutes of focus fills the next one.'
          : 'No treats left. A quiz at 75% or better earns two.',
      );
    }
    return {
      pet: toPetView(row, progress, now),
      action: request.action,
      toy,
      happinessRaised: true,
    };
  }

  const needs = request.action === 'brush' ? 'brush' : request.toy;
  if (!toyUnlocked(needs, progress)) {
    throw new AppError('INVALID_STATE', 'That one is still locked');
  }
  const { pet, raised } = await playTogether(db, userId, {
    what: request.action === 'brush' ? 'brushedAt' : 'playedAt',
    gain: CARE_GAIN[request.action],
    cooldownMs: REPEAT_COOLDOWN_MS,
    now,
  });
  return {
    pet: toPetView(pet, progress, now),
    action: request.action,
    toy,
    happinessRaised: raised,
  };
}
