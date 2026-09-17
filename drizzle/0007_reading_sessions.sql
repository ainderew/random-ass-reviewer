ALTER TABLE "focus_sessions" ADD COLUMN "mode" text DEFAULT 'focus' NOT NULL;
--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "reading_limit_ms" integer;
--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "reading_session_limit" CHECK (
  (mode = 'focus' AND reading_limit_ms IS NULL) OR
  (mode = 'reading' AND reading_limit_ms IN (300000, 900000, 1800000) AND reading_limit_ms IS NOT NULL)
);
