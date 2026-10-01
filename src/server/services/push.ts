import { bowlsEarned } from '@/domain/pet/care';
import { MISSES_YOU_AFTER_MS, happinessNow } from '@/domain/pet/happiness';
import { NUDGE_GAP_MS, nudgeCopy, nudgeDue } from '@/domain/pet/nudge';
import type { PushStatus, PushSubscriptionInput } from '@/domain/types';
import { env } from '@/lib/env';
import { db } from '@/server/db';
import { AppError } from '@/server/errors';
import {
  sendWebPush,
  type PushOutcome,
  type PushTarget,
  type VapidKeys,
} from '@/server/push/web-push';
import { sumCreditedAllTime } from '@/server/repositories/focus-session';
import {
  claimNudge,
  ensurePet,
  findNudgeCandidates,
} from '@/server/repositories/pet';
import {
  countSubscriptions,
  deleteSubscription,
  deleteSubscriptionByEndpoint,
  listSubscriptions,
  saveSubscription,
} from '@/server/repositories/push-subscription';

export type Sender = (
  target: PushTarget,
  message: object,
  keys: VapidKeys,
  now: Date,
) => Promise<PushOutcome>;

// Null until the VAPID keys are in the environment; then the opt-in shows.
export function vapidKeys(): VapidKeys | null {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) return null;
  return {
    publicKey: VAPID_PUBLIC_KEY,
    privateKey: VAPID_PRIVATE_KEY,
    subject: VAPID_SUBJECT,
  };
}

export async function getPushStatus(userId: string): Promise<PushStatus> {
  return {
    publicKey: vapidKeys()?.publicKey ?? null,
    devices: await countSubscriptions(db, userId),
  };
}

export async function subscribeToNudges(
  userId: string,
  sub: PushSubscriptionInput,
): Promise<PushStatus> {
  if (!vapidKeys()) {
    throw new AppError('INVALID_STATE', 'Nudges are not set up on this server');
  }
  await saveSubscription(db, userId, sub);
  return getPushStatus(userId);
}

export async function unsubscribeFromNudges(
  userId: string,
  endpoint: string,
): Promise<PushStatus> {
  await deleteSubscription(db, userId, endpoint);
  return getPushStatus(userId);
}

// Sends one message to every device a user has subscribed, forgetting the
// ones the push service says are gone. Returns how many arrived.
async function deliver(
  userId: string,
  message: object,
  keys: VapidKeys,
  now: Date,
  send: Sender,
): Promise<number> {
  let delivered = 0;
  for (const sub of await listSubscriptions(db, userId)) {
    const outcome = await send(sub, message, keys, now);
    if (outcome === 'gone')
      await deleteSubscriptionByEndpoint(db, sub.endpoint);
    if (outcome === 'sent') delivered += 1;
  }
  return delivered;
}

// What the cat would say right now, for the copy.
async function nudgeFor(
  userId: string,
  pet: { name: string; happiness: number; happinessAt: Date; bowlsFed: number },
  now: Date,
) {
  const focusMs = await sumCreditedAllTime(db, userId);
  return nudgeCopy({
    name: pet.name,
    happiness: happinessNow(pet.happiness, pet.happinessAt, now),
    bowlsWaiting: Math.max(0, bowlsEarned(focusMs) - pet.bowlsFed),
  });
}

// Runs on the in-process clock (src/server/push/nudge-clock.ts). Each nudge
// is claimed in the database before it is sent, so overlapping runs or a
// restart mid-run cannot send one twice.
export async function sendDueNudges(
  now: Date = new Date(),
  send: Sender = sendWebPush,
): Promise<{ sent: number }> {
  const keys = vapidKeys();
  if (!keys) return { sent: 0 };
  const nudgedBefore = new Date(now.getTime() - NUDGE_GAP_MS);
  const candidates = await findNudgeCandidates(db, {
    lonelySince: new Date(now.getTime() - MISSES_YOU_AFTER_MS),
    nudgedBefore,
    limit: 200,
  });
  let sent = 0;
  for (const c of candidates) {
    const timing = {
      lastTogether: c.happinessAt,
      lastNudged: c.nudgedAt,
      now,
      timeZone: c.timeZone,
    };
    if (!nudgeDue(timing)) continue;
    if (!(await claimNudge(db, c.userId, { now, nudgedBefore }))) continue;
    const copy = await nudgeFor(c.userId, c, now);
    if (
      (await deliver(c.userId, { ...copy, url: '/study' }, keys, now, send)) > 0
    )
      sent += 1;
  }
  return { sent };
}

// "Send me one now", so the student can see that it works on this device.
export async function sendTestNudge(
  userId: string,
  now: Date = new Date(),
  send: Sender = sendWebPush,
): Promise<{ delivered: number }> {
  const keys = vapidKeys();
  if (!keys) {
    throw new AppError('INVALID_STATE', 'Nudges are not set up on this server');
  }
  const pet = await ensurePet(db, userId);
  const copy = await nudgeFor(userId, pet, now);
  return {
    delivered: await deliver(
      userId,
      { ...copy, url: '/study' },
      keys,
      now,
      send,
    ),
  };
}
