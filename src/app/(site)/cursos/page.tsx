import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { buyingFaqs, CourseList, Faq, FinalCta, Plans, SectionHeading } from "@/components/landing/marketing";
import { getPublishedCourses } from "@/lib/course-data";
import { formatTotalMinutes } from "@/lib/format";

export const metadata: Metadata = {
  title: "Cursos",
  description: "Catálogo de cursos de IDESIE AV: compra un curso suelto o accede a todos con la suscripción.",
};

// Tienda: catálogo, formas de acceso y dudas sobre la compra.
export default function StorePage() {
  return (
    <div className="space-y-24 pb-8">
      <header className="relative overflow-hidden rounded-[2.5rem] border border-white/10 px-6 py-14 sm:px-12 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_90%_at_10%_0%,rgb(29_78_216/0.45),transparent),radial-gradient(50%_80%_at_95%_100%,rgb(45_212_191/0.25),transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 [mask-image:radial-gradient(70%_70%_at_50%_40%,black,transparent)]"
          style={{
            backgroundImage:
              "linear-gradient(rgb(255 255 255 / 0.15) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.15) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative max-w-3xl space-y-6">
          <span className="chip chip-accent">Tienda de cursos</span>
          <h1 className="text-4xl sm:text-6xl">Cursos para aplicar desde el primer día</h1>
          <p className="text-lg text-muted sm:text-xl">
            Lecciones en vídeo, preguntas para comprobar lo aprendido, un profesor que responde tus dudas y un foro en cada
            curso. Revisa la ficha y el temario completo antes de comprar.
          </p>
          <Suspense fallback={null}>
            <CatalogStats />
          </Suspense>
        </div>
      </header>

      <section id="catalogo" aria-label="Catálogo" className="scroll-mt-28">
        <Suspense fallback={<p className="text-subtle">Cargando cursos…</p>}>
          <CourseList />
        </Suspense>
      </section>

      <section id="precios" className="scroll-mt-28 space-y-10">
        <SectionHeading title="Dos formas de acceder" text="Compra solo lo que te interesa o accede a todo con una suscripción." />
        <Plans />
      </section>

      <section className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
        <SectionHeading title="Antes de comprar" text="Lo que más nos preguntan sobre el acceso a los cursos." />
        <Faq items={buyingFaqs} />
      </section>

      <FinalCta title="¿Tienes dudas sobre qué curso elegir?" text="Crea tu cuenta gratis y revisa con calma el temario de cada curso." />
    </div>
  );
}

/** Cifras del catálogo, calculadas de los cursos publicados. */
async function CatalogStats() {
  await connection();
  const list = await getPublishedCourses();
  if (list.length === 0) return null;
  const lessons = list.reduce((n, c) => n + c.lessonCount, 0);
  const seconds = list.reduce((n, c) => n + c.totalSeconds, 0);
  const stats = [
    { value: String(list.length), label: list.length === 1 ? "curso" : "cursos" },
    { value: String(lessons), label: "lecciones en vídeo" },
    ...(seconds >= 60 ? [{ value: formatTotalMinutes(seconds), label: "de vídeo" }] : []),
  ];
  return (
    <dl className="flex flex-wrap gap-3 pt-2">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-sm">
          <dt className="sr-only">{s.label}</dt>
          <dd>
            <span className="text-2xl font-semibold tracking-tight">{s.value}</span>{" "}
            <span className="text-sm text-muted">{s.label}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
