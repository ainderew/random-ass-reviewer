import { LocalCliProvider } from './local-cli-provider';

describe('LocalCliProvider', () => {
  it('refuses to be constructed in production', () => {
    expect(() => new LocalCliProvider('production')).toThrow(
      /not be constructed in production/,
    );
  });

  it('constructs in development', () => {
    expect(new LocalCliProvider('development').name).toBe('local-cli');
  });
});
