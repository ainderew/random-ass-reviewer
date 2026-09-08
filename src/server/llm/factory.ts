import { env } from '@/lib/env';
import { db } from '@/server/db';
import { decryptSecret } from '@/server/crypto';
import { AppError } from '@/server/errors';
import { findEncryptedApiKey } from '@/server/repositories/user';
import { AnthropicApiProvider } from './anthropic-provider';
import { FakeLlmProvider } from './fake-provider';
import { LocalCliProvider } from './local-cli-provider';
import type { LlmProvider } from './provider';

// BYOK first, then the developer's local CLI, then the platform key.
export async function getProviderForUser(userId: string): Promise<LlmProvider> {
  const encrypted = await findEncryptedApiKey(db, userId);
  if (encrypted)
    return new AnthropicApiProvider(decryptSecret(encrypted), 'byok');

  if (env.LLM_PROVIDER === 'fake') {
    if (env.NODE_ENV === 'production')
      throw new Error('fake provider is not permitted in production');
    return new FakeLlmProvider();
  }

  if (env.LLM_PROVIDER === 'local-cli') {
    if (env.NODE_ENV === 'production')
      throw new Error('local-cli provider is not permitted in production');
    return new LocalCliProvider();
  }

  if (!env.ANTHROPIC_API_KEY) {
    throw new AppError(
      'INVALID_STATE',
      'Card generation is not configured here. Add your own Anthropic key in settings.',
    );
  }
  return new AnthropicApiProvider(env.ANTHROPIC_API_KEY);
}
