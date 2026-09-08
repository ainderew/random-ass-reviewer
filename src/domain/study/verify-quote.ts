// The hallucination guard. A card whose quote is not in its source was
// invented. Exact substring after normalisation, never fuzzy: fuzzy matching
// is precisely how fabrication slips through.

export function normalizeForMatch(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function quoteAppearsInSource(quote: string, source: string): boolean {
  const q = normalizeForMatch(quote);
  if (q.length === 0) return false;
  return normalizeForMatch(source).includes(q);
}
