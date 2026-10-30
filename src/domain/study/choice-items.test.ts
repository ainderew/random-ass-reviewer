import { generatedCardSchema, type GeneratedCard } from './card-schema';
import { parseChoiceItems, restoreChoiceItem } from './choice-items';
import { verifiedCards } from './verified-cards';

const PAGE = `Choose the best answer.

22. Which enzyme is most specific for the liver?
A. AST
B. ALT
C. GGT
D. ALP

23. A De Ritis ratio above 2 most suggests:
A. Viral hepatitis
B. Alcoholic liver disease
C. Obstructive jaundice
D. Gilbert syndrome

24. A long stem that wraps
onto a second line is:
a) One
b) Two
c) Three
d) Four

25. Which of the following is a cation?
A. Chloride
B. Sodium
C. Bicarbonate
D. Phosphate`;

const KEY = new Map([
  [22, 'B'],
  [23, 'B'],
  [24, 'C'],
  [25, 'B'],
]);

function card(fields: Partial<GeneratedCard>): GeneratedCard {
  return generatedCardSchema.parse({
    question: 'A De Ritis ratio above 2 most suggests which condition?',
    answer: 'Alcoholic liver disease',
    sourceQuote:
      'A De Ritis ratio above 2 most suggests:\nA. Viral hepatitis\nB. Alcoholic liver disease',
    difficulty: 'medium',
    questionType: 'own',
    tags: ['enzymes'],
    ...fields,
  });
}

const items = parseChoiceItems(PAGE);

describe('parseChoiceItems', () => {
  it('reads each stem and its options, whatever the option style', () => {
    expect(items.map((item) => item.number)).toEqual([22, 23, 24, 25]);
    expect(items[1]!.options[1]).toEqual({
      letter: 'B',
      text: 'Alcoholic liver disease',
    });
    expect(items[2]!.options[2]).toEqual({ letter: 'C', text: 'Three' });
  });

  it('joins a stem that wraps onto a second line', () => {
    expect(items[2]!.stem).toBe(
      'A long stem that wraps onto a second line is:',
    );
  });

  it('ignores numbered lists that have no options', () => {
    expect(
      parseChoiceItems('1. Stop the transfusion\n2. Call the lab'),
    ).toEqual([]);
  });
});

