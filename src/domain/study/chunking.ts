export interface Chunk {
  ordinal: number;
  text: string;
}

export interface ChunkOptions {
  text: string;
  // ~1500. Where a chunk would like to end.
  targetTokens: number;
  // ~2000. A chunk never exceeds this.
  maxTokens: number;
  // Below this a chunk is merged into a neighbour; a lone heading generates nothing.
  minTokens?: number;
  // Injected so the domain stays pure. The service passes a real counter.
  estimateTokens: (text: string) => number;
}

const HEADING = /^(#{1,3})\s+\S/;

// Split priority: markdown headings, blank-line paragraphs, sentences, and a
// hard character split as the last resort. Cutting mid-sentence produces
// cards that quote half a thought, so the cheap boundaries come first.
export function chunkText(options: ChunkOptions): Chunk[] {
  const { targetTokens, maxTokens, estimateTokens } = options;
  const minTokens = options.minTokens ?? 100;
  const text = options.text.replace(/\r\n/g, '\n').trim();
  if (!text) return [];

  const sections = splitOnHeadings(text);
  const pieces: string[] = [];
  for (const section of sections) {
    pieces.push(
      ...packUnits(
        splitParagraphs(section),
        targetTokens,
        maxTokens,
        estimateTokens,
      ),
    );
  }

  const merged = mergeSmall(pieces, minTokens, maxTokens, estimateTokens);
  return merged.map((chunk, ordinal) => ({ ordinal, text: chunk }));
}

function splitOnHeadings(text: string): string[] {
  const lines = text.split('\n');
  const sections: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (HEADING.test(line) && current.some((l) => l.trim())) {
      sections.push(current.join('\n').trim());
      current = [];
    }
    current.push(line);
  }
  if (current.some((l) => l.trim())) sections.push(current.join('\n').trim());
  return sections;
}

function splitParagraphs(section: string): string[] {
  return section
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function splitSentences(paragraph: string): string[] {
  return paragraph
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hardSplit(
  text: string,
  maxTokens: number,
  estimate: (s: string) => number,
): string[] {
  const tokens = estimate(text);
  if (tokens <= maxTokens) return [text];
  const parts = Math.ceil(tokens / maxTokens);
  const size = Math.ceil(text.length / parts);
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size)
    out.push(text.slice(i, i + size).trim());
  return out.filter(Boolean);
}

// Greedy packing of units up to the target; oversized units break down a level.
function packUnits(
  units: string[],
  targetTokens: number,
  maxTokens: number,
  estimate: (s: string) => number,
): string[] {
  const out: string[] = [];
  let buffer: string[] = [];
  let bufferTokens = 0;

  const flush = () => {
    if (buffer.length) out.push(buffer.join('\n\n'));
    buffer = [];
    bufferTokens = 0;
  };

  for (const unit of units) {
    const unitTokens = estimate(unit);
    if (unitTokens > maxTokens) {
      flush();
      const sentences = splitSentences(unit);
      const smaller =
        sentences.length > 1 ? sentences : hardSplit(unit, maxTokens, estimate);
      const packed =
        sentences.length > 1
          ? packUnits(smaller, targetTokens, maxTokens, estimate)
          : smaller.flatMap((s) => hardSplit(s, maxTokens, estimate));
      out.push(...packed);
      continue;
    }
    if (bufferTokens + unitTokens > targetTokens && buffer.length) flush();
    buffer.push(unit);
    bufferTokens += unitTokens;
  }
  flush();
  return out;
}

// Undersized chunks join a neighbour when that stays under max. Content is
// never dropped: a short note is still a note.
function mergeSmall(
  chunks: string[],
  minTokens: number,
  maxTokens: number,
  estimate: (s: string) => number,
): string[] {
  const out: string[] = [];
  for (const chunk of chunks) {
    const last = out[out.length - 1];
    if (
      last !== undefined &&
      (estimate(chunk) < minTokens || estimate(last) < minTokens)
    ) {
      const joined = `${last}\n\n${chunk}`;
      if (estimate(joined) <= maxTokens) {
        out[out.length - 1] = joined;
        continue;
      }
    }
    out.push(chunk);
  }
  return out;
}
