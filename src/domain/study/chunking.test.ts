import { chunkText } from './chunking';

// Four characters per token is close enough for a unit test.
const estimateTokens = (s: string) => Math.ceil(s.length / 4);
const words = (n: number, w = 'word') =>
  Array.from({ length: n }, (_, i) => `${w}${i}`).join(' ');

describe('chunkText', () => {
  it('returns nothing for empty input', () => {
    expect(
      chunkText({
        text: '  \n ',
        targetTokens: 100,
        maxTokens: 150,
        estimateTokens,
      }),
    ).toEqual([]);
  });

  it('splits on markdown headings when present', () => {
    const text = `# One\n${words(120)}\n\n## Two\n${words(120)}\n\n### Three\n${words(120)}`;
    const chunks = chunkText({
      text,
      targetTokens: 250,
      maxTokens: 400,
      minTokens: 50,
      estimateTokens,
    });
    expect(chunks.map((c) => c.text.split('\n')[0])).toEqual([
      '# One',
      '## Two',
      '### Three',
    ]);
  });

  it('falls back to paragraphs, then sentences, then a hard split', () => {
    const paragraphs = Array.from({ length: 6 }, (_, i) =>
      words(60, `p${i}w`),
    ).join('\n\n');
    const byParagraph = chunkText({
      text: paragraphs,
      targetTokens: 150,
      maxTokens: 220,
      minTokens: 20,
      estimateTokens,
    });
    expect(byParagraph.length).toBeGreaterThan(1);
    for (const c of byParagraph) expect(c.text.startsWith('p')).toBe(true);

    const sentences = Array.from(
      { length: 12 },
      (_, i) => `Sentence ${i} says ${words(20, `s${i}w`)}.`,
    ).join(' ');
    const bySentence = chunkText({
      text: sentences,
      targetTokens: 120,
      maxTokens: 160,
      minTokens: 20,
      estimateTokens,
    });
    expect(bySentence.length).toBeGreaterThan(1);
    for (const c of bySentence) expect(c.text.endsWith('.')).toBe(true);

    const blob = 'x'.repeat(2000);
    const hard = chunkText({
      text: blob,
      targetTokens: 100,
      maxTokens: 150,
      minTokens: 20,
      estimateTokens,
    });
    expect(hard.length).toBeGreaterThan(1);
  });

  it('never emits a chunk over maxTokens', () => {
    const text = Array.from(
      { length: 40 },
      (_, i) => `# H${i}\n${words(90, `h${i}w`)}`,
    ).join('\n\n');
    for (const c of chunkText({
      text,
      targetTokens: 300,
      maxTokens: 350,
      estimateTokens,
    })) {
      expect(estimateTokens(c.text)).toBeLessThanOrEqual(350);
    }
  });

  it('merges undersized fragments instead of emitting a lone heading', () => {
    const text = `# Intro\n\n# Chapter\n${words(120)}`;
    const chunks = chunkText({
      text,
      targetTokens: 200,
      maxTokens: 400,
      minTokens: 50,
      estimateTokens,
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.text).toContain('# Intro');
  });

  it('keeps ordinals in order and loses no content', () => {
    const paragraphs = Array.from({ length: 10 }, (_, i) =>
      words(50, `q${i}w`),
    );
    const chunks = chunkText({
      text: paragraphs.join('\n\n'),
      targetTokens: 120,
      maxTokens: 200,
      minTokens: 20,
      estimateTokens,
    });
    expect(chunks.map((c) => c.ordinal)).toEqual(chunks.map((_, i) => i));
    const joined = chunks.map((c) => c.text).join(' ');
    for (const p of paragraphs)
      for (const w of p.split(' ')) expect(joined).toContain(w);
    expect(joined.indexOf('q0w0')).toBeLessThan(joined.indexOf('q9w0'));
  });
});
