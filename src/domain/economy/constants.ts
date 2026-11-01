// Eight-hour guardrail on creditable time per day.
export const DAILY_CREDITABLE_MS = 8 * 60 * 60 * 1000;
// Five minutes qualify a session for the daily streak.
export const MIN_SESSION_MS = 5 * 60 * 1000;
// Suggest a break after fifty minutes.
export const BREAK_PROMPT_MS = 50 * 60 * 1000;
