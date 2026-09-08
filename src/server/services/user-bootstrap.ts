import type { AdapterUser } from 'next-auth/adapters';
import type { User } from '@/domain/types';
import { db } from '@/server/db';
import { createIsland } from '@/server/repositories/island';
import { insertUser } from '@/server/repositories/user';
import { createUserStats } from '@/server/repositories/user-stats';

function toAdapterUser(user: User): AdapterUser {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.name,
    image: user.image,
  };
}

// Replaces the Drizzle adapter's createUser so the user row, its stats row, and
// its island are one transaction. A user with an account but no island would
// crash Phase 3, so this is all or nothing.
// The provider's id is ignored on purpose; the database generates ours.
export async function createUserWithDefaults(
  input: AdapterUser,
): Promise<AdapterUser> {
  const user = await db.transaction(async (tx) => {
    const created = await insertUser(tx, {
      email: input.email,
      name: input.name,
      image: input.image,
      emailVerified: input.emailVerified,
    });
    await createUserStats(tx, created.id);
    await createIsland(tx, created.id);
    return created;
  });
  return toAdapterUser(user);
}
