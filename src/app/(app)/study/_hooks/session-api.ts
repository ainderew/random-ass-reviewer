import type {
  HeartbeatRequest,
  HeartbeatResult,
  QuizAnswerRequest,
  QuizProgress,
  QuizResult,
  SessionQuiz,
  SessionResult,
  SessionSnapshot,
} from '@/domain/types';
import { apiFetch, postJson } from '@/lib/api-client';

// Note what is absent from every payload: time. The server owns the clock.
export const fetchActiveSession = () =>
  apiFetch<SessionSnapshot | null>('/api/session/active');
export const requestStartSession = () =>
  postJson<SessionSnapshot>('/api/session/start');
export const sendHeartbeat = (body: HeartbeatRequest) =>
  postJson<HeartbeatResult>('/api/session/beat', body);
export const requestEndSession = (sessionId: string) =>
  postJson<SessionResult>('/api/session/end', { sessionId });
export const fetchSessionQuiz = (sessionId: string) =>
  apiFetch<SessionQuiz>(`/api/review/session-quiz?sessionId=${sessionId}`);
export const answerQuiz = (body: QuizAnswerRequest) =>
  postJson<QuizProgress>('/api/review/session-quiz/answer', body);
export const finishQuiz = (sessionId: string) =>
  postJson<QuizResult>('/api/review/session-quiz', { sessionId });
