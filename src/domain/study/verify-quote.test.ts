import { quoteAppearsInSource } from './verify-quote';

const source =
  'The facial nerve (CN VII) innervates the muscles of facial expression.\nDamage produces Bell’s palsy — a unilateral droop.';

describe('quoteAppearsInSource', () => {
  it('matches an exact quote', () => {
    expect(
      quoteAppearsInSource(
        'innervates the muscles of facial expression',
        source,
      ),
    ).toBe(true);
  });

  it('matches despite whitespace differences', () => {
    expect(
      quoteAppearsInSource('facial  expression.\n\nDamage   produces', source),
    ).toBe(true);
  });

  it('matches despite smart quotes and dash variants', () => {
    expect(
      quoteAppearsInSource("Bell's palsy - a unilateral droop", source),
    ).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(quoteAppearsInSource('THE FACIAL NERVE (cn vii)', source)).toBe(
      true,
    );
  });

  it('rejects a plausible paraphrase', () => {
    expect(
      quoteAppearsInSource(
        'CN VII supplies the facial expression muscles',
        source,
      ),
    ).toBe(false);
    expect(quoteAppearsInSource('damage causes Bell’s palsy', source)).toBe(
      false,
    );
  });

  it('rejects an empty quote', () => {
    expect(quoteAppearsInSource('   ', source)).toBe(false);
  });
});
