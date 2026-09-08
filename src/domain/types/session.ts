import { z } from 'zod';

export const SESSION_STATUSES = ['active', 'completed', 'abandoned'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export interface FocusSession {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  focusedMs: number;
  creditedMs: number;
  lootSeed: string;
  status: SessionStatus;
  quizMultiplier: number;
  quizSubmittedAt: Date | null;
}

export interface Heartbeat {
  sessionId: string;
  seq: number;
  at: Date;
  focused: boolean;
}

// The client sends nothing at start. The server picks the clock and the loot seed.
export const startSessionRequestSchema = z.object({});
export type StartSessionRequest = z.infer<typeof startSessionRequestSchema>;

// No timestamp on purpose. The server stamps receipt time. Phase 2 depends on this.
export const heartbeatRequestSchema = z.object({
  sessionId: z.uuid(),
  seq: z.number().int().nonnegative(),
  focused: z.boolean(),
});
export type HeartbeatRequest = z.infer<typeof heartbeatRequestSchema>;

export const endSessionRequestSchema = z.object({
  sessionId: z.uuid(),
});
export type EndSessionRequest = z.infer<typeof endSessionRequestSchema>;

// What the client is allowed to know about an in-flight session. No loot seed.
export interface SessionSnapshot {
  sessionId: string;
  // ISO 8601 from the server clock. The client only renders a countdown from it.
  startedAt: string;
  focusedMs: number;
  // Highest seq the server has accepted, so a reload can continue the sequence.
  lastSeq: number | null;
}

export interface HeartbeatResult {
  focusedMs: number;
}

export interface SessionStreak {
  days: number;
  freezeUsed: boolean;
  freezesRemaining: number;
  milestone: number | null;
  milestoneInsight: number;
}

export interface SessionLevelUp {
  level: number;
  unlocks: string[];
}

export interface SessionResult {
  sessionId: string;
  focusedMs: number;
  creditedMs: number;
  focusAwarded: number;
  xpAwarded: number;
  // 1.00 unless the post-session quiz raised it. Shown, never recomputed here.
  quizMultiplier: number;
  cappedByDailyLimit: boolean;
  // Under MIN_SESSION_MS. A normal outcome, never an error.
  belowMinimum: boolean;
  levelUp: SessionLevelUp | null;
  streak: SessionStreak | null;
  // Only the id. Contents come from /api/cache/:id/open so the reveal stays a reveal.
  cache: { id: string } | null;
}

export interface DailySummary {
  creditedMs: number;
  sessionsStarted: number;
  // Completed today, oldest first. One lantern each on the idle screen.
  sessions: Array<{ creditedMs: number }>;
}
