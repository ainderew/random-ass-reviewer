import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// scrypt from node:crypto. No dependency, memory-hard, and the parameters are
// stored with the hash so they can be raised later without a migration.
const N = 16384;
const R = 8;
const P = 1;
const KEY_BYTES = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, KEY_BYTES, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, n, r, p, salt, key] = stored.split('$');
  if (scheme !== 'scrypt' || !n || !r || !p || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64');
  const actual = scryptSync(
    password,
    Buffer.from(salt, 'base64'),
    expected.length,
    {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    },
  );
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
