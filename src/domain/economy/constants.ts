export const FOCUS_PER_MINUTE = 10;

// 8h guardrail on creditable time per day.
export const DAILY_CREDITABLE_MS = 8 * 60 * 60 * 1000;

// Sessions under 5 minutes pay nothing.
export const MIN_SESSION_MS = 5 * 60 * 1000;

// Suggest a break after 50 minutes.
export const BREAK_PROMPT_MS = 50 * 60 * 1000;

// Level curve: xpForLevel(n) = XP_BASE * n ^ XP_EXPONENT.
export const XP_BASE = 100;
export const XP_EXPONENT = 1.5;
export const MAX_LEVEL = 100;

// Credit for completing a scheduled retrieval attempt.
export const INSIGHT_PER_REVIEW = 3;
// Per correct answer in the post-session quiz.
export const INSIGHT_PER_QUIZ_CORRECT = 3;
