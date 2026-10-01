import { z } from 'zod';
import {
  CARE_ACTIONS,
  PET_COATS,
  PET_NAME_MAX,
  PET_TOYS,
  type CareAction,
  type PetCoat,
  type PetToy,
} from '../pet/care';
import type { PetMood } from '../pet/happiness';

// Everything the study tab shows about the cat. Counts and weight are the
// server's; the client only draws them.
export interface PetView {
  name: string;
  coat: PetCoat;
  grams: number;
  // 0 slim to 1 roundest, for the model.
  roundness: number;
  stage: string;
  happiness: number;
  mood: PetMood;
  missesYou: boolean;
  kibble: { bowls: number; minutesToNext: number };
  treats: number;
  toys: { id: PetToy; label: string; unlocked: boolean; need: string }[];
}

export interface CareResult {
  pet: PetView;
  action: CareAction;
  toy: PetToy | null;
  // False when the action was only for fun: a second brush inside the
  // cooldown still happens, it just does not move the meter.
  happinessRaised: boolean;
}

export const updatePetRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(PET_NAME_MAX).optional(),
    coat: z.enum(PET_COATS).optional(),
  })
  .refine((v) => v.name !== undefined || v.coat !== undefined, {
    message: 'Nothing to change',
  });
export type UpdatePetRequest = z.infer<typeof updatePetRequestSchema>;

export const careRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('feed') }),
  z.object({ action: z.literal('treat') }),
  z.object({ action: z.literal('brush') }),
  z.object({
    action: z.literal('play'),
    toy: z.enum(
      PET_TOYS.filter((t) => t !== 'brush') as ['wand', 'mouse', 'yarn'],
    ),
  }),
]);
export type CareRequest = z.infer<typeof careRequestSchema>;
export const CARE_ACTION_NAMES = CARE_ACTIONS;

// A browser push subscription, as PushSubscription.toJSON() gives it.
export const pushSubscriptionSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({
    p256dh: z.string().min(16).max(200),
    auth: z.string().min(8).max(100),
  }),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export const pushUnsubscribeSchema = z.object({ endpoint: z.url().max(1000) });

export interface PushStatus {
  // Null when the server has no VAPID keys; the opt-in stays hidden.
  publicKey: string | null;
  // How many of this user's devices are subscribed.
  devices: number;
}
