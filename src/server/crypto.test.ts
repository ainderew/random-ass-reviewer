import { decryptSecret, encryptSecret, maskSecret } from './crypto';

describe('crypto', () => {
  it('round-trips a secret and never stores it in the clear', () => {
    const plain = 'sk-ant-api03-example-key-0123456789abcdef7f3a';
    const stored = encryptSecret(plain);
    expect(stored).not.toContain('sk-ant');
    expect(decryptSecret(stored)).toBe(plain);
    expect(encryptSecret(plain)).not.toBe(stored);
  });

  it('masks to the first seven and last four characters', () => {
    expect(maskSecret('sk-ant-api03-example-key-0123456789abcdef7f3a')).toBe(
      'sk-ant-…7f3a',
    );
    expect(maskSecret('short')).toBe('…');
  });
});
