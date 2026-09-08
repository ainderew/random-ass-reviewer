# Phase 6: Notes Ingestion + AI Card Generation

> **Feature:** Aloft — 3D Study Game
> **Phase:** 6 of 9
> **Depends on:** `01-phase-foundation.md`
> **Estimated scope:** Large (4–5 hours)

## Context from Previous Phase

**What Aloft is:** a web app that turns studying into a game. Students run verified focus sessions; verified minutes pay **Focus ⚡** and correct recall pays **Insight 💎**. Both are spent building a persistent 3D floating island.

**This phase is independent of the game.** It only depends on Phase 1's foundation. It can be built in parallel with Phases 2–5, or moved earlier if you want to validate the notes→flashcards value proposition before the game exists.

**Phase 1** built the skeleton: Next.js 15 App Router, React 19, TypeScript strict, Tailwind, Drizzle + Neon Postgres, Auth.js v5 with Google. Four layers enforced by ESLint — `app → server → domain`, `domain` imports nothing, `game` never imports `server`.

**Files that matter for this phase:**
- `src/lib/env.ts` — Zod-validated `env` object. **Already declares `ANTHROPIC_API_KEY` (optional) and `LLM_PROVIDER` (enum `'anthropic-api' | 'byok' | 'local-cli'`, default `'anthropic-api'`).** Never read `process.env` anywhere else.
- `src/lib/api-response.ts` — `handleRoute()` wrapper; every route handler uses it
- `src/server/errors.ts` — `AppError` with codes `UNAUTHORIZED | NOT_FOUND | INVALID_STATE | INSUFFICIENT_FUNDS | RATE_LIMITED | VALIDATION`
- `src/server/auth.ts` — `auth()` returns the session with `user.id`
- `src/server/llm/` — **empty directory created in Phase 1. This phase fills it.**
- `src/server/repositories/note.ts` and `card.ts` — created in Phase 1, currently minimal
- `src/domain/types/study.ts` — `NoteSource`, `NoteChunk`, `Card`, `CardReview`, `Rating` types already defined
- `src/app/(app)/notes/page.tsx` — **placeholder. This phase replaces it.**

**Database tables relevant to this phase** (already migrated in Phase 1):

`note_sources` — `id` uuid PK, `user_id`, `kind` enum `('paste','markdown','pdf','image')`, `title`, `content_hash` text, `created_at`.
**Unique index on `(user_id, content_hash)`** — prevents paying twice to process identical notes.

`note_chunks` — `id` uuid PK, `source_id` FK cascade, `ordinal` int, `text`, `token_count` int.

`cards` — `id` uuid PK, `user_id`, `chunk_id` FK cascade, `question`, `answer`, **`source_quote` text not null**, `tags` text[], `next_due_at` timestamptz, `fsrs_state` jsonb, `suspended` bool.

`llm_usage` — PK `(user_id, month)`, `input_tokens`, `output_tokens`, `cost_cents`.

## Existing Codebase Context

- `src/server/repositories/note.ts` — extend; the only place allowed to query `note_sources` / `note_chunks`
- `src/server/repositories/card.ts` — extend; the only place allowed to query `cards`
- `src/lib/env.ts` — add `ANTHROPIC_MODEL_*` entries here, not inline `process.env`
- `src/app/(app)/study/_components/focus-timer.tsx` — the reference for how this project structures a client component under a Server Component page

## Objective

Build the pipeline that turns a student's own notes into flashcards: ingestion (paste / markdown / PDF / photos of handwriting), semantic chunking, AI generation with a hallucination guard, and cost control.

Sequenced after the foundation and before Phase 7 because the review system has nothing to schedule until cards exist.

**Start with the `LlmProvider` interface before writing any ingestion or UI code.** Everything downstream depends on that abstraction, and building ingestion against a concrete Anthropic client will need unwinding.

---

## The LLM provider situation — read this first

The product ships publicly, which constrains authentication:

| Provider | Auth | Where it runs | Purpose |
|---|---|---|---|
| `AnthropicApiProvider` | Platform API key from `env.ANTHROPIC_API_KEY` | Production | The shipped path. Metered per user against `llm_usage`. |
| `ByokProvider` | The user's own API key, encrypted at rest | Production | Power users pay their own way; no quota applied |
| `LocalCliProvider` | Your Claude Max subscription via the local `claude` CLI | **Dev only** | Your own local development and testing |

