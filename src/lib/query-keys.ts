// Shared between the server layout (hydration) and client hooks. No 'use client'
// here on purpose: a directive would turn these constants into client references.
export const statsQueryKey = ['stats'] as const;
export const islandQueryKey = ['island'] as const;
export const notesQueryKey = ['notes'] as const;
export const noteDetailKey = (sourceId: string) => ['notes', sourceId] as const;
export const reviewQueueKey = ['review', 'queue'] as const;
export const reviewStatsKey = ['review', 'stats'] as const;
export const sessionQuizKey = (sessionId: string) =>
  ['session-quiz', sessionId] as const;
export const profileQueryKey = ['profile'] as const;
