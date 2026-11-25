import Link from "next/link";
import { Suspense } from "react";
import { HeroDemo } from "@/components/landing/hero-demo";
import { Check, CourseList, FeatureIcon, features, FinalCta, UpcomingCourses, SectionHeading } from "@/components/landing/marketing";

// Portada: qué es, cursos destacados y enlaces al resto de páginas.
export default function Home() {
  // Tres ventajas en la portada; el resto, en "Cómo funciona".
  const highlights = features.filter((f) => ["question", "teacher", "progress"].includes(f.icon));
  return (
    <div className="space-y-28 pb-8">
      <section className="grid items-center gap-10 pt-4 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div className="space-y-7">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl">Aprende en vídeo y comprueba lo que has entendido</h1>
          <p className="max-w-xl text-lg text-muted">
            Cursos en lecciones cortas, con preguntas clave al final de cada vídeo y profesores que responden tus
            dudas. Tu progreso se guarda solo, en cualquier dispositivo.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/cursos" className="btn btn-primary">
              Ver los cursos
            </Link>
            <Link href="/como-funciona" className="btn btn-ghost">
              Cómo funciona
            </Link>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <li className="flex items-center gap-2">
              <Check /> Acceso para siempre a lo que compras
            </li>
            <li className="flex items-center gap-2">
              <Check /> Sin instalar nada
            </li>
          </ul>
        </div>
        <HeroDemo />
      </section>

      <section className="space-y-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading title="Cursos destacados" text="Puedes ver el temario completo de cada curso antes de comprarlo." />
          <Link href="/cursos" className="btn btn-ghost btn-sm">
            Ver todos los cursos
          </Link>
        </div>
        <Suspense fallback={<p className="text-subtle">Cargando cursos…</p>}>
          <CourseList limit={3} />
        </Suspense>
        <UpcomingCourses />
      </section>

      <section className="space-y-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading title="Pensado para que termines lo que empiezas" text="Ver, comprobar y preguntar, lección a lección." />
          <Link href="/como-funciona" className="btn btn-ghost btn-sm">
            Cómo funciona la plataforma
          </Link>
        </div>
        <ul className="grid gap-5 md:grid-cols-3">
          {highlights.map((f) => (
            <li key={f.title} className="glass space-y-3 p-6">
              <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-info/30 to-accent/30 text-accent">
                <FeatureIcon name={f.icon} />
              </span>
              <h3 className="text-lg">{f.title}</h3>
              <p className="text-sm text-muted">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass grid items-center gap-6 p-8 md:grid-cols-[1fr_auto] sm:p-10">
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl">Una plataforma de IDESIE Business &amp; Tech School</h2>
          <p className="text-muted">Conoce quiénes somos y cómo preparamos cada curso.</p>
        </div>
        <Link href="/sobre-nosotros" className="btn btn-ghost">
          Sobre nosotros
        </Link>
      </section>

      <FinalCta title="Empieza hoy tu próximo curso" text="Crea tu cuenta gratis, mira el temario de cada curso y empieza cuando quieras." />
    </div>
  );
}
