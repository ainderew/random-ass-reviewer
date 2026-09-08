import type { ApiKeyStatus, UsageSummary } from '@/domain/types';
import { env } from '@/lib/env';
import { db } from '@/server/db';
import { decryptSecret, encryptSecret, maskSecret } from '@/server/crypto';
import { AppError } from '@/server/errors';
import { AnthropicApiProvider } from '@/server/llm/anthropic-provider';
import { MODELS } from '@/server/llm/models';
import { findMonthUsage } from '@/server/repositories/llm-usage';
import {
  findEncryptedApiKey,
  setEncryptedApiKey,
} from '@/server/repositories/user';
import { monthKey } from './llm-usage';

// Masked only. The plaintext never goes back to the client, owner included.
export async function getApiKeyStatus(userId: string): Promise<ApiKeyStatus> {
  const encrypted = await findEncryptedApiKey(db, userId);
  if (!encrypted) return { configured: false, masked: null };
  return { configured: true, masked: maskSecret(decryptSecret(encrypted)) };
}

// Validate with a real, tiny call before storing. A bad key fails now, not later.
export async function setApiKey(
  userId: string,
  apiKey: string,
): Promise<ApiKeyStatus> {
  if (!env.ENCRYPTION_KEY) {
    throw new AppError(
      'INVALID_STATE',
      'Bring-your-own-key is not enabled on this server.',
    );
  }
  const probe = new AnthropicApiProvider(apiKey, 'byok');
  await probe.countTokens({ model: MODELS.cardGeneration, text: 'ping' });
  await setEncryptedApiKey(db, userId, encryptSecret(apiKey));
  return { configured: true, masked: maskSecret(apiKey) };
}

export async function clearApiKey(userId: string): Promise<void> {
  await setEncryptedApiKey(db, userId, null);
}

export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const month = monthKey();
  const [usage, encrypted] = await Promise.all([
    findMonthUsage(db, { userId, month }),
    findEncryptedApiKey(db, userId),
  ]);
  return {
    month,
    ...usage,
    quotaCents: env.MONTHLY_LLM_QUOTA_CENTS,
    byok: encrypted !== null,
  };
}
