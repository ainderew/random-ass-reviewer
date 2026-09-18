ALTER TABLE "cards" ADD COLUMN "answer_type" text DEFAULT 'auto' NOT NULL;
--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_answer_type_check" CHECK ("answer_type" IN ('auto', 'recall', 'write', 'choice'));
