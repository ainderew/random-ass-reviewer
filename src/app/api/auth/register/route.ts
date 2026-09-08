import { NextResponse } from 'next/server';
import { registerRequestSchema } from '@/domain/types';
import { handleRoute } from '@/lib/api-response';
import { sessionCookie } from '@/lib/session-cookie';
import { registerWithPassword } from '@/server/services/credentials';

export const POST = handleRoute(async (req) => {
  const body = registerRequestSchema.parse(await req.json());
  const signedIn = await registerWithPassword(body);
  const cookie = sessionCookie(req);
  const response = NextResponse.json({ data: { ok: true } }, { status: 201 });
  response.cookies.set(cookie.name, signedIn.sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookie.secure,
    path: '/',
    expires: signedIn.expires,
  });
  return response;
});
