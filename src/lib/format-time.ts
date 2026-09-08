const pad = (n: number) => String(n).padStart(2, '0');

// MM:SS, or H:MM:SS once an hour has passed.
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

export function formatMinutes(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  return minutes === 1 ? '1 min' : `${minutes} min`;
}
