DROP INDEX "quiz_attempts_user_quiz_idx";--> statement-breakpoint
CREATE INDEX "course_teachers_user_idx" ON "course_teachers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "enrollments_course_idx" ON "enrollments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "lesson_progress_lesson_idx" ON "lesson_progress" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_quiz_idx" ON "quiz_attempts" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "watch_events_session_idx" ON "watch_events" USING btree ("user_id","session_id","created_at");--> statement-breakpoint
CREATE INDEX "quiz_attempts_user_quiz_idx" ON "quiz_attempts" USING btree ("user_id","quiz_id","created_at");