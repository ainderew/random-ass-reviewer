// A chunk is cut for size, not sense, so it can open mid-table, under a heading
// it cannot see, or thousands of words from its answer key. This is what the
// model needs from the rest of the notes to read one chunk correctly. None of
// it is quotable: the quote check still runs against the chunk alone.

export interface PassageContext {
  section: string | null;
  before: string | null;
  answerKey: string | null;
  // Number to letter from the key that answers this chunk, held in it or not.
  keyLetters: Map<number, string>;
}

const BEFORE_CHARS = 300;
const MIN_KEY_ENTRIES = 5;
const CHARS_PER_CARD = 80;
const MIN_CARDS = 3;
const MAX_CARDS = 30;

const HEADING_LINE = /^(?:#{1,3}\s+\S.*|[A-Z][A-Z0-9 &,'/()-]{5,80})$/;
const KEY_LABEL =
  /^\W*(?:answer\s*keys?|key\s+answers?|key\s+to\s+corrections?|correct\s+answers?|answers?)\b\W*/i;
const KEY_ENTRY = /(?<!\d)(\d{1,3})\s*[.):=-]?\s*([a-e])\b/gi;
const WORDED_LETTER = /^\s*(\d{1,3})\s*[.):=-]\s*([a-e])\s*[-–:.)]\s/i;
// "1. B - Hexokinase". A line ending in ? or : is the next set's first question.
const WORDED_ENTRY = /^\s*\d{1,3}\s*[.):=-].*[^?:\s]\s*$/;

interface KeyBlock {
  start: number;
  end: number;
  entries: number;
  worded: boolean;
}

function entriesOnLine(line: string): number {
  const stripped = line.replace(KEY_ENTRY, '').replace(/[\s,;|/]/g, '');
  return stripped === '' ? (line.match(KEY_ENTRY)?.length ?? 0) : 0;
}

// Keys come as "1 B  2 C", as "1. B" on each line, or as "1. B - Hexokinase"
// under a label. A run of bare number-letter pairs needs no label.
function findAnswerKeys(text: string): KeyBlock[] {
  const blocks: KeyBlock[] = [];
  let open: KeyBlock | null = null;
  const close = () => {
    if (open && open.entries >= MIN_KEY_ENTRIES) blocks.push(open);
    open = null;
  };

  let offset = 0;
  for (const line of text.split('\n')) {
    const start = offset;
    offset += line.length + 1;
    if (!line.trim()) continue;

    const body = line.replace(KEY_LABEL, '');
    const labelled = body !== line;
    const entries = entriesOnLine(body);
    if (labelled && !line.includes('?') && (entries > 0 || body.length <= 30)) {
      close();
      open = { start, end: offset, entries, worded: entries === 0 };
    } else if (entries > 0) {
      open ??= { start, end: offset, entries: 0, worded: false };
      open.entries += entries;
      open.end = offset;
      open.worded = false;
    } else if (open?.worded && WORDED_ENTRY.test(line)) {
      open.entries += 1;
      open.end = offset;
    } else {
      close();
    }
  }
  close();
  return blocks;
}

function lettersIn(key: string): Map<number, string> {
  const letters = new Map<number, string>();
  for (const line of key.split('\n')) {
    const body = line.replace(KEY_LABEL, '');
    const worded = body.match(WORDED_LETTER);
    const pairs = entriesOnLine(body) > 0 ? [...body.matchAll(KEY_ENTRY)] : [];
    for (const [, number, letter] of worded ? [worded] : pairs) {
      letters.set(Number(number), letter!.toUpperCase());
    }
  }
  return letters;
}

function headingIn(text: string): string | null {
  const headings = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => HEADING_LINE.test(line));
  return headings.at(-1)?.replace(/^#+\s+/, '') ?? null;
}

function tailOf(text: string): string {
  if (text.length <= BEFORE_CHARS) return text;
  const tail = text.slice(-BEFORE_CHARS);
  const lineStart = tail.indexOf('\n');
  return lineStart === -1 ? tail.trim() : tail.slice(lineStart + 1).trim();
}

function startsWithHeading(text: string): boolean {
  return HEADING_LINE.test(text.split('\n', 1)[0]?.trim() ?? '');
}

// Cards are approved one at a time and the daily new-card limit is twenty, so a
// page that yields fifty cards is more than a student can use. Without a limit
// the model writes one for nearly every line; with one, it has to choose.
export function cardBudget(passage: string): number {
  const cards = Math.round(passage.length / CHARS_PER_CARD);
  return Math.min(MAX_CARDS, Math.max(MIN_CARDS, cards));
}

// One context per chunk, in chunk order. The key that answers a chunk is the
// first one at or after it, which keeps Set A and Set B apart when numbering
// restarts. A key the chunk already holds in full is left out.
export function passageContexts(
  chunks: Array<{ text: string }>,
): PassageContext[] {
  const joined = chunks.map((chunk) => chunk.text).join('\n\n');
  const keys = findAnswerKeys(joined);

  let start = 0;
  return chunks.map((chunk, index) => {
    const end = start + chunk.text.length;
    const key = keys.find((block) => block.end > start);
    const held = key && key.start >= start && key.end <= end + 1;
    const keyText = key ? joined.slice(key.start, key.end).trim() : null;
    const answerKey = held ? null : keyText;
    const keyLetters = lettersIn(keyText ?? '');
    start = end + 2;

    if (index === 0 || startsWithHeading(chunk.text))
      return { section: null, before: null, answerKey, keyLetters };
    const earlier = chunks.slice(0, index).reverse();
    return {
      section: earlier.map((c) => headingIn(c.text)).find(Boolean) ?? null,
      before: tailOf(chunks[index - 1]!.text),
      answerKey,
      keyLetters,
    };
  });
}
