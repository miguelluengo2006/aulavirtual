import type { Metadata } from "next";
import Link from "next/link";
import { faqs, FeatureIcon, features, Faq, FinalCta, PageIntro, SectionHeading, steps } from "@/components/landing/marketing";

export const metadata: Metadata = {
  title: "Cómo funciona",
  description: "Cómo se aprende en IDESIE AV: lecciones en vídeo, resumen, preguntas clave, dudas con el profesor y foro del curso.",
};

// Lo que el alumno encuentra en cada lección, en el mismo orden que en la página de la lección.
const lessonParts = [
  { title: "El vídeo", text: "Una lección corta y al grano. Si lo dejas a medias, al volver sigue justo donde estabas." },
  { title: "Resumen del vídeo", text: "Las ideas principales de la lección en unas pocas frases, para repasar de un vistazo." },
  {
    title: "Preguntas clave",
    text: "5 preguntas sobre lo que se explica en el vídeo, sacadas de un banco más amplio: si repites, te salen otras. Ves la explicación de cada respuesta.",
  },
  { title: "Dudas", text: "Pregunta lo que no te haya quedado claro. El profesor del curso te responde en la misma lección." },
  { title: "Foro del curso", text: "Para temas más generales: comparte tus ejercicios y aprende con el resto de alumnos." },
];

export default function HowItWorksPage() {
  return (
    <div className="space-y-24 pb-8">
      <PageIntro
        eyebrow="Cómo funciona"
        title="Ver, comprobar y preguntar"
        text="Un método sencillo para aprender de verdad, lección a lección y a tu ritmo, desde cualquier dispositivo."
      />

      <section className="space-y-10">
        <SectionHeading title="Paso a paso" text="Del primer clic a terminar el curso." />
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="glass space-y-3 p-6">
              <span className="grid size-10 place-items-center rounded-full bg-white text-sm font-semibold text-navy">{i + 1}</span>
              <h3 className="text-lg">{s.title}</h3>
              <p className="text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <SectionHeading title="Dentro de cada lección" text="Todas las lecciones tienen la misma estructura, para que sepas siempre dónde está cada cosa." />
        <ol className="space-y-3">
          {lessonParts.map((p, i) => (
            <li key={p.title} className="glass flex gap-4 p-5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-semibold text-accent">{i + 1}</span>
              <div className="space-y-1">
                <h3 className="text-base font-medium">{p.title}</h3>
                <p className="text-sm text-muted">{p.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-10">
        <SectionHeading title="Pensado para que termines lo que empiezas" text="Todo lo que necesitas para aprender a tu ritmo, en un solo sitio." />
        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
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

      <section id="preguntas" className="scroll-mt-28 grid gap-10 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-4">
          <SectionHeading title="Preguntas frecuentes" text="Lo que más nos preguntan antes de empezar." />
          <p className="text-sm text-muted">
            ¿Dudas sobre precios o acceso? Mira la{" "}
            <Link href="/cursos#precios" className="link">
              tienda de cursos
            </Link>
            .
          </p>
        </div>
        <Faq items={faqs} />
      </section>

      <FinalCta title="Empieza hoy tu próximo curso" text="Crea tu cuenta gratis, mira el temario de cada curso y empieza cuando quieras." />
    </div>
  );
}
