// Content is hashed after this so a re-upload with different line endings or
// trailing spaces still deduplicates.
export function normalizeContent(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function titleFromText(
  text: string,
  fallback = 'Untitled notes',
): string {
  const firstLine = text
    .split('\n')
    .map((l) => l.replace(/^#+\s*/, '').trim())
    .find((l) => l.length > 0);
  if (!firstLine) return fallback;
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
}
