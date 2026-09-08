import { auth } from '@/server/auth';
import { AppError } from '@/server/errors';

// Route handlers derive the user from the session cookie, never from the body.
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id)
    throw new AppError('UNAUTHORIZED', 'Sign in required');
  return session.user.id;
}
