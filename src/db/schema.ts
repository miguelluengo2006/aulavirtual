import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull();

// ─────────────────────────────────────────────────────────────
// Autenticación (tablas que usa Better Auth)
// ─────────────────────────────────────────────────────────────

export const userRole = pgEnum("user_role", ["admin", "teacher", "student"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: userRole("role").default("student").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// ─────────────────────────────────────────────────────────────
// Contenido
// ─────────────────────────────────────────────────────────────

export const courseStatus = pgEnum("course_status", [
  "draft",
  "published",
  "archived",
]);
export const videoProvider = pgEnum("video_provider", ["r2", "stream"]);

export const courses = pgTable("courses", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  coverImage: text("cover_image"),
  // null = precio pendiente: no se puede publicar hasta fijarlo.
  priceCents: integer("price_cents"),
  currency: text("currency").default("eur").notNull(),
  includedInSubscription: boolean("included_in_subscription")
    .default(true)
    .notNull(),
  status: courseStatus("status").default("draft").notNull(),
  // Notas que dejó Claude Code al importar (suposiciones, TODOs).
  importNotes: jsonb("import_notes").$type<string[]>().default([]).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const courseTeachers = pgTable(
  "course_teachers",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.courseId, t.userId] })],
);

export const modules = pgTable(
  "modules",
  {
    id: id(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    // Id estable del manifiesto: permite reimportar sin perder nada.
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [uniqueIndex("modules_course_ext_idx").on(t.courseId, t.externalId)],
);

export const lessons = pgTable(
  "lessons",
  {
    id: id(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    moduleId: text("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    position: integer("position").notNull(),
    videoProvider: videoProvider("video_provider").notNull(),
    videoKey: text("video_key").notNull(),
    durationSeconds: integer("duration_seconds"),
    sourceFile: text("source_file"),
  },
  (t) => [
    uniqueIndex("lessons_course_ext_idx").on(t.courseId, t.externalId),
    index("lessons_module_idx").on(t.moduleId),
  ],
);

export const quizzes = pgTable("quizzes", {
  id: id(),
  lessonId: text("lesson_id")
    .notNull()
    .unique()
    .references(() => lessons.id, { onDelete: "cascade" }),
});

export const questions = pgTable(
  "questions",
  {
    id: id(),
    quizId: text("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    prompt: text("prompt").notNull(),
    explanation: text("explanation").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [uniqueIndex("questions_quiz_ext_idx").on(t.quizId, t.externalId)],
);

export const options = pgTable(
  "options",
  {
    id: id(),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [index("options_question_idx").on(t.questionId)],
);

// ─────────────────────────────────────────────────────────────
// Acceso y pagos
// ─────────────────────────────────────────────────────────────

export const enrollmentSource = pgEnum("enrollment_source", [
  "purchase",
  "manual",
]);

export const enrollments = pgTable(
  "enrollments",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    source: enrollmentSource("source").notNull(),
    stripePaymentId: text("stripe_payment_id"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.courseId] })],
);

export const subscriptionStatus = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
]);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    status: subscriptionStatus("status").notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("subscriptions_user_idx").on(t.userId)],
);

// Idempotencia de webhooks de Stripe.
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: createdAt(),
});

// ─────────────────────────────────────────────────────────────
// Progreso y métricas
// ─────────────────────────────────────────────────────────────

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    // Tramos vistos ya unidos: [[0,30],[45,120]]
    watchedRanges: jsonb("watched_ranges")
      .$type<[number, number][]>()
      .default([])
      .notNull(),
    watchedSeconds: integer("watched_seconds").default(0).notNull(),
    // Tiempo real dedicado (incluye volver a ver).
    timeSpentSeconds: integer("time_spent_seconds").default(0).notNull(),
    maxPositionSeconds: integer("max_position_seconds").default(0).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

export const watchEvents = pgTable(
  "watch_events",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    fromSecond: integer("from_second").notNull(),
    toSecond: integer("to_second").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("watch_events_lesson_idx").on(t.lessonId, t.createdAt),
    index("watch_events_user_idx").on(t.userId, t.createdAt),
    check("watch_events_range_chk", sql`${t.toSecond} >= ${t.fromSecond}`),
  ],
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    quizId: text("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    // { [questionId]: optionId }
    answers: jsonb("answers").$type<Record<string, string>>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("quiz_attempts_user_quiz_idx").on(t.userId, t.quizId)],
);

// ─────────────────────────────────────────────────────────────
// Dudas por lección y foro por curso
// ─────────────────────────────────────────────────────────────

export const lessonQuestionStatus = pgEnum("lesson_question_status", [
  "open",
  "answered",
]);

export const lessonQuestions = pgTable(
  "lesson_questions",
  {
    id: id(),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    status: lessonQuestionStatus("status").default("open").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("lesson_questions_lesson_idx").on(t.lessonId, t.status)],
);

export const lessonAnswers = pgTable("lesson_answers", {
  id: id(),
  questionId: text("question_id")
    .notNull()
    .references(() => lessonQuestions.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  isTeacher: boolean("is_teacher").default(false).notNull(),
  createdAt: createdAt(),
});

export const forumThreads = pgTable(
  "forum_threads",
  {
    id: id(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    pinned: boolean("pinned").default(false).notNull(),
    locked: boolean("locked").default(false).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("forum_threads_course_idx").on(t.courseId)],
);

export const forumPosts = pgTable(
  "forum_posts",
  {
    id: id(),
    threadId: text("thread_id")
      .notNull()
      .references(() => forumThreads.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    isTeacher: boolean("is_teacher").default(false).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("forum_posts_thread_idx").on(t.threadId)],
);

// ─────────────────────────────────────────────────────────────
// Relaciones (para db.query.*)
// ─────────────────────────────────────────────────────────────

export const coursesRelations = relations(courses, ({ many }) => ({
  modules: many(modules),
  teachers: many(courseTeachers),
}));

export const courseTeachersRelations = relations(courseTeachers, ({ one }) => ({
  course: one(courses, {
    fields: [courseTeachers.courseId],
    references: [courses.id],
  }),
  user: one(user, { fields: [courseTeachers.userId], references: [user.id] }),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, { fields: [modules.courseId], references: [courses.id] }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  module: one(modules, { fields: [lessons.moduleId], references: [modules.id] }),
  quiz: one(quizzes, { fields: [lessons.id], references: [quizzes.lessonId] }),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  lesson: one(lessons, { fields: [quizzes.lessonId], references: [lessons.id] }),
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  quiz: one(quizzes, { fields: [questions.quizId], references: [quizzes.id] }),
  options: many(options),
}));

export const optionsRelations = relations(options, ({ one }) => ({
  question: one(questions, {
    fields: [options.questionId],
    references: [questions.id],
  }),
}));
