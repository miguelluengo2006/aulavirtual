-- Supabase expone las tablas de public en su API REST con la clave anónima.
-- La app se conecta directamente a Postgres (rol propietario, ignora RLS), así que
-- activar RLS sin políticas cierra esa API sin afectar a la app.
-- Si añades una tabla nueva, añade también su ALTER TABLE ... ENABLE ROW LEVEL SECURITY.
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "course_teachers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "enrollments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "forum_posts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "forum_threads" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "lesson_answers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "lesson_progress" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "lesson_questions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "lessons" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "modules" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "options" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "quiz_attempts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "quizzes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "stripe_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "watch_events" ENABLE ROW LEVEL SECURITY;
