import { NextResponse } from 'next/server';
import { credentialsSchema } from '@/domain/types';
import { handleRoute } from '@/lib/api-response';
import { sessionCookie } from '@/lib/session-cookie';
import { signInWithPassword } from '@/server/services/credentials';

export const POST = handleRoute(async (req) => {
  const body = credentialsSchema.parse(await req.json());
  const signedIn = await signInWithPassword(body);
  const cookie = sessionCookie(req);
  const response = NextResponse.json({ data: { ok: true } });
  response.cookies.set(cookie.name, signedIn.sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookie.secure,
    path: '/',
    expires: signedIn.expires,
  });
  return response;
});
