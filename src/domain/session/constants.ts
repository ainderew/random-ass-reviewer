export const HEARTBEAT_INTERVAL_MS = 15_000;

// A beat arriving sooner than this after the previous one is a script, not a browser.
export const MIN_BEAT_GAP_MS = HEARTBEAT_INTERVAL_MS / 2;

// Beyond this gap (sleep, suspension, network drop) credit only one interval.
export const MAX_BEAT_GAP_MS = 45_000;

// No heartbeat for this long and the session is swept to completed.
export const STALE_SESSION_MS = 5 * 60_000;

export const MAX_SESSIONS_PER_DAY = 12;

// Upper bound on rows loaded when a session ends. 8h at the fastest legal
// cadence is 3840 beats; anything past this is not creditable anyway.
export const MAX_HEARTBEATS_PER_SESSION = 4000;
