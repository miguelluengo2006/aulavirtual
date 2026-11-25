ALTER TABLE "courses" ADD COLUMN "highlights" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "audience" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "instructors" jsonb DEFAULT '[]'::jsonb NOT NULL;