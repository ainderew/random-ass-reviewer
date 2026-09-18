ALTER TABLE "card_reviews" ADD COLUMN "practice_type" text;
--> statement-breakpoint
ALTER TABLE "card_reviews" ADD COLUMN "correct" boolean;
--> statement-breakpoint
ALTER TABLE "card_reviews" ADD COLUMN "delay_days" double precision;
--> statement-breakpoint
ALTER TABLE "card_reviews" ADD COLUMN "subject" text;
