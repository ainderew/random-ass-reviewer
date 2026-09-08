import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from '@/server/errors';

type RouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};
type RouteHandler = (req: NextRequest, ctx: RouteContext) => Promise<Response>;

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function fail(
  code: string,
  message: string,
  status: number,
  headers: Record<string, string> = {},
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status, headers });
}

// Wrap every route handler with this. AppError becomes a shaped JSON error,
// Zod failures become 400s, and anything else is logged and hidden behind a
// generic 500 so internals never reach the client.
export function handleRoute(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      if (error instanceof AppError) {
        const headers: Record<string, string> = error.retryAfterSeconds
          ? { 'Retry-After': String(error.retryAfterSeconds) }
          : {};
        return fail(error.code, error.message, error.status, headers);
      }
      if (error instanceof ZodError)
        return fail('VALIDATION', 'Invalid request body', 400);
      console.error('[route]', req.method, req.nextUrl.pathname, error);
      return fail('INTERNAL', 'Something went wrong', 500);
    }
  };
}
