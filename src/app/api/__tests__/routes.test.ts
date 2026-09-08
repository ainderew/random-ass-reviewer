import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { initialCardState } from '@/domain/review/scheduler';
import { HEARTBEAT_INTERVAL_MS } from '@/domain/session/constants';
import { closeDb, db } from '@/server/db';
import { focusSessions, sessionHeartbeats, users } from '@/server/db/schema';
import { insertCards } from '@/server/repositories/card';
import { insertNoteChunks, insertNoteSource } from '@/server/repositories/note';
import { hitWindow } from '@/server/repositories/rate-limit';
import { RATE_LIMITS } from '@/server/services/rate-limit';
import { getReviewQueue, submitAnswer } from '@/server/services/review';
import { createUserWithDefaults } from '@/server/services/user-bootstrap';

// Routes are thin: what they uniquely own is auth, validation, error shaping,
// and what they leave out of the response. Auth is the only mock here.
jest.mock('@/server/auth', () => ({ auth: jest.fn() }));
jest.mock('@/server/services/review', () => {
  const actual = jest.requireActual<typeof import('@/server/services/review')>(
    '@/server/services/review',
  );
  return { ...actual, getReviewQueue: jest.fn(actual.getReviewQueue) };
});
import { auth } from '@/server/auth';
const authMock = auth as unknown as jest.Mock;

type Handler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

function request(method: string, path: string, body?: unknown): NextRequest {
  const canCarryBody = method !== 'GET' && method !== 'HEAD';
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: canCarryBody && body !== undefined ? JSON.stringify(body) : undefined,
  });
}
const ctx = (params: Record<string, string> = {}) => ({
  params: Promise.resolve(params),
});
const signedInAs = (id: string) => authMock.mockResolvedValue({ user: { id } });
const signedOut = () => authMock.mockResolvedValue(null);

async function call(
  handler: Handler,
  method: string,
  path: string,
  body?: unknown,
  params = {},
) {
  const response = await handler(request(method, path, body), ctx(params));
  return {
    status: response.status,
    headers: response.headers,
    body: await response.json(),
  };
}

const AUTHED_ROUTES: Array<
  [string, string, () => Promise<Record<string, Handler>>]
> = [
  ['POST', '/api/session/start', () => import('@/app/api/session/start/route')],
  ['POST', '/api/session/beat', () => import('@/app/api/session/beat/route')],
  ['POST', '/api/session/end', () => import('@/app/api/session/end/route')],
  [
    'GET',
    '/api/session/active',
    () => import('@/app/api/session/active/route'),
  ],
  ['GET', '/api/stats', () => import('@/app/api/stats/route')],
  ['GET', '/api/stats/weekly', () => import('@/app/api/stats/weekly/route')],
  ['GET', '/api/island', () => import('@/app/api/island/route')],
  ['POST', '/api/island/place', () => import('@/app/api/island/place/route')],
  ['GET', '/api/notes', () => import('@/app/api/notes/route')],
  ['POST', '/api/notes', () => import('@/app/api/notes/route')],
  ['GET', '/api/review/queue', () => import('@/app/api/review/queue/route')],
  ['POST', '/api/review/answer', () => import('@/app/api/review/answer/route')],
  [
    'GET',
    '/api/review/session-quiz',
    () => import('@/app/api/review/session-quiz/route'),
  ],
  ['GET', '/api/review/stats', () => import('@/app/api/review/stats/route')],
  [
    'GET',
    '/api/settings/api-key',
    () => import('@/app/api/settings/api-key/route'),
  ],
  [
    'GET',
    '/api/settings/usage',
    () => import('@/app/api/settings/usage/route'),
  ],
  ['GET', '/api/me', () => import('@/app/api/me/route')],
  ['PATCH', '/api/me', () => import('@/app/api/me/route')],
];

