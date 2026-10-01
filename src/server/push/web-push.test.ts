import { createECDH, createPublicKey, verify } from 'node:crypto';
import { encryptPayload, sendWebPush, vapidAuthorization } from './web-push';

// RFC 8291, Appendix A.
const RFC = {
  plaintext: 'When I grow up, I want to be a watermelon',
  asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  uaPublic:
    'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  header:
    'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  ciphertext:
    '8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ',
};

function vapidPair() {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return {
    publicKey: ecdh.getPublicKey().toString('base64url'),
    privateKey: ecdh.getPrivateKey().toString('base64url'),
    subject: 'mailto:test@example.com',
  };
}

describe('encryptPayload', () => {
  it('matches the RFC 8291 test vector byte for byte', () => {
    const out = encryptPayload(
      Buffer.from(RFC.plaintext),
      { p256dh: RFC.uaPublic, auth: RFC.auth },
      {
        serverPrivateKey: Buffer.from(RFC.asPrivate, 'base64url'),
        salt: Buffer.from(RFC.salt, 'base64url'),
      },
    );
    const expected = Buffer.concat([
      Buffer.from(RFC.header, 'base64url'),
      Buffer.from(RFC.ciphertext, 'base64url'),
    ]);
    expect(out.equals(expected)).toBe(true);
  });
});

describe('vapidAuthorization', () => {
  it('signs a token for the push service origin that our public key verifies', () => {
    const keys = vapidPair();
    const now = new Date('2026-10-01T10:00:00Z');
    const header = vapidAuthorization(
      'https://push.example.com/send/abc',
      keys,
      now,
    );
    const match = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(header);
    expect(match).not.toBeNull();
    const [, head, body, signature, k] = match as unknown as string[];
    expect(k).toBe(keys.publicKey);
    const claims = JSON.parse(Buffer.from(body!, 'base64url').toString());
    expect(claims).toEqual({
      aud: 'https://push.example.com',
      exp: now.getTime() / 1000 + 12 * 3600,
      sub: 'mailto:test@example.com',
    });
    const pub = Buffer.from(keys.publicKey, 'base64url');
    const key = createPublicKey({
      format: 'jwk',
      key: {
        kty: 'EC',
        crv: 'P-256',
        x: pub.subarray(1, 33).toString('base64url'),
        y: pub.subarray(33, 65).toString('base64url'),
      },
    });
    const ok = verify(
      'sha256',
      Buffer.from(`${head}.${body}`),
      { key, dsaEncoding: 'ieee-p1363' },
      Buffer.from(signature!, 'base64url'),
    );
    expect(ok).toBe(true);
  });
});

describe('sendWebPush', () => {
  const target = {
    endpoint: 'https://push.example.com/send/abc',
    p256dh: RFC.uaPublic,
    auth: RFC.auth,
  };
  const reply = (status: number) =>
    jest
      .fn()
      .mockResolvedValue(
        new Response(null, { status }),
      ) as unknown as typeof fetch;

  it('posts an encrypted body with the VAPID header', async () => {
    const send = reply(201);
    expect(
      await sendWebPush(target, { title: 'Hi' }, vapidPair(), new Date(), send),
    ).toBe('sent');
    const [url, init] = (send as unknown as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe(target.endpoint);
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Encoding']).toBe('aes128gcm');
    expect(headers.Authorization).toMatch(/^vapid t=/);
  });

  it('reports a dropped subscription as gone and other errors as failed', async () => {
    expect(
      await sendWebPush(target, {}, vapidPair(), new Date(), reply(410)),
    ).toBe('gone');
    expect(
      await sendWebPush(target, {}, vapidPair(), new Date(), reply(404)),
    ).toBe('gone');
    expect(
      await sendWebPush(target, {}, vapidPair(), new Date(), reply(500)),
    ).toBe('failed');
    const broken = jest
      .fn()
      .mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    expect(await sendWebPush(target, {}, vapidPair(), new Date(), broken)).toBe(
      'failed',
    );
  });
});
