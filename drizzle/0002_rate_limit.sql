CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
-- Supabase: toda tabla nueva con RLS (ver CLAUDE.md).
ALTER TABLE "rate_limit" ENABLE ROW LEVEL SECURITY;
