import { ClaudeCodeProvider, isErrorResult } from './claude-code-provider';

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

  it('recognises an error returned as a successful result', () => {
    expect(
      isErrorResult(
        'Failed to authenticate: OAuth session expired and could not be refreshed',
      ),
    ).toBe(true);
    expect(
      isErrorResult('API Error: 400 Claude Code does not support this model'),
    ).toBe(true);
    expect(isErrorResult('{"cards":[]}')).toBe(false);
  });
});
