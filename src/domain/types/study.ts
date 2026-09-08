import { z } from 'zod';

export const NOTE_KINDS = ['paste', 'markdown', 'pdf', 'image'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export interface NoteSource {
  id: string;
  userId: string;
  kind: NoteKind;
  title: string;
  contentHash: string;
  createdAt: Date;
}

export interface NoteChunk {
  id: string;
  sourceId: string;
  ordinal: number;
  text: string;
  tokenCount: number;
}

// FSRS: 1 Again, 2 Hard, 3 Good, 4 Easy.
export const RATINGS = [1, 2, 3, 4] as const;
export type Rating = (typeof RATINGS)[number];

// The ts-fsrs card, JSON-safe (dates as ISO strings). Only next_due_at is
// promoted to a column; nothing else is ever filtered on.
export const FSRS_STATES = [0, 1, 2, 3] as const; // New, Learning, Review, Relearning
export const fsrsStateSchema = z.object({
  due: z.string(),
  stability: z.number(),
  difficulty: z.number(),
  elapsed_days: z.number(),
  scheduled_days: z.number(),
  learning_steps: z.number(),
  reps: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
  state: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  last_review: z.string().nullable().optional(),
});
export type FsrsState = z.infer<typeof fsrsStateSchema>;

export interface Card {
  id: string;
  userId: string;
  chunkId: string;
  question: string;
  answer: string;
  // Must appear verbatim in the parent chunk.
  sourceQuote: string;
  tags: string[];
  nextDueAt: Date;
  fsrsState: FsrsState;
  suspended: boolean;
}

export interface CardReview {
  id: string;
  cardId: string;
  sessionId: string | null;
  reviewedAt: Date;
  rating: Rating;
  elapsedMs: number;
}

export const reviewAnswerRequestSchema = z.object({
  cardId: z.uuid(),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  elapsedMs: z.number().int().nonnegative(),
});
export type ReviewAnswerRequest = z.infer<typeof reviewAnswerRequestSchema>;

export const createNoteRequestSchema = z.object({
  kind: z.literal('paste'),
  title: z.string().max(120).optional(),
  text: z.string().min(1).max(200_000),
});
export type CreateNoteRequest = z.infer<typeof createNoteRequestSchema>;

export interface CreateNoteResponse {
  sourceId: string;
  deduplicated: boolean;
}

export interface NoteSourceSummary {
  id: string;
  kind: NoteKind;
  title: string;
  createdAt: Date;
  chunkCount: number;
  cardCount: number;
}

export interface GenerationStatus {
  sourceId: string;
  totalChunks: number;
  processedChunks: number;
  failedChunks: number;
  cardsCreated: number;
  rejectedCards: number;
  finished: boolean;
  message: string | null;
}

export interface NoteDetail {
  source: NoteSource;
  chunks: NoteChunk[];
  cards: Card[];
  status: GenerationStatus;
}

export const updateCardRequestSchema = z.object({
  question: z.string().min(1).max(300),
  answer: z.string().min(1).max(1000),
});
export type UpdateCardRequest = z.infer<typeof updateCardRequestSchema>;

export const setApiKeyRequestSchema = z.object({
  apiKey: z.string().startsWith('sk-ant-').min(20).max(300),
});

export interface ApiKeyStatus {
  configured: boolean;
  masked: string | null;
}

export interface UsageSummary {
  month: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  quotaCents: number;
  byok: boolean;
}
