import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { env } from '@/lib/env';

const IV_BYTES = 12;
const TAG_BYTES = 16;

function keyMaterial(): Buffer {
  if (!env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is not set');
  return createHash('sha256').update(env.ENCRYPTION_KEY).digest();
}

// AES-256-GCM. Output is base64(iv | tag | ciphertext).
export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', keyMaterial(), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
}

export function decryptSecret(encoded: string): string {
  const buffer = Buffer.from(encoded, 'base64');
  const iv = buffer.subarray(0, IV_BYTES);
  const tag = buffer.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const body = buffer.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv('aes-256-gcm', keyMaterial(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString(
    'utf8',
  );
}

// sk-ant-…7f3a. First seven and last four, never more.
export function maskSecret(plain: string): string {
  if (plain.length <= 11) return '…';
  return `${plain.slice(0, 7)}…${plain.slice(-4)}`;
}
