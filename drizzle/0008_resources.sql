CREATE TYPE "public"."resource_kind" AS ENUM('link', 'file');--> statement-breakpoint
CREATE TABLE "resources" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"module_id" text,
	"lesson_id" text,
	"kind" "resource_kind" NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"file_key" text,
	"file_name" text,
	"content_type" text,
	"size_bytes" bigint,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resources_one_parent" CHECK (("resources"."module_id" is null) <> ("resources"."lesson_id" is null)),
	CONSTRAINT "resources_kind_fields" CHECK (("resources"."kind" = 'link' and "resources"."url" is not null) or ("resources"."kind" = 'file' and "resources"."file_key" is not null))
);
--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resources_course_idx" ON "resources" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "resources_module_idx" ON "resources" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "resources_lesson_idx" ON "resources" USING btree ("lesson_id");--> statement-breakpoint
ALTER TABLE "resources" ENABLE ROW LEVEL SECURITY;