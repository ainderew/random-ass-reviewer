// How often the open timer asks the server for the time counted so far. It
// only refreshes the numbers on screen; missing a check-in loses nothing.
export const HEARTBEAT_INTERVAL_MS = 15_000;

export const MAX_SESSIONS_PER_DAY = 12;
