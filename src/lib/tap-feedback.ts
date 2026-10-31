import type { MouseEvent } from 'react';

// Only deliberate activation gets a short pulse. Visual feedback works on
// browsers without vibration support, including iPhone Safari.
export function tapFeedback(event: MouseEvent<HTMLElement>): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const control = target.closest('button, a[href]');
  if (!control || control.matches(':disabled, [aria-disabled="true"]')) return;
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  if (typeof navigator.vibrate !== 'function') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  try {
    navigator.vibrate(8);
  } catch {
    /* Feedback must never block an action. */
  }
}
