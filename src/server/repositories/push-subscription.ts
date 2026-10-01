import { and, count, eq } from 'drizzle-orm';
import type { PushSubscriptionInput } from '@/domain/types';
import type { DbOrTx } from '@/server/db';
import { pushSubscriptions } from '@/server/db/schema';

export type PushSubscriptionRecord = typeof pushSubscriptions.$inferSelect;

// The endpoint is unique: subscribing again from the same browser, even
// after signing in as someone else, moves it rather than duplicating it.
export async function saveSubscription(
  tx: DbOrTx,
  userId: string,
  sub: PushSubscriptionInput,
): Promise<void> {
  await tx
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
}

export async function deleteSubscription(
  tx: DbOrTx,
  userId: string,
  endpoint: string,
): Promise<void> {
  await tx
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint),
      ),
    );
}

// The push service said this address is gone for good.
export async function deleteSubscriptionByEndpoint(
  tx: DbOrTx,
  endpoint: string,
): Promise<void> {
  await tx
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function listSubscriptions(
  tx: DbOrTx,
  userId: string,
): Promise<PushSubscriptionRecord[]> {
  return tx
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
}

export async function countSubscriptions(
  tx: DbOrTx,
  userId: string,
): Promise<number> {
  const [row] = await tx
    .select({ value: count() })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  return row?.value ?? 0;
}
