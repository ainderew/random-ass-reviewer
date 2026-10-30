import { cardBudget, passageContexts } from './passage-context';

const QUESTIONS = '1. Which tube for a CBC?\nA. Red\nB. Lavender';

function keyFor(chunks: string[], ordinal = 0): string | null {
  return passageContexts(chunks.map((text) => ({ text })))[ordinal]!.answerKey;
}

describe('answer keys', () => {
  it('hands a key in a later chunk to the questions before it', () => {
    const key = 'ANSWER KEY\n1 B   2 C   3 B   4 C   5 C   6 B';
    expect(keyFor([QUESTIONS, key])).toBe(key);
  });

  it('reads a key with one answer per line, with or without a label', () => {
    const lines = '1. B\n2. C\n3) A\n4 - D\n5: B\n6 a';
    expect(keyFor([QUESTIONS, lines])).toBe(lines);
    expect(keyFor([QUESTIONS, `Answers:\n${lines}`])).toContain('6 a');
  });

  it('reads a key on the same line as its label', () => {
    const key = 'Answers: 1-B, 2-C, 3-A, 4-D, 5-B';
    expect(keyFor([QUESTIONS, key])).toBe(key);
  });

  it('keeps worded answers only under a label', () => {
    const worded = [
      '1. B - Hexokinase',
      '2. C - Gray top',
      '3. B - 5-7%',
      '4. C - Diabetes mellitus',
      '5. C - 6-8 weeks',
    ].join('\n');
    expect(keyFor([QUESTIONS, `Key to Correction\n${worded}`])).toContain(
      'Diabetes mellitus',
    );
    expect(keyFor([QUESTIONS, worded])).toBeNull();
  });

  it('leaves out a key the chunk already holds', () => {
    const chunk = `${QUESTIONS}\n\nANSWER KEY\n1 B 2 C 3 B 4 C 5 C`;
    expect(keyFor([chunk, 'Some unrelated later notes.'])).toBeNull();
  });

  it('gives each set of questions the key that follows it', () => {
    const keyA = 'SET A KEY\nAnswer key\n1 B 2 C 3 B 4 C 5 C';
    const keyB = 'Answer key\n1 A 2 A 3 D 4 D 5 A';
    const chunks = [QUESTIONS, keyA, QUESTIONS, keyB];
    expect(keyFor(chunks, 0)).toContain('1 B 2 C');
    expect(keyFor(chunks, 2)).toContain('1 A 2 A');
  });

  it('stops a worded key at the next set of questions', () => {
    const worded = [
      'Answer key',
      '1. Hexokinase',
      '2. Gray top',
      '3. Lipase',
      '4. Bone',
      '5. Myoglobin',
    ].join('\n');
    const keyB = 'Answer key\n1 A 2 A 3 D 4 D 5 A';
    const chunks = [`${worded}\n\n1. Next stem:`, QUESTIONS, keyB];
    expect(keyFor(chunks, 1)).toBe(keyB);
  });

  it('joins a key that crosses a chunk boundary', () => {
    const contexts = passageContexts([
      { text: QUESTIONS },
      { text: 'ANSWER KEY\n1 B 2 C 3 B' },
      { text: '4 C 5 C 6 B' },
    ]);
    expect(contexts[0]!.answerKey).toBe(
      'ANSWER KEY\n1 B 2 C 3 B\n\n4 C 5 C 6 B',
    );
  });

  it('finds no key in ordinary notes', () => {
    const notes = [
      'Answers will be posted on Friday.',
      'What are the answers?',
      '1. Fasting for 8 hours',
      '2 a day is the usual dose',
      'Group A and 5 B cells were tested.',
    ].join('\n');
    expect(keyFor([QUESTIONS, notes])).toBeNull();
  });

  it('needs more than a couple of pairs to call something a key', () => {
    expect(keyFor([QUESTIONS, 'Answers\n1 B 2 C'])).toBeNull();
  });
});

describe('key letters', () => {
  const lettersFor = (chunks: string[], ordinal = 0) =>
    passageContexts(chunks.map((text) => ({ text })))[ordinal]!.keyLetters;

  it('reads pairs from a key in another chunk', () => {
    const letters = lettersFor([QUESTIONS, 'ANSWER KEY\n1 B 2 c 3 B 4 C 5 C']);
    expect(letters.get(1)).toBe('B');
    expect(letters.get(2)).toBe('C');
  });

  it('reads a key the chunk holds itself, which the prompt leaves out', () => {
    const [context] = passageContexts([
      { text: `${QUESTIONS}\n\nANSWER KEY\n1 B 2 C 3 B 4 C 5 C` },
    ]);
    expect(context!.answerKey).toBeNull();
    expect(context!.keyLetters.get(5)).toBe('C');
  });

  it('reads the letter from a worded key', () => {
    const worded = [1, 2, 3, 4, 5].map((n) => `${n}. B - Hexokinase`);
    const letters = lettersFor([QUESTIONS, `Answers\n${worded.join('\n')}`]);
    expect(letters.get(3)).toBe('B');
  });

  it('finds no letter in a key of plain words', () => {
    const worded = [1, 2, 3, 4, 5].map((n) => `${n}. A nerve of the face`);
    const letters = lettersFor([QUESTIONS, `Answers\n${worded.join('\n')}`]);
    expect(letters.size).toBe(0);
  });
});

describe('passage context', () => {
  const contexts = passageContexts([
    {
      text: '# Anemias\n\nIntro line.\n\nMORPHOLOGIC CLASSIFICATION\n\nTest | IDA',
    },
    { text: 'Serum iron | low' },
    { text: 'TIBC | high' },
    { text: '# Hemolysis\n\nRetic up.' },
  ]);

  it('gives the first chunk nothing to look back on', () => {
    expect(contexts[0]).toMatchObject({
      section: null,
      before: null,
      answerKey: null,
    });
  });

  it('carries the heading in force and the lines just before a cut', () => {
    expect(contexts[1]).toMatchObject({
      section: 'MORPHOLOGIC CLASSIFICATION',
      before: expect.stringContaining('Test | IDA'),
    });
    expect(contexts[2]!.section).toBe('MORPHOLOGIC CLASSIFICATION');
  });

  it('needs no context when a chunk opens on its own heading', () => {
    expect(contexts[3]).toMatchObject({ section: null, before: null });
  });

  it('keeps only the tail of a long chunk, from a line start', () => {
    const long = `${'x'.repeat(400)}\nLast line of the page.`;
    const [, next] = passageContexts([{ text: long }, { text: 'More.' }]);
    expect(next!.before).toBe('Last line of the page.');
  });
});

describe('cardBudget', () => {
  it('grows with the passage, within a floor and a ceiling', () => {
    expect(cardBudget('short')).toBe(3);
    expect(cardBudget('x'.repeat(1600))).toBe(20);
    expect(cardBudget('x'.repeat(8000))).toBe(30);
  });
});
