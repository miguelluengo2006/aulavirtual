ALTER TABLE "lessons" ADD COLUMN "key_points" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "forum_posts_user_idx" ON "forum_posts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "forum_threads_user_idx" ON "forum_threads" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "lesson_answers_question_idx" ON "lesson_answers" USING btree ("question_id","created_at");--> statement-breakpoint
CREATE INDEX "lesson_answers_user_idx" ON "lesson_answers" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "lesson_questions_user_idx" ON "lesson_questions" USING btree ("user_id","created_at");