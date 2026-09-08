// Browser-side fetch wrapper for our own routes. Unwraps the `{ data }` envelope
// from handleRoute() and turns `{ error }` into a typed exception.

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

interface Envelope<T> {
  data?: T;
  error?: { code: string; message: string };
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init.headers },
  });
  const body = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok) {
    throw new ApiError(
      body?.error?.code ?? 'INTERNAL',
      body?.error?.message ?? response.statusText,
      response.status,
    );
  }
  return body?.data as T;
}

export function postJson<T>(path: string, payload: unknown = {}): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(payload) });
}
