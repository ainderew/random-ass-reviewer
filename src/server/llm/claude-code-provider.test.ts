import { ClaudeCodeProvider, isLoginFailure } from './claude-code-provider';

describe('ClaudeCodeProvider', () => {
  it('refuses production without the explicit opt-in, and accepts it with', () => {
    expect(() => new ClaudeCodeProvider('production', false)).toThrow(
      /ALLOW_CLAUDE_CODE_IN_PRODUCTION/,
    );
    expect(new ClaudeCodeProvider('production', true).name).toBe('claude-code');
    expect(new ClaudeCodeProvider('development', false).name).toBe(
      'claude-code',
    );
  });

  it('recognises an expired login returned as a successful result', () => {
    expect(
      isLoginFailure(
        'Failed to authenticate: OAuth session expired and could not be refreshed',
      ),
    ).toBe(true);
    expect(isLoginFailure('{"cards":[]}')).toBe(false);
  });
});
