import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies the right password and refuses the wrong one, with a fresh salt each time', () => {
    const a = hashPassword('correct horse battery');
    const b = hashPassword('correct horse battery');
    expect(a).not.toBe(b);
    expect(verifyPassword('correct horse battery', a)).toBe(true);
    expect(verifyPassword('correct horse battery', b)).toBe(true);
    expect(verifyPassword('Correct horse battery', a)).toBe(false);
    expect(verifyPassword('anything', 'not-a-hash')).toBe(false);
  });
});
