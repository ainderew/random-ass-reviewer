// Runs once when the server starts. The study cat's nudge clock is Node
// only, so it is imported only in the Node runtime.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { startNudgeClock } = await import('@/server/push/nudge-clock');
  startNudgeClock();
}
