import { eq } from 'drizzle-orm';
import type { User } from '@/domain/types';
import type { DbOrTx } from '@/server/db';
import { users } from '@/server/db/schema';

type UserRow = typeof users.$inferSelect;

export interface NewUser {
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    image: row.image,
    emailVerified: row.emailVerified,
    timezone: row.timezone,
    createdAt: row.createdAt,
    onboardedAt: row.onboardedAt ?? null,
    dailyCapMs: row.dailyCapMs ?? null,
    breakReminderMs: row.breakReminderMs ?? null,
  };
}

export async function insertUser(tx: DbOrTx, input: NewUser): Promise<User> {
  const [row] = await tx
    .insert(users)
    .values({
      email: input.email,
      name: input.name ?? null,
      image: input.image ?? null,
      emailVerified: input.emailVerified ?? null,
    })
    .returning();
  if (!row) throw new Error('insertUser returned no row');
  return toUser(row);
}

export async function findUserById(
  tx: DbOrTx,
  userId: string,
): Promise<User | null> {
  const row = await tx.query.users.findFirst({ where: eq(users.id, userId) });
  return row ? toUser(row) : null;
}

export async function updateUserTimezone(
  tx: DbOrTx,
  userId: string,
  timezone: string,
): Promise<void> {
  await tx.update(users).set({ timezone }).where(eq(users.id, userId));
}

export async function findEncryptedApiKey(
  tx: DbOrTx,
  userId: string,
): Promise<string | null> {
  const row = await tx.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { encryptedAnthropicKey: true },
  });
  return row?.encryptedAnthropicKey ?? null;
}

export async function setEncryptedApiKey(
  tx: DbOrTx,
  userId: string,
  encrypted: string | null,
): Promise<void> {
  await tx
    .update(users)
    .set({ encryptedAnthropicKey: encrypted })
    .where(eq(users.id, userId));
}

export async function updateUserPreferences(
  tx: DbOrTx,
  userId: string,
  patch: Partial<{
    timezone: string;
    onboardedAt: Date;
    dailyCapMs: number | null;
    breakReminderMs: number | null;
  }>,
): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  await tx.update(users).set(patch).where(eq(users.id, userId));
}

export async function findUserByEmail(
  tx: DbOrTx,
  email: string,
): Promise<User | null> {
  const row = await tx.query.users.findFirst({ where: eq(users.email, email) });
  return row ? toUser(row) : null;
}

export async function findPasswordHash(
  tx: DbOrTx,
  userId: string,
): Promise<string | null> {
  const row = await tx.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { passwordHash: true },
  });
  return row?.passwordHash ?? null;
}

export async function setPasswordHash(
  tx: DbOrTx,
  userId: string,
  hash: string,
): Promise<void> {
  await tx
    .update(users)
    .set({ passwordHash: hash })
    .where(eq(users.id, userId));
}
