import { ClaudeCodeProvider } from './claude-code-provider';

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
});
