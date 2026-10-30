import { mentionsNotes, withoutSourceReference } from './source-reference';

describe('withoutSourceReference', () => {
  it('drops a leading reference and capitalises what follows', () => {
    expect(
      withoutSourceReference(
        'According to the notes, what is the normal pH of blood?',
      ),
    ).toBe('What is the normal pH of blood?');
    expect(
      withoutSourceReference('Based on the lecture notes, define hemostasis.'),
    ).toBe('Define hemostasis.');
    expect(
      withoutSourceReference('In the passage, which cells make antibodies?'),
    ).toBe('Which cells make antibodies?');
  });

  it('keeps the case of a term that starts with a lowercase letter', () => {
    expect(
      withoutSourceReference(
        'According to the text, pH below 7.35 means what?',
      ),
    ).toBe('pH below 7.35 means what?');
    expect(
      withoutSourceReference('As stated in the notes, mRNA is read 5 to 3.'),
    ).toBe('mRNA is read 5 to 3.');
  });

  it('drops a trailing reference and keeps the question mark', () => {
    expect(
      withoutSourceReference(
        'What does CN VII innervate, according to the notes?',
      ),
    ).toBe('What does CN VII innervate?');
    expect(
      withoutSourceReference(
        'Which tube is used for coagulation per the reviewer',
      ),
    ).toBe('Which tube is used for coagulation');
  });

  it('leaves ordinary questions alone', () => {
    const plain = 'Based on the reading frame, which amino acid comes first?';
    expect(withoutSourceReference(plain)).toBe(plain);
    expect(withoutSourceReference('  What is CN VII?  ')).toBe(
      'What is CN VII?',
    );
    expect(
      withoutSourceReference('What is described in the notes on hemostasis?'),
    ).toBe('What is described in the notes on hemostasis?');
  });

  it('never empties a card', () => {
    expect(withoutSourceReference('According to the notes, ')).toBe(
      'According to the notes,',
    );
  });
});

describe('mentionsNotes', () => {
  it('finds a reference left in the middle of a sentence', () => {
    expect(mentionsNotes('The notes state only that it is run.')).toBe(true);
    expect(mentionsNotes('No reason appears in the passage here.')).toBe(true);
  });

  it('ignores a reference the strip removes', () => {
    expect(mentionsNotes('According to the notes, EDTA.')).toBe(false);
  });

  it('leaves ordinary medical wording alone', () => {
    expect(mentionsNotes('The source of the bleeding was the reading.')).toBe(
      false,
    );
  });
});
