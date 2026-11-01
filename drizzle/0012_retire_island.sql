-- Study history, quiz results, streaks and pets are preserved.
DROP TABLE IF EXISTS "placements";
--> statement-breakpoint
DROP TABLE IF EXISTS "caches";
--> statement-breakpoint
DROP TABLE IF EXISTS "islands";
--> statement-breakpoint
DROP TYPE IF EXISTS "rarity";
--> statement-breakpoint
ALTER TABLE "user_stats" DROP COLUMN "focus_balance", DROP COLUMN "insight_balance", DROP COLUMN "xp", DROP COLUMN "level", DROP COLUMN "pity_counter";
--> statement-breakpoint
ALTER TABLE "focus_sessions" DROP COLUMN "loot_seed", DROP COLUMN "quiz_multiplier";
--> statement-breakpoint
DELETE FROM "rate_limits" WHERE "bucket" = 'island:place';
