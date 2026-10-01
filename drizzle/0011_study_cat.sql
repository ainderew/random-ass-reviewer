CREATE TYPE "public"."pet_coat" AS ENUM('ginger', 'cream', 'tuxedo', 'grey');
--> statement-breakpoint
CREATE TABLE "pets" (
	"user_id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'Toast' NOT NULL,
	"coat" "pet_coat" DEFAULT 'ginger' NOT NULL,
	"bowls_fed" integer DEFAULT 0 NOT NULL,
	"treats_given" integer DEFAULT 0 NOT NULL,
	"happiness" real DEFAULT 70 NOT NULL,
	"happiness_at" timestamp with time zone DEFAULT now() NOT NULL,
	"brushed_at" timestamp with time zone,
	"played_at" timestamp with time zone,
	"nudged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pets_happiness_range" CHECK ("pets"."happiness" BETWEEN 0 AND 100),
	CONSTRAINT "pets_bowls_fed_nonnegative" CHECK ("pets"."bowls_fed" >= 0),
	CONSTRAINT "pets_treats_given_nonnegative" CHECK ("pets"."treats_given" >= 0)
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "push_subscriptions_user" ON "push_subscriptions" USING btree ("user_id");
