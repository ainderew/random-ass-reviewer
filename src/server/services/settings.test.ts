import { eq } from 'drizzle-orm';
import { closeDb, db } from '@/server/db';
import { users } from '@/server/db/schema';
import { encryptSecret } from '@/server/crypto';
import { setEncryptedApiKey } from '@/server/repositories/user';
import { clearApiKey, getApiKeyStatus, getUsageSummary } from './settings';
import { createUserWithDefaults } from './user-bootstrap';

describe('settings service', () => {
  let userId = '';
  beforeAll(async () => {
    const user = await createUserWithDefaults({
      id: 'ignored',
      email: `apikey-${Date.now()}@test.local`,
      emailVerified: null,
    });
    userId = user.id;
  });
  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
    await closeDb();
  });

  it('reports the key masked only, and usage as BYOK when a key is stored', async () => {
    expect(await getApiKeyStatus(userId)).toEqual({
      configured: false,
      masked: null,
    });
    await setEncryptedApiKey(
      db,
      userId,
      encryptSecret('sk-ant-api03-example-0123456789abcdef7f3a'),
    );
    const status = await getApiKeyStatus(userId);
    expect(status).toEqual({ configured: true, masked: 'sk-ant-…7f3a' });
    expect(JSON.stringify(status)).not.toContain('example');
    expect((await getUsageSummary(userId)).byok).toBe(true);

    await clearApiKey(userId);
    expect(await getApiKeyStatus(userId)).toEqual({
      configured: false,
      masked: null,
    });
    expect((await getUsageSummary(userId)).byok).toBe(false);
  });
});
