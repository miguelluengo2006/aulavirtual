import { asc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { formatPrice, plural } from "@/lib/format";

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="glass max-w-3xl space-y-6 p-8 sm:p-12">
        <h1 className="text-4xl sm:text-5xl">Cursos en vídeo que se aprenden de verdad</h1>
        <p className="max-w-xl text-lg text-muted">
          Cada lección termina con unas preguntas clave para comprobar lo que has entendido. Tu
          progreso se guarda solo y puedes seguir donde lo dejaste.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="#cursos" className="btn btn-primary">
            Ver los cursos
          </a>
          <Link href="/registro" className="btn btn-ghost">
            Crear cuenta
          </Link>
        </div>
      </section>

      <section id="cursos" className="scroll-mt-24 space-y-6">
        <div className="space-y-1">
          <h2 className="text-3xl">Cursos</h2>
          <p className="text-muted">
            Compra un curso suelto o suscríbete para acceder a todo el catálogo.
          </p>
        </div>
        <Suspense fallback={<p className="text-subtle">Cargando cursos…</p>}>
          <CourseList />
        </Suspense>
      </section>
    </div>
  );
}

async function CourseList() {
  await connection();
  const list = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      description: courses.description,
      priceCents: courses.priceCents,
      currency: courses.currency,
      includedInSubscription: courses.includedInSubscription,
      lessonCount: sql<number>`(select count(*)::int from "lessons" where "lessons"."course_id" = "courses"."id")`,
    })
    .from(courses)
    .where(eq(courses.status, "published"))
    .orderBy(asc(courses.title));

  if (list.length === 0) {
    return (
      <div className="glass p-8 text-muted">Todavía no hay cursos publicados. Vuelve pronto.</div>
    );
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((c) => (
        <li key={c.id}>
          <Link
            href={`/cursos/${c.slug}`}
            className="glass flex h-full flex-col gap-4 p-6 transition-colors hover:bg-white/10"
          >
            <div className="flex-1 space-y-2">
              <h3 className="text-xl">{c.title}</h3>
              <p className="line-clamp-3 text-sm text-muted">{c.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{formatPrice(c.priceCents, c.currency)}</span>
              <span className="chip">{plural(c.lessonCount, "lección", "lecciones")}</span>
              {c.includedInSubscription && <span className="chip chip-accent">En la suscripción</span>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
