// Projected FSRS intervals for rating buttons. Short and honest.
export function formatInterval(days: number): string {
  const minutes = days * 24 * 60;
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (days < 1) return `${Math.round(minutes / 60)} h`;
  if (days < 21) return `${Math.round(days)} d`;
  if (days < 90) return `${Math.round(days / 7)} wk`;
  if (days < 730) return `${Math.round(days / 30)} mo`;
  return `${(days / 365).toFixed(1)} y`;
}
