import type { DbOrTx } from '@/server/db';
import { authSessions } from '@/server/db/schema';

// The same table Auth.js reads for database sessions. A row here plus the
// matching cookie is a signed-in user, whichever way they signed in.
export async function insertAuthSession(
  tx: DbOrTx,
  input: { sessionToken: string; userId: string; expires: Date },
): Promise<void> {
  await tx.insert(authSessions).values(input);
}
