import { and, eq, isNull, lt, lte, or, sql, type SQL } from 'drizzle-orm';
import type { PetCoat } from '@/domain/pet/care';
import {
  DECAY_PER_HOUR,
  GRACE_HOURS,
  HAPPY_MAX,
  HAPPY_START,
} from '@/domain/pet/happiness';
import type { DbOrTx } from '@/server/db';
import { pets, pushSubscriptions, users } from '@/server/db/schema';
import { AppError } from '@/server/errors';

export type PetRecord = typeof pets.$inferSelect;

const at = (d: Date) => sql`${d.toISOString()}::timestamptz`;

// Happiness worn down to `now`, in SQL. The same formula as happinessNow in
// domain/pet/happiness, so a write never reads the value first.
function worn(now: Date): SQL<number> {
  return sql<number>`GREATEST(0, ${pets.happiness} - GREATEST(0, EXTRACT(EPOCH FROM (${at(now)} - ${pets.happinessAt})) / 3600 - ${GRACE_HOURS}::float8) * ${DECAY_PER_HOUR}::float8)`;
}

function raised(now: Date, gain: number): SQL<number> {
  return sql<number>`LEAST(${HAPPY_MAX}::float8, ${worn(now)} + ${gain}::float8)`;
}

// One cat per user, made the first time anyone asks. The primary key keeps
// it to one under any race.
export async function ensurePet(
  tx: DbOrTx,
  userId: string,
): Promise<PetRecord> {
  await tx.insert(pets).values({ userId }).onConflictDoNothing();
  const row = await tx.query.pets.findFirst({ where: eq(pets.userId, userId) });
  if (!row) throw new AppError('NOT_FOUND', 'Pet not found');
  return row;
}

export async function updatePetDetails(
  tx: DbOrTx,
  userId: string,
  patch: { name?: string; coat?: PetCoat },
): Promise<PetRecord> {
  const [row] = await tx
    .update(pets)
    .set(patch)
    .where(eq(pets.userId, userId))
    .returning();
  if (!row) throw new AppError('NOT_FOUND', 'Pet not found');
  return row;
}

// Uses one of what she has earned. The condition is the guard: two taps at
// once can never feed more bowls than the work has filled.
export async function spendOne(
  tx: DbOrTx,
  userId: string,
  input: { what: 'bowls' | 'treats'; earned: number; gain: number; now: Date },
): Promise<PetRecord | null> {
  const column = input.what === 'bowls' ? pets.bowlsFed : pets.treatsGiven;
  const used = input.what === 'bowls' ? 'bowlsFed' : 'treatsGiven';
  const [row] = await tx
    .update(pets)
    .set({
      [used]: sql`${column} + 1`,
      happiness: raised(input.now, input.gain),
      happinessAt: input.now,
    })
    .where(and(eq(pets.userId, userId), lt(column, input.earned)))
    .returning();
  return row ?? null;
}

// Brushing or play. Being together always counts; the happiness only once
// per cooldown, measured from the last time it paid.
export async function playTogether(
  tx: DbOrTx,
  userId: string,
  input: {
    what: 'brushedAt' | 'playedAt';
    gain: number;
    cooldownMs: number;
    now: Date;
  },
): Promise<{ pet: PetRecord; raised: boolean }> {
  const column = pets[input.what];
  const since = new Date(input.now.getTime() - input.cooldownMs);
  const fresh = sql`(${column} IS NULL OR ${column} <= ${at(since)})`;
  const [row] = await tx
    .update(pets)
    .set({
      happiness: sql`CASE WHEN ${fresh} THEN ${raised(input.now, input.gain)} ELSE ${worn(input.now)} END`,
      happinessAt: input.now,
      [input.what]: sql`CASE WHEN ${fresh} THEN ${at(input.now)} ELSE ${column} END`,
    })
    .where(eq(pets.userId, userId))
    .returning();
  if (!row) throw new AppError('NOT_FOUND', 'Pet not found');
  const paidAt = row[input.what];
  return {
    pet: row,
    raised: paidAt !== null && paidAt.getTime() === input.now.getTime(),
  };
}

// A finished session is time together. Makes the cat if she is not there yet.
export async function studiedTogether(
  tx: DbOrTx,
  userId: string,
  input: { gain: number; now: Date },
): Promise<PetRecord> {
  const [row] = await tx
    .insert(pets)
    .values({
      userId,
      happiness: Math.min(HAPPY_MAX, HAPPY_START + input.gain),
      happinessAt: input.now,
    })
    .onConflictDoUpdate({
      target: pets.userId,
      set: {
        happiness: raised(input.now, input.gain),
        happinessAt: input.now,
      },
    })
    .returning();
  if (!row) throw new AppError('NOT_FOUND', 'Pet not found');
  return row;
}

export interface NudgeCandidate {
  userId: string;
  name: string;
  happiness: number;
  happinessAt: Date;
  nudgedAt: Date | null;
  bowlsFed: number;
  timeZone: string;
}

// Cats that have missed their person long enough, on a device that agreed
// to hear about it. The waking-hours check happens in the service.
export async function findNudgeCandidates(
  tx: DbOrTx,
  input: { lonelySince: Date; nudgedBefore: Date; limit: number },
): Promise<NudgeCandidate[]> {
  return tx
    .select({
      userId: pets.userId,
      name: pets.name,
      happiness: pets.happiness,
      happinessAt: pets.happinessAt,
      nudgedAt: pets.nudgedAt,
      bowlsFed: pets.bowlsFed,
      timeZone: users.timezone,
    })
    .from(pets)
    .innerJoin(users, eq(users.id, pets.userId))
    .where(
      and(
        lte(pets.happinessAt, input.lonelySince),
        or(isNull(pets.nudgedAt), lte(pets.nudgedAt, input.nudgedBefore)),
        sql`EXISTS (SELECT 1 FROM ${pushSubscriptions} WHERE ${pushSubscriptions.userId} = ${pets.userId})`,
      ),
    )
    .limit(input.limit);
}

// Marks the nudge as sent before it goes out, so two runs can never send
// the same one twice.
export async function claimNudge(
  tx: DbOrTx,
  userId: string,
  input: { now: Date; nudgedBefore: Date },
): Promise<boolean> {
  const rows = await tx
    .update(pets)
    .set({ nudgedAt: input.now })
    .where(
      and(
        eq(pets.userId, userId),
        or(isNull(pets.nudgedAt), lte(pets.nudgedAt, input.nudgedBefore)),
      ),
    )
    .returning({ userId: pets.userId });
  return rows.length > 0;
}
