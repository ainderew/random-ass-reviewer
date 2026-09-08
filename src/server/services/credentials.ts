import { randomUUID } from 'node:crypto';
import type { Credentials, RegisterRequest } from '@/domain/types';
import { db } from '@/server/db';
import { AppError } from '@/server/errors';
import { hashPassword, verifyPassword } from '@/server/password';
import { insertAuthSession } from '@/server/repositories/auth-session';
import {
  findPasswordHash,
  findUserByEmail,
  setPasswordHash,
} from '@/server/repositories/user';
import { createUserWithDefaults } from './user-bootstrap';

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

// Per email, in memory. Enough to stop a dictionary run on one instance;
// the password hash is slow on purpose for anything more patient.
const failures = new Map<string, { count: number; until: number }>();

const normalise = (email: string) => email.trim().toLowerCase();

function assertNotLocked(email: string): void {
  const entry = failures.get(email);
  if (entry && entry.count >= MAX_FAILURES && Date.now() < entry.until) {
    throw new AppError(
      'RATE_LIMITED',
      'Too many attempts. Try again in a few minutes.',
      429,
      { retryAfterSeconds: Math.ceil((entry.until - Date.now()) / 1000) },
    );
  }
}

function recordFailure(email: string): void {
  const entry = failures.get(email) ?? { count: 0, until: 0 };
  entry.count += 1;
  entry.until = Date.now() + LOCK_MS;
  failures.set(email, entry);
}

export interface SignedIn {
  sessionToken: string;
  expires: Date;
  userId: string;
}

async function openSession(userId: string): Promise<SignedIn> {
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  await insertAuthSession(db, { sessionToken, userId, expires });
  return { sessionToken, expires, userId };
}

// An existing email is refused outright, whichever way it signed up. Letting
// a password claim a Google account would be a takeover without a check.
export async function registerWithPassword(
  input: RegisterRequest,
): Promise<SignedIn> {
  const email = normalise(input.email);
  const existing = await findUserByEmail(db, email);
  if (existing) {
    throw new AppError(
      'INVALID_STATE',
      'That email already has an account. Sign in instead.',
    );
  }
  const user = await createUserWithDefaults({
    id: 'ignored',
    email,
    name: input.name ?? null,
    emailVerified: null,
  });
  await setPasswordHash(db, user.id, hashPassword(input.password));
  return openSession(user.id);
}

// One message for a missing account and a wrong password. The difference is
// an enumeration oracle.
export async function signInWithPassword(
  input: Credentials,
): Promise<SignedIn> {
  const email = normalise(input.email);
  assertNotLocked(email);
  const user = await findUserByEmail(db, email);
  const hash = user ? await findPasswordHash(db, user.id) : null;
  if (!user || !hash || !verifyPassword(input.password, hash)) {
    recordFailure(email);
    throw new AppError('UNAUTHORIZED', 'Email or password is not right.');
  }
  failures.delete(email);
  return openSession(user.id);
}
