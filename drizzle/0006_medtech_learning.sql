CREATE TYPE "public"."card_review_status" AS ENUM('draft', 'approved', 'flagged');--> statement-breakpoint
CREATE TABLE "session_quiz_questions" (
	"session_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"option_index" integer,
	"correct" boolean,
	"answered_at" timestamp with time zone,
	CONSTRAINT "session_quiz_questions_session_id_card_id_pk" PRIMARY KEY("session_id","card_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "exam_month" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "daily_new_cards" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "review_status" "card_review_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "subject" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "topic" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "quiz" jsonb;--> statement-breakpoint
ALTER TABLE "session_quiz_questions" ADD CONSTRAINT "session_quiz_questions_session_id_focus_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."focus_sessions"("id") ON DELETE cascade ON UPDATE no action;