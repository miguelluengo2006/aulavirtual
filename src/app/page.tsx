import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { formatPrice } from "@/lib/format";

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Cursos</h1>
        <p className="text-stone-600">
          Compra un curso suelto o suscríbete para acceder a todo el catálogo.
        </p>
      </section>
      <Suspense fallback={<p className="text-stone-400">Cargando cursos…</p>}>
        <CourseList />
      </Suspense>
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
    })
    .from(courses)
    .where(eq(courses.status, "published"))
    .orderBy(asc(courses.title));

  if (list.length === 0) {
    return <p className="text-stone-500">Todavía no hay cursos publicados.</p>;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {list.map((c) => (
        <li key={c.id}>
          <Link href={`/cursos/${c.slug}`} className="block h-full rounded-lg border border-stone-200 bg-white p-5 hover:border-stone-400">
          <h2 className="font-semibold">{c.title}</h2>
          <p className="mt-1 line-clamp-3 text-sm text-stone-600">{c.description}</p>
          <p className="mt-3 text-sm">
            <span className="font-medium">{formatPrice(c.priceCents, c.currency)}</span>
            {c.includedInSubscription && (
              <span className="text-stone-500"> · incluido en la suscripción</span>
            )}
          </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