**`LocalCliProvider` must be hard-gated:**
```ts
if (env.LLM_PROVIDER === 'local-cli' && env.NODE_ENV === 'production') {
  throw new Error('local-cli provider is not permitted in production');
}
```

Anthropic does not permit third-party products to authenticate *other users* through a Pro/Max subscription. Your subscription backs your own development; production users go through the API. This gives you both paths you wanted, correctly.

## Architecture Decisions

### Decision: One `LlmProvider` interface, three implementations
- **Choice:** A single narrow interface. Services depend on the interface; a factory resolves the implementation from `env.LLM_PROVIDER` and the user's BYOK status.
- **Alternatives considered:** Importing the Anthropic SDK directly in the generation service
- **Rationale:** Dependency Inversion. Phase 9 tests the generation pipeline against a fake provider with zero network calls, and swapping providers per-user (BYOK) becomes a factory decision rather than a branch scattered through the service.
- **Tradeoff:** The interface must stay narrow enough that all three implementations can satisfy it. That is a feature — it stops provider-specific features leaking into the domain.

### Decision: Structured output via `messages.parse()` + Zod, not prompt-and-parse
- **Choice:** `client.messages.parse()` with `zodOutputFormat(CardBatchSchema)` from `@anthropic-ai/sdk/helpers/zod`. The response arrives already validated as a typed object.
- **Alternatives considered:** Asking for JSON in the prompt and running `JSON.parse`; strict tool use
- **Rationale:** Schema conformance is enforced at the API layer. No brittle parsing, no "the model wrapped it in a markdown fence" failures.
- **Tradeoff:** `output_config.format` is **incompatible with the Citations feature** (returns 400). That's why the hallucination guard is a `sourceQuote` field validated in our own code rather than API-native citations. Also: new schemas incur a one-time compilation cost, then a 24-hour cache — keep the schema stable.

### Decision: The hallucination guard is a verbatim `sourceQuote`, checked in our code
- **Choice:** Every generated card carries a `sourceQuote`. After generation, verify the quote appears verbatim (after whitespace normalization) in its parent chunk. Reject cards that fail.
- **Alternatives considered:** Trusting the model; using the Citations API
- **Rationale:** Cheapest, most effective hallucination guard available — a card whose quote isn't in the source was invented. Citations can't be used here because they're incompatible with structured outputs.
- **Tradeoff:** A card can still be *wrong* while quoting correctly. This catches fabrication, not misinterpretation. Good enough, and the alternative is a second LLM call per card.

### Decision: Prompt caching with the stable prefix first
- **Choice:** The system prompt (generation instructions + few-shot examples) carries `cache_control: { type: 'ephemeral' }`. The chunk text goes *after* it, in the user turn.
- **Rationale:** Generating 30 cards from one PDF means 30 requests sharing an identical system prefix. Cache reads cost ~0.1× base input price. Caching is a **prefix match** — any byte change invalidates everything after it, so the system prompt must be frozen (no timestamps, no user IDs interpolated into it).
- **Tradeoff:** Cache writes cost ~1.25×, so break-even is two requests. Any real note upload clears that trivially.
- **⚠️ Model-dependent minimum:** the cacheable prefix minimum is **512 tokens on Opus 5**, **1024 on Sonnet 5**, and **4096 on Haiku 4.5**. A short system prompt silently won't cache on Haiku — no error, just `cache_creation_input_tokens: 0`. If you tier down to Haiku, verify caching actually engages.

### Decision: Content-hash deduplication at ingestion
- **Choice:** SHA-256 the normalized content. A collision with an existing `(user_id, content_hash)` returns the existing source rather than reprocessing.
- **Rationale:** Students re-upload the same lecture notes constantly. Every duplicate would otherwise be a full generation bill.
- **Tradeoff:** A user who wants regeneration with different settings needs an explicit "regenerate" action. Worth it.

### Decision: Synchronous generation with streamed progress, not a job queue
- **Choice:** `POST /api/notes` chunks immediately and generates cards with a progress stream. No Redis, no worker.
- **Alternatives considered:** BullMQ + Redis worker; Anthropic's Batches API
- **Rationale:** A typical lecture note is 5–15 chunks and completes in 20–60 seconds. A job queue is real infrastructure for a problem that doesn't exist yet.
- **Tradeoff:** Very large uploads (a 200-page textbook) will hit serverless timeouts. Cap upload size in this phase and note the escape hatch below.

