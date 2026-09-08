import type { BrowserContext } from '@playwright/test';

// Development only: the seeded Auth.js session from the smoke-login memory.
// Real sign-in goes through Google and is not automated here.
export async function signInAsSmokeUser(
  context: BrowserContext,
): Promise<void> {
  await context.addCookies([
    {
      name: 'authjs.session-token',
      value: process.env.SMOKE_SESSION_TOKEN ?? 'smoke-token',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}
