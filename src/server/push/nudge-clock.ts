import { env } from '@/lib/env';
import { sendDueNudges, vapidKeys } from '@/server/services/push';

// The app runs as one container, so a timer inside it is the scheduler: no
// cron on the host, nothing to keep in step with deploys. Every quarter hour
// it sends whatever nudges are due; the database claim keeps a restart or a
// slow run from sending one twice. Production only, and only with keys.
const EVERY_MS = 15 * 60_000;
const FIRST_AFTER_MS = 60_000;

let started = false;
let running = false;

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await sendDueNudges();
  } catch (err) {
    console.error('[nudges] run failed', err);
  } finally {
    running = false;
  }
}

export function startNudgeClock(): void {
  if (started || env.NODE_ENV !== 'production' || env.E2E_TEST_MODE) return;
  if (!vapidKeys()) return;
  started = true;
  setTimeout(() => void tick(), FIRST_AFTER_MS).unref();
  setInterval(() => void tick(), EVERY_MS).unref();
}
