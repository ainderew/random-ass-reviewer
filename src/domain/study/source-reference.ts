// Cards are reviewed weeks later, away from the notes, so "According to the
// notes, ..." on a card is noise. The prompt forbids it; this strips what still
// slips through at the start or end of a question or answer. A reference in the
// middle of a sentence is left for the student to edit.

const SOURCE = String.raw`(?:the|these|this|your|my)(?: (?:student's|given|provided|above|lecture))? (?:notes?|passage|text|lecture|reading|source|material|handout|module|reviewer)`;
const VERB = String.raw`(?:according to|based on|as (?:stated|described|mentioned|noted|discussed|explained|given) in|per)`;

// The comma is required up front so "Based on the reading frame, ..." survives.
const LEADING = new RegExp(String.raw`^(?:${VERB}|from|in) ${SOURCE},\s*`, 'i');
const TRAILING = new RegExp(
  String.raw`,?\s+${VERB} ${SOURCE}(?=\s*[?.!]?$)`,
  'i',
);

export function withoutSourceReference(text: string): string {
  const trimmed = text.trim();
  const afterLead = trimmed.replace(LEADING, '');
  const rest = afterLead.replace(TRAILING, '').trim();
  if (rest.length === 0) return trimmed;
  // A dropped lead leaves "what is...". Capitalise it, but keep "pH" and "mRNA".
  return afterLead !== trimmed && /^[a-z]+\b/.test(rest)
    ? rest.charAt(0).toUpperCase() + rest.slice(1)
    : rest;
}
