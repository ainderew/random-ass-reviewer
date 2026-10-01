import {
  createCipheriv,
  createECDH,
  createPrivateKey,
  hkdfSync,
  randomBytes,
  sign,
} from 'node:crypto';

// Web Push without a library: VAPID (RFC 8292) to identify this server, and
// aes128gcm (RFC 8291) to encrypt the message for one browser. Checked
// against the RFC 8291 test vector in web-push.test.ts.

export interface VapidKeys {
  // base64url, as `npx web-push generate-vapid-keys` prints them.
  publicKey: string;
  privateKey: string;
  // mailto: or https: contact for the push services.
  subject: string;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type PushOutcome = 'sent' | 'gone' | 'failed';

const b64url = (b: Buffer) => b.toString('base64url');
const fromB64url = (s: string) => Buffer.from(s, 'base64url');
const RECORD_SIZE = 4096;

export function vapidAuthorization(
  endpoint: string,
  keys: VapidKeys,
  now: Date,
): string {
  const publicKey = fromB64url(keys.publicKey);
  const key = createPrivateKey({
    format: 'jwk',
    key: {
      kty: 'EC',
      crv: 'P-256',
      x: b64url(publicKey.subarray(1, 33)),
      y: b64url(publicKey.subarray(33, 65)),
      d: keys.privateKey,
    },
  });
  const header = b64url(
    Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })),
  );
  const claims = b64url(
    Buffer.from(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(now.getTime() / 1000) + 12 * 3600,
        sub: keys.subject,
      }),
    ),
  );
  const unsigned = `${header}.${claims}`;
  const signature = sign('sha256', Buffer.from(unsigned), {
    key,
    dsaEncoding: 'ieee-p1363',
  });
  return `vapid t=${unsigned}.${b64url(signature)}, k=${keys.publicKey}`;
}

// One aes128gcm record: header (salt, record size, our ephemeral public key)
// then the ciphertext of the payload and its 0x02 delimiter. `fixed` exists
// only so the test vector can pin the random parts.
export function encryptPayload(
  payload: Buffer,
  target: Pick<PushTarget, 'p256dh' | 'auth'>,
  fixed: { serverPrivateKey?: Buffer; salt?: Buffer } = {},
): Buffer {
  const uaPublic = fromB64url(target.p256dh);
  const authSecret = fromB64url(target.auth);
  const ecdh = createECDH('prime256v1');
  if (fixed.serverPrivateKey) ecdh.setPrivateKey(fixed.serverPrivateKey);
  else ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(uaPublic);
  const salt = fixed.salt ?? randomBytes(16);

  const keyInfo = Buffer.concat([
    Buffer.from('WebPush: info\0'),
    uaPublic,
    asPublic,
  ]);
  const ikm = Buffer.from(hkdfSync('sha256', shared, authSecret, keyInfo, 32));
  const cek = Buffer.from(
    hkdfSync(
      'sha256',
      ikm,
      salt,
      Buffer.from('Content-Encoding: aes128gcm\0'),
      16,
    ),
  );
  const nonce = Buffer.from(
    hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12),
  );

  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([
    cipher.update(Buffer.concat([payload, Buffer.from([2])])),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(RECORD_SIZE);
  return Buffer.concat([
    salt,
    size,
    Buffer.from([asPublic.length]),
    asPublic,
    body,
  ]);
}

// Sends one message. A 404 or 410 means the browser dropped the
// subscription for good, so the caller can forget it.
export async function sendWebPush(
  target: PushTarget,
  message: object,
  keys: VapidKeys,
  now: Date = new Date(),
  send: typeof fetch = fetch,
): Promise<PushOutcome> {
  const body = encryptPayload(Buffer.from(JSON.stringify(message)), target);
  try {
    const res = await send(target.endpoint, {
      method: 'POST',
      headers: {
        Authorization: vapidAuthorization(target.endpoint, keys, now),
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: String(12 * 3600),
        Urgency: 'normal',
      },
      body: new Uint8Array(body),
    });
    if (res.status === 404 || res.status === 410) return 'gone';
    return res.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
}