> 💡 **Escape hatch for bulk:** Anthropic's **Message Batches API** processes up to 100,000 requests asynchronously at **50% of standard pricing**, typically completing within an hour. If large-textbook ingestion becomes a real use case, that's the right tool — not a self-hosted queue. Structure `generateCards` so the batch path is additive.

---

## Implementation Steps

### Step 1: Install dependencies

**What:** Anthropic SDK plus ingestion helpers.

**File(s):** `package.json`

**Details:**

```bash
pnpm add @anthropic-ai/sdk unpdf
```

`unpdf` does server-side PDF text extraction with no native bindings — it works in serverless where `pdf-parse` fights you.

Zod is already installed from Phase 1.

---

### Step 2: The `LlmProvider` interface

**What:** The abstraction everything else depends on. Write this first.

**File(s):** `src/server/llm/provider.ts`, `src/server/llm/types.ts`

**Details:**

```ts
export interface LlmProvider {
  readonly name: 'anthropic-api' | 'byok' | 'local-cli';

  generateStructured<T>(req: {
    system: SystemBlock[];        // supports cache_control on the last block
    userText: string;
    schema: z.ZodType<T>;
    model: string;
    maxTokens: number;
  }): Promise<{ data: T; usage: TokenUsage }>;

  generateFromImage<T>(req: {
    system: SystemBlock[];
    imageBase64: string;
    mediaType: 'image/png' | 'image/jpeg' | 'image/webp';
    schema: z.ZodType<T>;
    model: string;
    maxTokens: number;
  }): Promise<{ data: T; usage: TokenUsage }>;

  countTokens(req: { model: string; text: string }): Promise<number>;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}
```

Note `countTokens` is on the interface. **Never estimate tokens with `tiktoken` or a character heuristic** — that's OpenAI's tokenizer and it's wrong for Claude, badly so on code and non-English text. The API has a real endpoint.

> **ANTI-PATTERN: A leaky provider interface**
> ❌ Don't: add `thinking`, `betas`, or `cacheControl` params that only one implementation understands.
> ✅ Instead: keep the interface to what all three can satisfy; provider-specific behavior lives inside the implementation.
> 💡 Why: a leaky interface means the service branches on provider type, which defeats the entire abstraction.

---

### Step 3: `AnthropicApiProvider`

**What:** The production implementation.

**File(s):** `src/server/llm/anthropic-provider.ts`, `src/server/llm/models.ts`

**Details:**

```ts
// models.ts
export const MODELS = {
  cardGeneration: 'claude-opus-5',
  explanation: 'claude-opus-5',
  handwritingOcr: 'claude-opus-5',
} as const;
```

**Default to `claude-opus-5`.** Card quality from messy student notes is the entire product value — this is the wrong place to economize by default. Cost tiering is a decision to make with real usage data, not upfront (see the open question at the end of this document).

Implementation:
```ts
const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const response = await client.messages.parse({
  model,
  max_tokens: maxTokens,
  system,                                    // last block carries cache_control
  messages: [{ role: 'user', content: userText }],
  output_config: { format: zodOutputFormat(schema) },
});

return { data: response.parsed_output!, usage: mapUsage(response.usage) };
```

`zodOutputFormat` comes from `@anthropic-ai/sdk/helpers/zod`. `parsed_output` is nullable — throw a typed `AppError('VALIDATION', ...)` if null rather than asserting.

**Do not set `temperature`, `top_p`, or `top_k`** — they return a 400 on Opus 5 and Sonnet 5. Steer with the prompt.

**Do not set `thinking`** — it's on by default on Opus 5, and `budget_tokens` returns a 400. If you need it off for cost, `{ type: 'disabled' }` is accepted only at effort `high` or below.

`max_tokens`: use ~16000 for non-streaming card generation. Remember it caps thinking *plus* response text.

**Error handling** — use the SDK's typed exceptions in a most-specific-first chain, never string-matching:
```ts
catch (e) {
  if (e instanceof Anthropic.RateLimitError) throw new AppError('RATE_LIMITED', ...);
  if (e instanceof Anthropic.AuthenticationError) throw new AppError('VALIDATION', ...);
  if (e instanceof Anthropic.APIError) throw new AppError('INVALID_STATE', ...);
  throw e;
}
```

