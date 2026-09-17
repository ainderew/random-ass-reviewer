import { startSessionRequestSchema } from '@/domain/types';
import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { AppError } from '@/server/errors';
import { startSession } from '@/server/services/focus-session';

export const POST = handleRoute(async (req) => {
  const userId = await requireUserId();
  const text = await req.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new AppError('VALIDATION', 'Invalid request body');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new AppError('VALIDATION', 'Invalid request body');
  const options = startSessionRequestSchema.parse({ mode: 'focus', ...body });
  return ok(await startSession(userId, options));
});
