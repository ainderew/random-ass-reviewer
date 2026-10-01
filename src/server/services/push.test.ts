import { eq } from 'drizzle-orm';
import { closeDb, db } from '@/server/db';
import { pets, pushSubscriptions, users } from '@/server/db/schema';
import type { PushOutcome, PushTarget } from '@/server/push/web-push';
import { getPet } from './pet';
import {
  getPushStatus,
  sendDueNudges,
  sendTestNudge,
  subscribeToNudges,
  unsubscribeFromNudges,
} from './push';
import { createUserWithDefaults } from './user-bootstrap';

// The server has keys in this suite. A throwaway pair, made per run.
jest.mock('@/lib/env', () => {
  const { createECDH } =
    jest.requireActual<typeof import('node:crypto')>('node:crypto');
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const actual = jest.requireActual<typeof import('@/lib/env')>('@/lib/env');
  return {
    ...actual,
    env: {
      ...actual.env,
      VAPID_PUBLIC_KEY: ecdh.getPublicKey().toString('base64url'),
      VAPID_PRIVATE_KEY: ecdh.getPrivateKey().toString('base64url'),
      VAPID_SUBJECT: 'mailto:test@example.com',
    },
  };
});

const H = 3_600_000;
// Noon UTC: waking hours for a UTC student.
const NOON = new Date('2026-03-10T12:00:00Z');
const created: string[] = [];

async function makeUser(): Promise<string> {
  const user = await createUserWithDefaults({
    id: 'ignored',
    email: `push-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
    emailVerified: null,
  });
  created.push(user.id);
  await db.update(users).set({ timezone: 'UTC' }).where(eq(users.id, user.id));
  return user.id;
}

const device = (tag: string) => ({
  endpoint: `https://push.example.com/send/${tag}-${Math.random().toString(36).slice(2)}`,
  keys: {
    p256dh:
      'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
    auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  },
});

// Records what would have been sent, and answers as the push service would.
function fakeSender(answer: PushOutcome = 'sent') {
  const sent: { endpoint: string; message: Record<string, string> }[] = [];
  const send = async (target: PushTarget, message: object) => {
    sent.push({
      endpoint: target.endpoint,
      message: message as Record<string, string>,
    });
    return answer;
  };
  return { sent, send };
}

async function lonelyFor(userId: string, hours: number) {
  await getPet(userId);
  await db
    .update(pets)
    .set({ happinessAt: new Date(NOON.getTime() - hours * H), nudgedAt: null })
    .where(eq(pets.userId, userId));
}

afterAll(async () => {
  for (const id of created) await db.delete(users).where(eq(users.id, id));
  await closeDb();
});

describe('nudge subscriptions', () => {
  it('shows the public key and counts devices, once per browser', async () => {
    const userId = await makeUser();
    expect((await getPushStatus(userId)).devices).toBe(0);
    const phone = device('phone');
    await subscribeToNudges(userId, phone);
    const again = await subscribeToNudges(userId, phone);
    expect(again.devices).toBe(1);
    expect(again.publicKey).toMatch(/^[A-Za-z0-9_-]{87}$/);
    expect((await unsubscribeFromNudges(userId, phone.endpoint)).devices).toBe(
      0,
    );
  });
});

describe('sendDueNudges', () => {
  it('nudges a cat that has missed her person, once a day', async () => {
    const userId = await makeUser();
    const phone = device('lonely');
    await subscribeToNudges(userId, phone);
    await lonelyFor(userId, 20);
    const first = fakeSender();
    await sendDueNudges(NOON, first.send);
    const mine = first.sent.filter((s) => s.endpoint === phone.endpoint);
    expect(mine).toHaveLength(1);
    expect(mine[0]!.message).toMatchObject({
      title: 'Toast misses you',
      body: 'Time to study! She is waiting by the window.',
      url: '/study',
    });
    const second = fakeSender();
    await sendDueNudges(new Date(NOON.getTime() + H), second.send);
    expect(
      second.sent.filter((s) => s.endpoint === phone.endpoint),
    ).toHaveLength(0);
  });

  it('leaves her alone when you were together recently, or it is night for you', async () => {
    const recent = await makeUser();
    const night = await makeUser();
    const recentPhone = device('recent');
    const nightPhone = device('night');
    await subscribeToNudges(recent, recentPhone);
    await subscribeToNudges(night, nightPhone);
    await lonelyFor(recent, 4);
    await lonelyFor(night, 30);
    await db
      .update(users)
      .set({ timezone: 'America/Los_Angeles' })
      .where(eq(users.id, night));
    const run = fakeSender();
    await sendDueNudges(NOON, run.send);
    const endpoints = run.sent.map((s) => s.endpoint);
    expect(endpoints).not.toContain(recentPhone.endpoint);
    expect(endpoints).not.toContain(nightPhone.endpoint);
  });

  it('forgets a device the push service says is gone', async () => {
    const userId = await makeUser();
    const phone = device('gone');
    await subscribeToNudges(userId, phone);
    await lonelyFor(userId, 20);
    await sendDueNudges(NOON, fakeSender('gone').send);
    const rows = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
    expect(rows).toHaveLength(0);
  });
});

describe('sendTestNudge', () => {
  it('sends one now to each of your devices', async () => {
    const userId = await makeUser();
    await subscribeToNudges(userId, device('a'));
    await subscribeToNudges(userId, device('b'));
    const run = fakeSender();
    expect(await sendTestNudge(userId, NOON, run.send)).toEqual({
      delivered: 2,
    });
  });
});