describe('restoreChoiceItem', () => {
  it("puts back the student's own stem, word for word", () => {
    const restored = restoreChoiceItem(card({}), items, KEY);
    expect(restored.question).toBe('A De Ritis ratio above 2 most suggests:');
  });

  it('corrects an answer that misreads the key, and blanks the explanations', () => {
    const restored = restoreChoiceItem(
      card({
        answer: 'Obstructive jaundice',
        quiz: {
          explanation: 'Because of the obstruction in the bile duct.',
          distractors: [
            { text: 'Viral hepatitis', explanation: '' },
            { text: 'Alcoholic liver disease', explanation: '' },
            { text: 'Gilbert syndrome', explanation: '' },
          ],
        },
      }),
      items,
      KEY,
    );
    expect(restored.answer).toBe('Alcoholic liver disease');
    expect(restored.quiz).toEqual({
      explanation: '',
      distractors: [
        { text: 'Viral hepatitis', explanation: '' },
        { text: 'Obstructive jaundice', explanation: '' },
        { text: 'Gilbert syndrome', explanation: '' },
      ],
    });
  });

  it('keeps a right answer and its explanations', () => {
    const quiz = {
      explanation: 'The notes tie a ratio above 2 to alcoholic liver disease.',
      distractors: [
        { text: 'Viral hepatitis', explanation: '' },
        { text: 'Obstructive jaundice', explanation: '' },
        { text: 'Gilbert syndrome', explanation: '' },
      ],
    };
    const restored = restoreChoiceItem(card({ quiz }), items, KEY);
    expect(restored.quiz).toEqual(quiz);
  });

  it('supplies the options when the model left them out', () => {
    const restored = restoreChoiceItem(card({ quiz: null }), items, KEY);
    expect(restored.quiz?.distractors).toHaveLength(3);
  });

  it('treats a wrapped option as the same answer', () => {
    const wrapped = parseChoiceItems(
      '1. Which accelerator?\nA. Caffeine-sodium\nbenzoate\nB. Methanol',
    );
    const restored = restoreChoiceItem(
      card({
        answer: 'Caffeine-sodium benzoate',
        sourceQuote: 'Which accelerator?\nA. Caffeine-sodium',
      }),
      wrapped,
      new Map([[1, 'A']]),
    );
    expect(restored.answer).toBe('Caffeine-sodium benzoate');
  });

  it('does not mistake 100 for 10', () => {
    const numbers = parseChoiceItems(
      '1. How many days?\nA. 10\nB. 100\nC. 5\nD. 7',
    );
    const restored = restoreChoiceItem(
      card({ answer: '100', sourceQuote: 'How many days?\nA. 10\nB. 100' }),
      numbers,
      new Map([[1, 'A']]),
    );
    expect(restored.answer).toBe('10');
  });

  it('keeps the named version of a stem that needs its options', () => {
    const named = 'Which of these ions is a cation?';
    const restored = restoreChoiceItem(
      card({
        question: named,
        answer: 'Sodium',
        sourceQuote:
          'Which of the following is a cation?\nA. Chloride\nB. Sodium',
      }),
      items,
      KEY,
    );
    expect(restored.question).toBe(named);
  });

  it('matches when the quote holds only the end of a long stem', () => {
    const restored = restoreChoiceItem(
      card({
        answer: 'Three',
        sourceQuote: 'onto a second line is:',
      }),
      items,
      KEY,
    );
    expect(restored.question).toBe(
      'A long stem that wraps onto a second line is:',
    );
  });

  it('keeps the stem but trusts the model when there is no key', () => {
    const restored = restoreChoiceItem(card({}), items, new Map());
    expect(restored).toMatchObject({
      question: 'A De Ritis ratio above 2 most suggests:',
      answer: 'Alcoholic liver disease',
    });
  });

  it('leaves new cards alone', () => {
    const generated = card({ questionType: 'recall', answer: 'Anything' });
    expect(restoreChoiceItem(generated, items, KEY)).toEqual(generated);
  });

  it('leaves a card that matches no item alone', () => {
    const stray = card({ sourceQuote: 'Something else entirely on the page.' });
    expect(restoreChoiceItem(stray, items, KEY)).toEqual(stray);
  });
});

describe('verifiedCards', () => {
  const candidate = {
    ...card({}),
    answer: 'Obstructive jaundice',
    tags: ['enzymes'],
  };

  it('drops a card whose quote is not on the page, before restoring anything', () => {
    const invented = {
      ...candidate,
      sourceQuote: 'A ratio above 2 is alcohol.',
    };
    expect(verifiedCards([invented], PAGE, KEY)).toEqual([]);
  });

  it('drops a new card whose answer only talks about the notes', () => {
    const declined = {
      ...candidate,
      questionType: 'recall' as const,
      answer: 'The notes state only that it is run; no reason is given.',
    };
    expect(verifiedCards([declined], PAGE, KEY)).toEqual([]);
  });

  it('keeps a card whose reference can be stripped', () => {
    const led = {
      ...candidate,
      questionType: 'recall' as const,
      answer: 'According to the notes, alcoholic liver disease.',
    };
    expect(verifiedCards([led], PAGE, KEY)).toHaveLength(1);
  });

  it("does not drop the student's own question for naming their notes", () => {
    const own = { ...candidate, answer: 'See my notes on enzymes.' };
    expect(verifiedCards([own], PAGE, KEY)).toHaveLength(1);
  });

  it('restores the cards that pass', () => {
    const [kept] = verifiedCards([candidate], PAGE, KEY);
    expect(kept).toMatchObject({
      question: 'A De Ritis ratio above 2 most suggests:',
      answer: 'Alcoholic liver disease',
    });
  });
});