async function makeUser(tag: string): Promise<string> {
  const user = await createUserWithDefaults({
    id: 'ignored',
    email: `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
    emailVerified: null,
  });
  return user.id;
}

async function seedSession(userId: string, spanMs: number): Promise<string> {
  const now = Date.now();
  const [session] = await db
    .insert(focusSessions)
    .values({ userId, lootSeed: 'seed', startedAt: new Date(now - spanMs) })
    .returning();
  const beats = [];
  for (let at = now - spanMs, seq = 0; at <= now; at += HEARTBEAT_INTERVAL_MS) {
    beats.push({
      sessionId: session!.id,
      seq: seq++,
      at: new Date(at),
      focused: true,
    });
  }
  await db.insert(sessionHeartbeats).values(beats);
  return session!.id;
}

describe('API routes', () => {
  const created: string[] = [];
  afterAll(async () => {
    for (const id of created) await db.delete(users).where(eq(users.id, id));
    await closeDb();
  });

  it.each(AUTHED_ROUTES)(
    '%s %s answers 401 when signed out',
    async (method, path, load) => {
      signedOut();
      const handlers = await load();
      const { status, body } = await call(handlers[method]!, method, path, {});
      expect(status).toBe(401);
      expect(body).toEqual({
        error: { code: 'UNAUTHORIZED', message: 'Sign in required' },
      });
    },
  );

  it('answers 400 for a malformed body without echoing it', async () => {
    const userId = await makeUser('routes');
    created.push(userId);
    signedInAs(userId);
    const { POST } = await import('@/app/api/session/beat/route');
    const { status, body } = await call(POST, 'POST', '/api/session/beat', {
      seq: 'one',
    });
    expect(status).toBe(400);
    expect(body).toEqual({
      error: { code: 'VALIDATION', message: 'Invalid request body' },
    });
  });

  it('maps AppError codes to HTTP status and hides unexpected errors', async () => {
    const userId = await makeUser('errors');
    created.push(userId);
    signedInAs(userId);
    const { POST } = await import('@/app/api/session/end/route');
    const missing = await call(POST, 'POST', '/api/session/end', {
      sessionId: '00000000-0000-4000-8000-000000000000',
    });
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');

    const spy = (getReviewQueue as unknown as jest.Mock).mockRejectedValueOnce(
      new Error('connect postgres://aloft:secret@db/aloft'),
    );
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { GET } = await import('@/app/api/review/queue/route');
    const broken = await call(GET, 'GET', '/api/review/queue');
    expect(broken.status).toBe(500);
    expect(broken.body).toEqual({
      error: { code: 'INTERNAL', message: 'Something went wrong' },
    });
    expect(JSON.stringify(broken.body)).not.toContain('secret');
    expect(spy).toHaveBeenCalled();
    quiet.mockRestore();
  });

  it('derives the user from the session, never the body', async () => {
    const owner = await makeUser('owner');
    const intruder = await makeUser('intruder');
    created.push(owner, intruder);
    const sessionId = await seedSession(owner, 20 * 60_000);
    const { POST } = await import('@/app/api/session/end/route');

    signedInAs(intruder);
    const denied = await call(POST, 'POST', '/api/session/end', {
      sessionId,
      userId: owner,
    });
    expect(denied.status).toBe(404);

    signedInAs(owner);
    const ended = await call(POST, 'POST', '/api/session/end', {
      sessionId,
      userId: intruder,
    });
    expect(ended.status).toBe(200);
    expect(ended.body.data.focusAwarded).toBeGreaterThan(0);
    // No cache contents, no pity counter, no loot seed.
    expect(JSON.stringify(ended.body)).not.toMatch(
      /contents|pityCounter|lootSeed/,
    );
  });

  it('never puts the correct answer in the quiz response', async () => {
    const userId = await makeUser('quiz');
    created.push(userId);
    signedInAs(userId);
    const source = await insertNoteSource(db, {
      userId,
      kind: 'paste',
      title: 'q',
      contentHash: `q-${userId}`,
    });
    const [chunk] = await insertNoteChunks(db, [
      { sourceId: source.id, ordinal: 0, text: 't', tokenCount: 1 },
    ]);
    const deck = await insertCards(
      db,
      Array.from({ length: 6 }, (_, i) => ({
        userId,
        chunkId: chunk!.id,
        question: `Q${i}?`,
        answer: `A${i}`,
        sourceQuote: 't',
        tags: [],
        nextDueAt: new Date(),
        fsrsState: initialCardState(Date.now()),
      })),
    );
    for (const card of deck)
      await submitAnswer({ userId, cardId: card.id, rating: 3, elapsedMs: 1 });
    const sessionId = await seedSession(userId, 60_000);

    const { GET } = await import('@/app/api/review/session-quiz/route');
    const { status, body } = await call(
      GET,
      'GET',
      `/api/review/session-quiz?sessionId=${sessionId}`,
    );
    expect(status).toBe(200);
    expect(body.data.questions.length).toBeGreaterThan(0);
    for (const q of body.data.questions)
      expect(Object.keys(q).sort()).toEqual(['cardId', 'options', 'question']);
    expect(JSON.stringify(body)).not.toMatch(/correctIndex|"answer"/);
  });

  it('sets Retry-After when a limit is hit', async () => {
    const userId = await makeUser('limited');
    created.push(userId);
    signedInAs(userId);
    const { limit, windowMs } = RATE_LIMITS['settings:api-key'];
    for (let i = 0; i < limit; i += 1) {
      await hitWindow(db, {
        userId,
        bucket: 'settings:api-key',
        windowMs,
        now: new Date(),
      });
    }
    const { PUT } = await import('@/app/api/settings/api-key/route');
    const { status, headers, body } = await call(
      PUT,
      'PUT',
      '/api/settings/api-key',
      {
        apiKey: 'sk-ant-api03-whatever-000000000000',
      },
    );
    expect(status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(Number(headers.get('Retry-After'))).toBeGreaterThan(0);
  });
});
