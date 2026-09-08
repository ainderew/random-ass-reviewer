import { eq } from 'drizzle-orm';
import { closeDb, db } from '@/server/db';
import { authSessions, users } from '@/server/db/schema';
import { registerWithPassword, signInWithPassword } from './credentials';

describe('email and password sign-in', () => {
  const email = `pw-${Date.now()}@test.local`;
  afterAll(async () => {
    await db.delete(users).where(eq(users.email, email));
    await closeDb();
  });

  it('registers once, refuses a duplicate, signs in, and refuses a wrong password', async () => {
    const created = await registerWithPassword({
      email,
      password: 'long enough password',
      name: 'Pat',
    });
    const row = await db.query.authSessions.findFirst({
      where: eq(authSessions.sessionToken, created.sessionToken),
    });
    expect(row?.userId).toBe(created.userId);
    expect(row!.expires.getTime()).toBeGreaterThan(Date.now());

    await expect(
      registerWithPassword({
        email: email.toUpperCase(),
        password: 'another password',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });

    const again = await signInWithPassword({
      email,
      password: 'long enough password',
    });
    expect(again.userId).toBe(created.userId);
    expect(again.sessionToken).not.toBe(created.sessionToken);

    await expect(
      signInWithPassword({ email, password: 'wrong password!' }),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    await expect(
      signInWithPassword({
        email: 'nobody@test.local',
        password: 'wrong password!',
      }),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Email or password is not right.',
    });
  });
});
