CREATE TABLE "mistake_checks" (
  "id" uuid PRIMARY KEY NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "focus_sessions"("id") ON DELETE CASCADE,
  "card_id" uuid NOT NULL,
  "option_index" integer NOT NULL,
  "correct" boolean NOT NULL,
  "answered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "mistake_checks_question_idx" ON "mistake_checks" ("session_id", "card_id", "answered_at");
