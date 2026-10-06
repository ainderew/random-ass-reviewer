import { closeDb } from '@/server/db';
import {
  advanceProgress,
  finishProgress,
  getProgress,
  queueProgress,
  startProgress,
} from './generation-progress';

describe('generation progress', () => {
  afterAll(() => closeDb());

  it('tracks a run in memory and reports finished with a message', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    startProgress(id, 3);
    advanceProgress(id, { cards: 4, rejected: 1 });
    advanceProgress(id, { failed: true });
    let status = await getProgress('u', id);
    expect(status).toMatchObject({
      totalChunks: 3,
      processedChunks: 2,
      failedChunks: 1,
      cardsCreated: 4,
      rejectedCards: 1,
      finished: false,
    });
    finishProgress(id, 'stopped');
    status = await getProgress('u', id);
    expect(status).toMatchObject({ finished: true, message: 'stopped' });
    // Unknown ids are ignored, never thrown on.
    advanceProgress('nope', { cards: 1 });
    finishProgress('nope');
  });

  it('reports a queued run as unfinished before its work starts', async () => {
    const id = '33333333-3333-4333-8333-333333333333';
    queueProgress(id, 4);
    expect(await getProgress('u', id)).toMatchObject({
      totalChunks: 4,
      processedChunks: 0,
      finished: false,
    });
    // A second queue while it runs keeps the run's counts.
    startProgress(id, 4);
    advanceProgress(id, { cards: 2 });
    queueProgress(id);
    expect(await getProgress('u', id)).toMatchObject({
      totalChunks: 4,
      cardsCreated: 2,
    });
    finishProgress(id);
    // A finished run makes way for the next one.
    queueProgress(id);
    expect(await getProgress('u', id)).toMatchObject({
      totalChunks: 0,
      cardsCreated: 0,
      finished: false,
    });
  });

  it('does not let an old run expire a newer one', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
    try {
      const id = '44444444-4444-4444-8444-444444444444';
      startProgress(id, 2);
      finishProgress(id);
      startProgress(id, 1);
      jest.advanceTimersByTime(5 * 60_000);
      expect(await getProgress('u', id)).toMatchObject({
        totalChunks: 1,
        finished: false,
      });
      finishProgress(id);
      jest.advanceTimersByTime(5 * 60_000);
    } finally {
      jest.useRealTimers();
    }
  });

  it('falls back to the database for a source it never saw', async () => {
    const status = await getProgress(
      'u',
      '22222222-2222-4222-8222-222222222222',
    );
    expect(status).toMatchObject({
      totalChunks: 0,
      finished: true,
      message: null,
    });
  });
});
