import {
  joinExplanations,
  validQuizContent,
  type QuizContent,
} from './quiz-content';

const quiz = (explanation: string, wrong = ''): QuizContent => ({
  explanation,
  distractors: ['Heparin', 'Sodium citrate', 'Sodium fluoride'].map((text) => ({
    text,
    explanation: wrong,
  })),
});

describe('validQuizContent', () => {
  it('keeps options from the notes when nothing explains them', () => {
    expect(validQuizContent('EDTA', quiz(''))).toBe(true);
    expect(
      validQuizContent('EDTA', quiz('EDTA keeps cells intact for counting.')),
    ).toBe(true);
  });

  it('refuses a token explanation and a repeated answer', () => {
    expect(validQuizContent('EDTA', quiz('Because.'))).toBe(false);
    expect(validQuizContent('EDTA', quiz('', 'No.'))).toBe(false);
    expect(validQuizContent('heparin', quiz(''))).toBe(false);
  });
});

describe('joinExplanations', () => {
  it('joins what was explained and skips what was not', () => {
    expect(joinExplanations('Heparin clumps cells.', 'EDTA is right.')).toBe(
      'Heparin clumps cells. EDTA is right.',
    );
    expect(joinExplanations('', 'EDTA is right.')).toBe('EDTA is right.');
    expect(joinExplanations(undefined, '  ')).toBe('');
  });
});