Also handle `response.stop_reason === 'refusal'` — check it **before** reading content. A refusal returns HTTP 200 with empty or partial content, and code that reads `content[0]` unconditionally will crash.

> **ANTI-PATTERN: Estimating tokens client-side**
> ❌ Don't: `Math.ceil(text.length / 4)` or `tiktoken`.
> ✅ Instead: `client.messages.countTokens({ model, messages })`.
> 💡 Why: `tiktoken` is OpenAI's tokenizer and undercounts Claude by 15–20% on prose, far more on code. Quota enforcement built on a wrong count is a billing bug.

---

### Step 4: `ByokProvider` and key encryption

**What:** Let users bring their own Anthropic key.

**File(s):** `src/server/llm/byok-provider.ts`, `src/server/crypto.ts`, plus a migration adding `users.encrypted_anthropic_key`

**Details:**

Extends `AnthropicApiProvider` with a per-request key. The key work is storage:

- Encrypt with AES-256-GCM using a server-side `ENCRYPTION_KEY` (add to `src/lib/env.ts`, minimum 32 bytes)
- **The plaintext key must never be returned to the client**, not even to the owner. Show `sk-ant-…7f3a` — first 7 and last 4 characters only.
- Validate on save with a minimal `countTokens` call. Reject invalid keys immediately rather than at first use.
- BYOK users bypass the monthly quota (they're paying) but still get `llm_usage` rows for their own visibility.

> **ANTI-PATTERN: Storing API keys in plaintext or reversible-to-client form**
> ❌ Don't: store the key as-is, or return it in any API response.
> ✅ Instead: AES-256-GCM at rest, masked display, decrypt only inside the provider.
> 💡 Why: a database leak becomes a mass credential leak, and users' Anthropic bills become your incident.

---

### Step 5: `LocalCliProvider` (dev only)

**What:** Your subscription-backed path for local development.

**File(s):** `src/server/llm/local-cli-provider.ts`

**Details:**

Shells out to the local Claude CLI:
```bash
claude -p --output-format json
```
Piping the prompt on stdin and parsing the JSON result.

**Hard gate at module load:**
```ts
if (env.NODE_ENV === 'production') {
  throw new Error('LocalCliProvider must not be constructed in production');
}
```

Structured output isn't available through the CLI the same way, so this implementation asks for JSON in the prompt and validates with the same Zod schema client-side. It is *less reliable* than the API path — that's acceptable for a dev-only provider, and it means you should validate any prompt change against the API provider before shipping.

`countTokens` returns a rough estimate here with a comment saying so. It's not used for billing on this path.

> **ANTI-PATTERN: A dev-only provider that can reach production**
> ❌ Don't: gate on a runtime `if` inside the method.
> ✅ Instead: throw at construction, and assert in the factory too. Belt and braces.
> 💡 Why: this isn't a feature flag — it's a terms-of-service boundary. Make it structurally impossible to cross.

---

### Step 6: Provider factory and quota enforcement

**What:** Resolve the right provider per user, and stop runaway spend.

**File(s):** `src/server/llm/factory.ts`, `src/server/services/llm-usage.ts`

**Details:**

```ts
export async function getProviderForUser(userId: string): Promise<LlmProvider>;
```

Resolution order: if the user has a BYOK key → `ByokProvider`. Else if `env.LLM_PROVIDER === 'local-cli'` (and not production) → `LocalCliProvider`. Else → `AnthropicApiProvider`.

Quota, in `llm-usage.ts`:
- `assertWithinQuota(userId)` — throws `RATE_LIMITED` if the month's `cost_cents` exceeds `MONTHLY_QUOTA_CENTS`. **Check before the call, not after.**
- `recordUsage(userId, usage, model)` — computes cost from the model's rate table and upserts `llm_usage`
- BYOK users skip the assert

Cost rates (as of 2026-07, per million tokens):

| Model | Input | Output | Context |
|---|---|---|---|
| `claude-opus-5` | $5.00 | $25.00 | 1M |
| `claude-sonnet-5` | $3.00 (intro $2.00 through 2026-08-31) | $15.00 (intro $10.00) | 1M |
| `claude-haiku-4-5` | $1.00 | $5.00 | 200K |

Cache reads bill at ~0.1× input; cache writes at ~1.25×. Compute cost from the four `usage` fields separately, not from a single input total.

> **ANTI-PATTERN: Checking quota after the API call**
> ❌ Don't: generate, then record, then notice the user is over.
> ✅ Instead: assert before, record after.
> 💡 Why: a user who is already over quota should cost you nothing more.

---

### Step 7: Ingestion adapters

**What:** Get text out of whatever the student uploads.

**File(s):**
- `src/server/services/ingest/index.ts` — dispatches on `kind`
- `src/server/services/ingest/text.ts` — paste, `.txt`, `.md`
- `src/server/services/ingest/pdf.ts` — `unpdf` extraction
- `src/server/services/ingest/image.ts` — vision transcription of handwriting

**Details:**

Every adapter returns `{ title: string; text: string }`.

**PDF:** `extractText()` from `unpdf`, joining pages with `\n\n`. If extraction yields under ~200 characters for a multi-page PDF, it's a scanned document — surface a specific message ("This PDF looks scanned. Upload photos of the pages instead") rather than generating garbage cards from OCR noise.

**Image:** send to `generateFromImage` with a transcription-only prompt. The model returns transcribed text; card generation happens afterward on that text, in the normal path. Two steps, not one — a combined prompt does both jobs worse.

Limits: 10MB per file, 20 pages per PDF, 5 images per upload. Enforce **server-side**, not just in the file input's `accept` attribute.

> **ANTI-PATTERN: Trusting client-side file limits**
> ❌ Don't: rely on `accept=".pdf"` and a JS size check.
> ✅ Instead: validate MIME type and byte length in the route handler.
> 💡 Why: the file input is a suggestion. `curl` is not.

---

### Step 8: Semantic chunking

**What:** Split notes into generation-sized pieces. Pure, testable.

**File(s):** `src/domain/study/chunking.ts`

**Details:**

```ts
export function chunkText(input: {
  text: string;
  targetTokens: number;      // ~1500
  maxTokens: number;         // ~2000 hard ceiling
  estimateTokens: (s: string) => number;
}): Array<{ ordinal: number; text: string }>;
```

Split priority: markdown headings (`#`, `##`, `###`) → blank-line paragraph breaks → sentence boundaries → hard character split as the last resort.

Note `estimateTokens` is **injected**. The domain layer stays pure and testable; the service passes in a real counter (Step 3's `countTokens`, memoized) or a cheap approximation for the split-point search. Count for real once per final chunk.

Discard chunks under ~100 tokens — a heading with two words generates nothing worth reviewing.

> **ANTI-PATTERN: Fixed-size character chunking**
> ❌ Don't: `text.match(/.{1,6000}/g)`.
> ✅ Instead: split on semantic boundaries with a token-count target.
> 💡 Why: cutting mid-sentence produces cards that quote half a thought. Chunk quality caps card quality.

---

### Step 9: Card generation with the hallucination guard

**What:** The core of the phase.

**File(s):**
- `src/server/services/card-generation.ts`
- `src/server/llm/prompts/card-generation.ts`
- `src/domain/study/card-schema.ts`
- `src/domain/study/verify-quote.ts`

**Details:**

The schema (`card-schema.ts`) — keep it **stable**, since schema changes trigger recompilation:
```ts
export const generatedCardSchema = z.object({
  question: z.string().min(5).max(300),
  answer: z.string().min(1).max(1000),
  sourceQuote: z.string().min(10).max(500)
    .describe('A verbatim quote from the provided source text that supports this answer. Copy it exactly.'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  tags: z.array(z.string()).max(5),
});

export const cardBatchSchema = z.object({ cards: z.array(generatedCardSchema).max(12) });
```

`.describe()` matters — the description is what the model reads to understand the field.

The verification (`verify-quote.ts`, pure):
```ts
export function quoteAppearsInSource(quote: string, source: string): boolean;
```
Normalize both sides — collapse whitespace, normalize smart quotes and dashes, lowercase — then substring match. Do **not** do fuzzy matching; the point is to catch fabrication, and fuzzy matching is exactly how fabrication slips through.

The service, per chunk:
1. `assertWithinQuota(userId)`
2. Call `generateStructured` with the cached system prompt and the chunk as user text
3. Filter cards where `quoteAppearsInSource` fails — **log the rejections with the chunk id**; a rising rejection rate is your early warning that a prompt change regressed
4. `recordUsage`
5. Insert survivors with `next_due_at = now()` and an initial FSRS state (Phase 7 owns scheduling; the initial state is just "new")

System prompt shape (frozen — no interpolated values):
> You generate flashcards from a student's study notes. Produce 3–8 cards per passage, covering the most testable facts and relationships. Every card must include a `sourceQuote` copied **verbatim** from the passage — do not paraphrase it, do not fix its typos. If the passage contains nothing worth testing, return an empty array.

That last sentence matters — without explicit permission to return nothing, the model invents cards from a page of headings.

> **ANTI-PATTERN: Interpolating anything variable into the cached system prompt**
> ❌ Don't: `` `You are helping ${user.name} study ${subject}...` ``
> ✅ Instead: freeze the system prompt; put per-request context in the user turn.
> 💡 Why: caching is a prefix match. One interpolated name and the cache never hits — silently, with no error, at full price.

> **ANTI-PATTERN: Accepting cards that fail the quote check**
> ❌ Don't: log a warning and keep the card anyway.
> ✅ Instead: drop it.
> 💡 Why: a card whose quote isn't in the source was invented. One confidently-wrong fact a student memorizes is worse than ten missing cards.

---

### Step 10: API routes

**What:** Thin controllers over the ingestion and generation services.

**File(s):**
- `src/app/api/notes/route.ts` — `POST` (multipart or JSON), `GET` (list)
- `src/app/api/notes/[id]/route.ts` — `GET` detail with cards, `DELETE`
- `src/app/api/notes/[id]/status/route.ts` — generation progress
- `src/app/api/settings/api-key/route.ts` — `PUT` set BYOK key, `DELETE` remove

**Details:**

`POST /api/notes` flow:
1. Auth, parse, validate size and type
2. Run the ingest adapter → `{ title, text }`
3. Hash; if `(user_id, content_hash)` exists, return the existing source with `deduplicated: true`
4. Chunk, insert `note_sources` + `note_chunks` in **one transaction**
5. Kick off generation, tracking progress per chunk
6. Return the source id immediately; the client polls `/status`

Progress is stored in-memory keyed by source id (a `Map`) with a DB fallback of `generatedChunks / totalChunks` computed from card counts. In-memory is fine — a lost progress reading is cosmetic, and the DB fallback is authoritative.

The API-key route **must never return the plaintext key** on `GET`. Masked only.

---

### Step 11: Notes UI

**What:** Upload, watch generation, review the results.

**File(s):**
- `src/app/(app)/notes/page.tsx` — Server Component, lists sources
- `src/app/(app)/notes/_components/upload-dropzone.tsx` — `'use client'`
- `src/app/(app)/notes/_components/generation-progress.tsx`
- `src/app/(app)/notes/[id]/page.tsx` — source detail, card list
- `src/app/(app)/notes/[id]/_components/card-editor.tsx` — edit/delete a card
- `src/app/(app)/settings/_components/api-key-form.tsx` — BYOK

**Details:**

- Dropzone accepts paste, file drop, and file picker. Show the size/page/count limits **before** upload, not as a post-hoc error.
- Progress: "Generating cards… 4 of 12 sections" with a per-chunk bar. Generation takes 20–60 seconds; a spinner with no numbers reads as broken.
- **Show the `sourceQuote` on every card.** This is a trust feature, not a debug view — a student who can see where a card came from will trust the deck. Make it visually secondary but always present.
- Card editor supports editing question/answer and deleting. Users will find awkward cards, and being unable to fix them is worse than the awkward card.
- Empty state: "Upload your lecture notes and we'll turn them into flashcards" with a sample file to try.

> **ANTI-PATTERN: Hiding the source quote**
> ❌ Don't: treat `sourceQuote` as internal validation metadata.
> ✅ Instead: render it under each card.
> 💡 Why: "where did this come from?" is the first question a student asks about an AI-generated card. Answering it pre-emptively is the difference between a tool they trust and one they spot-check forever.

---

## State Management for This Phase

| State | Category | Location | Source of truth | Persistence |
|---|---|---|---|---|
| Note sources list | Server data | Server Component fetch + TanStack Query | Postgres `note_sources` | DB |
| Upload file selection | Ephemeral UI | `useState` in the dropzone | Client | None |
| Generation progress | Server data (polled) | TanStack Query, 2s interval while active | In-memory map + DB fallback | Partially — DB count is authoritative |
| Cards for a source | Server data | TanStack Query | Postgres `cards` | DB |
| BYOK key (masked) | Server data | Server Component fetch | Postgres, encrypted | DB — **plaintext never leaves the server** |
| Monthly usage | Server data | TanStack Query | Postgres `llm_usage` | DB |

## Error Handling

| Operation | Failure mode | User-facing behavior | Recovery strategy |
|---|---|---|---|
| Upload | File too large | "Files must be under 10MB" before upload starts | Client hint + server enforcement |
| Upload | Unsupported type | "We support PDF, Markdown, text, and photos" | Server MIME validation |
| PDF extract | Scanned/image-only PDF | "This PDF looks scanned — upload photos of the pages instead" | Detect via low text yield; specific message, not a generic failure |
| PDF extract | Corrupt file | "We couldn't read this PDF" | Catch, log, keep other uploads unaffected |
| Ingest | Duplicate content | "You've already uploaded these notes" + link to the existing source | Content-hash unique constraint |
| Generation | Quota exceeded | "Monthly AI limit reached. Add your own API key to continue." | `assertWithinQuota` before the call; BYOK is the offered path |
| Generation | Anthropic rate limit | Retry with backoff (SDK does 2 automatically); then "Busy right now, try again shortly" | Typed `RateLimitError` |
| Generation | `stop_reason: 'refusal'` | Skip that chunk, note it in the result | **Check `stop_reason` before reading content** |
| Generation | `parsed_output` null | Skip the chunk, log the raw response | Throw `VALIDATION`; other chunks proceed |
| Generation | All cards fail the quote check | "We couldn't generate reliable cards from this section" | Log with chunk id — a spike here means a prompt regression |
| Generation | Partial failure mid-run | Keep successful cards, report "10 of 12 sections processed" | Per-chunk isolation; never all-or-nothing |
| BYOK key | Invalid key | "That key didn't work — check it and try again" | Validate with a `countTokens` call at save time |
| Local CLI | `claude` not installed | Clear dev-time error naming the provider | Dev-only; never reaches users |

## Testing Requirements for This Phase

- [ ] `chunkText` splits on markdown headings when present
- [ ] `chunkText` falls back to paragraphs, then sentences, then hard split
- [ ] `chunkText` never emits a chunk over `maxTokens`
- [ ] `chunkText` discards chunks under the minimum
- [ ] `chunkText` preserves `ordinal` order and loses no content
- [ ] `quoteAppearsInSource` matches despite whitespace differences
- [ ] `quoteAppearsInSource` matches despite smart-quote and dash variants
- [ ] **`quoteAppearsInSource` rejects a plausible paraphrase** ← the guard's whole job
- [ ] `quoteAppearsInSource` is case-insensitive
- [ ] Generation drops cards whose quote fails verification
- [ ] Generation records usage with all four token fields separately
- [ ] Quota assertion throws `RATE_LIMITED` before any API call is made
- [ ] BYOK users bypass the quota check
- [ ] **`LocalCliProvider` throws on construction when `NODE_ENV === 'production'`**
- [ ] Uploading identical content twice creates one `note_sources` row
- [ ] `GET /api/settings/api-key` returns a masked key, never plaintext
- [ ] A stored BYOK key round-trips through encrypt/decrypt
- [ ] Cost calculation prices cache reads at the reduced rate
- [ ] One chunk failing does not abort the others

**Test type guidance:**
- `src/domain/study/chunking.ts` and `verify-quote.ts` → **unit tests**, exhaustive, no mocks. Highest value in the phase.
- Generation service → **integration tests with a fake `LlmProvider`**. This is the one place mocking is correct: the provider *is* the external boundary, and the interface exists precisely so tests don't hit the network.
- Quota, dedup, usage recording → **integration tests against a real Postgres**.
- Upload UI → **RTL**: "dropping a file shows progress", "an oversized file shows the limit message".
- **Do not write tests that call the Anthropic API.** They're slow, flaky, and cost money per run.

## Acceptance Criteria

- [ ] Pasting text creates a source, chunks it, and generates cards
- [ ] Uploading a text-based PDF extracts text and generates cards
- [ ] Uploading a photo of handwritten notes transcribes it, then generates cards
- [ ] Every card displays its source quote in the UI
- [ ] Every stored card's quote appears verbatim in its parent chunk
- [ ] Uploading the same file twice shows "already uploaded" and creates no duplicate
- [ ] Progress shows "N of M sections" and completes
- [ ] A user over quota sees a clear message and is offered the BYOK path
- [ ] Saving a valid Anthropic key switches that user to `ByokProvider`
- [ ] The settings page shows the key masked (`sk-ant-…7f3a`), never in full
- [ ] `llm_usage` accumulates and the settings page shows the month's spend
- [ ] Cards can be edited and deleted
- [ ] Setting `LLM_PROVIDER=local-cli` with `NODE_ENV=production` fails to boot
- [ ] Repeated generations show `cache_read_input_tokens > 0` — **caching is actually working**

**Verification commands:**
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

**Cache verification** (the most likely thing to be silently broken): add a dev-only log of `usage.cache_read_input_tokens` after each generation. Upload a multi-chunk document. The first chunk shows `cache_creation_input_tokens > 0`; every subsequent chunk must show `cache_read_input_tokens > 0`. If they're all zero, something variable leaked into the system prompt.

**Boundary check** (must print nothing):
```bash
rg -n "process\.env" src --glob '!src/lib/env.ts'
```

**Smoke test:** Sign in, go to `/notes`, paste two paragraphs of lecture notes. Cards generate within ~20 seconds with a progress indicator. Each card shows a source quote — verify one appears verbatim in what you pasted. Upload a PDF of the same notes: it deduplicates or generates depending on whether the text matches. Add your own Anthropic key in settings, confirm it displays masked, and generate again — usage should now be attributed to BYOK. Set `LLM_PROVIDER=local-cli` in `.env.local` and confirm generation still works locally against your subscription.

## Handoff to Next Phase

Phase 6 delivers the complete notes→cards pipeline. `src/server/llm/` holds an `LlmProvider` interface with three implementations: `AnthropicApiProvider` (production, `claude-opus-5`, structured output via `messages.parse()` + `zodOutputFormat`, prompt caching on a frozen system prefix), `ByokProvider` (user keys, AES-256-GCM at rest, masked display, quota-exempt), and `LocalCliProvider` (subscription-backed, throws on construction in production). A factory resolves per user. Ingestion handles paste, markdown, text, PDF (via `unpdf`, with scanned-PDF detection), and photos of handwriting (vision transcription as a separate step). `src/domain/study/chunking.ts` splits semantically on headings → paragraphs → sentences with an injected token counter. Generation produces schema-validated cards, and `verify-quote.ts` drops any card whose `sourceQuote` isn't verbatim in its chunk. Usage is metered into `llm_usage` with cache-aware pricing, and quota is asserted before every call. `/notes` supports upload, live progress, card editing, and always shows the source quote.

**Codebase state:** cards exist in the database with an initial FSRS state and `next_due_at = now()`. **Nothing reviews them yet** — that's Phase 7.

**Known shortcuts taken:**
- Generation is synchronous. Very large uploads will hit serverless timeouts; the Batches API (50% cheaper, up to 100k requests) is the right escalation if bulk ingestion becomes real.
- Progress tracking is in-memory with a DB fallback. Fine for one server; needs Redis if you scale horizontally.
- `LocalCliProvider` asks for JSON in the prompt rather than using structured output — it's less reliable. Validate prompt changes against `AnthropicApiProvider` before shipping.
- Asset ownership of cards is per-user with no sharing or deck import. Deliberate.
- No re-generation with different settings. Users can delete and re-upload.

**Phase 7 should start with** the FSRS wrapper in `src/domain/review/`, wrapping `ts-fsrs` behind a narrow interface, before any review UI. The scheduling math is the part worth testing and the part everything else depends on.

**Open questions for next phase:**
- 🟡 **Model cost tiering.** Everything defaults to `claude-opus-5` ($5/$25 per MTok). Once you have real usage data, evaluate `claude-sonnet-5` ($3/$15, intro $2/$10 through 2026-08-31) or `claude-haiku-4-5` ($1/$5) for bulk card generation. **This is your call, not an automatic optimization** — card quality from messy student notes is the product. If you do tier down to Haiku, note its prompt-cache minimum is 4096 tokens (vs 512 on Opus 5), so verify caching still engages, and its context window is 200K rather than 1M.
- 🟡 **Note formats beyond the five implemented.** Notion, Google Docs, and YouTube transcripts each need their own ingestion adapter. The adapter pattern in `src/server/services/ingest/` makes each one additive.
- 🟢 Whether to let users regenerate a source's cards with a different model or prompt. Deferred.
