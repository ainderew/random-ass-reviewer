import { z } from 'zod';

export type Currency = 'focus' | 'insight';

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: Date | null;
  timezone: string;
  createdAt: Date;
  onboardedAt: Date | null;
  dailyCapMs: number | null;
  breakReminderMs: number | null;
}

export interface UserStats {
  userId: string;
  focusBalance: number;
  insightBalance: number;
  xp: number;
  level: number;
  streakDays: number;
  streakFreezes: number;
  // 'YYYY-MM-DD' in the user's timezone, or null before the first session.
  lastSessionDate: string | null;
  pityCounter: number;
}

export interface StatsSnapshot {
  stats: PublicUserStats;
  today: import('./session').DailySummary;
  // Lifetime work the career scene draws from.
  career: import('../career/milestones').CareerProgress;
}

export const MAX_DAILY_CAP_MS = 8 * 60 * 60 * 1000;
export const MIN_DAILY_CAP_MS = 15 * 60 * 1000;
export const MIN_BREAK_REMINDER_MS = 10 * 60 * 1000;
export const MAX_BREAK_REMINDER_MS = 120 * 60 * 1000;

// Partial update. The cap can only go down from the product maximum.
export const updateProfileRequestSchema = z.object({
  timeZone: z.string().min(1).max(64).optional(),
  onboarded: z.literal(true).optional(),
  dailyCapMs: z
    .number()
    .int()
    .min(MIN_DAILY_CAP_MS)
    .max(MAX_DAILY_CAP_MS)
    .nullable()
    .optional(),
  breakReminderMs: z
    .number()
    .int()
    .min(MIN_BREAK_REMINDER_MS)
    .max(MAX_BREAK_REMINDER_MS)
    .nullable()
    .optional(),
});
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
// Kept for the island view, which only ever sends the zone.
export const updateTimeZoneRequestSchema = updateProfileRequestSchema.pick({
  timeZone: true,
});

export interface OnboardingProgress {
  hasNotes: boolean;
  hasSession: boolean;
  hasPlacement: boolean;
}

export interface Profile {
  timeZone: string;
  onboardedAt: Date | null;
  // Null means the product default applies.
  dailyCapMs: number | null;
  breakReminderMs: number | null;
  progress: OnboardingProgress;
}

export interface WeeklySummary {
  // 'YYYY-MM-DD' of the Monday that starts this week, in the user's zone.
  weekStart: string;
  hours: number;
  sessions: number;
  cardsReviewed: number;
  // Good or Easy over all reviews this week. Null with no reviews.
  retention: number | null;
  bestDay: { date: string; hours: number } | null;
  // Over 45 hours, or any day over 10. Worth one calm sentence.
  heavy: boolean;
}

// What the client may see. The pity counter stays on the server: exposing it
// lets a user time sessions to farm guaranteed rares.
export type PublicUserStats = Omit<UserStats, 'pityCounter'>;

// Email-and-password sign-in. Google is optional; this always works.
export const credentialsSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((e) => e.trim().toLowerCase()),
  password: z.string().min(8).max(128),
});
export type Credentials = z.infer<typeof credentialsSchema>;

export const registerRequestSchema = credentialsSchema.extend({
  name: z.string().trim().min(1).max(80).optional(),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
