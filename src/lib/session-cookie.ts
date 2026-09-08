import type { NextRequest } from 'next/server';

// Auth.js names its session cookie by transport: `__Secure-` over https.
// A manual sign-in must set exactly the cookie Auth.js will look up.
export function sessionCookie(req: NextRequest): {
  name: string;
  secure: boolean;
} {
  const forwarded = req.headers.get('x-forwarded-proto');
  const secure = forwarded
    ? forwarded === 'https'
    : req.nextUrl.protocol === 'https:';
  return {
    name: secure ? '__Secure-authjs.session-token' : 'authjs.session-token',
    secure,
  };
}
