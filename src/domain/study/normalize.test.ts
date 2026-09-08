import { normalizeContent, titleFromText } from './normalize';

describe('normalizeContent', () => {
  it('unifies line endings, trims trailing spaces, and collapses blank runs', () => {
    expect(normalizeContent('a  \r\nb\t\r\n\r\n\r\n\r\nc\n')).toBe('a\nb\n\nc');
  });

  it('is idempotent', () => {
    const once = normalizeContent('  x \n\n\n y  ');
    expect(normalizeContent(once)).toBe(once);
  });
});

describe('titleFromText', () => {
  it('uses the first non-empty line without heading markers', () => {
    expect(titleFromText('\n\n## Cranial nerves\nbody')).toBe('Cranial nerves');
  });

  it('truncates long first lines with an ellipsis', () => {
    const title = titleFromText('x'.repeat(100));
    expect(title).toHaveLength(78);
    expect(title.endsWith('…')).toBe(true);
  });

  it('falls back when there is nothing to use', () => {
    expect(titleFromText('   \n  ')).toBe('Untitled notes');
    expect(titleFromText('', 'Photographed notes')).toBe('Photographed notes');
  });
});
