import type { Metadata } from "next";
import Link from "next/link";
import { FinalCta, PageIntro, SectionHeading } from "@/components/landing/marketing";

export const metadata: Metadata = {
  title: "Sobre nosotros",
  description: "IDESIE AV es la plataforma de cursos en vídeo de IDESIE Business & Tech School.",
};

// Solo datos confirmados del material de IDESIE (ficha docente y curso). Lo que falte
// (historia, sede, contacto, equipo) se añade cuando IDESIE lo facilite: no inventar.
const commitments = [
  {
    title: "Cursos aplicados",
    text: "Pensados para usarse en el trabajo: casos reales, ejemplos del día a día y ejercicios para aplicar lo aprendido.",
  },
  {
    title: "Profesores que responden",
    text: "Cada curso tiene su profesor, que atiende las dudas de cada lección y participa en el foro del curso.",
  },
  {
    title: "Aprender comprobando",
    text: "Después de cada vídeo, preguntas sobre lo que se ha explicado. Sin trampas ni penalizaciones: para fijar lo importante.",
  },
  {
    title: "Contenido cuidado y protegido",
    text: "Los cursos se ven solo dentro de la plataforma, con tu cuenta, para que sigan mereciendo lo que cuestan.",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-24 pb-8">
      <PageIntro
        eyebrow="Sobre nosotros"
        title="IDESIE AV"
        text="La plataforma de cursos en vídeo de IDESIE Business & Tech School: formación online para profesionales, a su ritmo y con profesores que acompañan."
      />

      <section className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <SectionHeading title="Qué hacemos" text="Llevamos la formación de IDESIE a un formato online, sencillo y medible." />
        <div className="glass space-y-4 p-8 text-muted">
          <p>
            En IDESIE AV cada curso se organiza en módulos y lecciones cortas en vídeo. Cada lección incluye un resumen, unas
            preguntas para comprobar lo aprendido y un espacio para preguntar dudas al profesor.
          </p>
          <p>
            Nuestro primer curso es{" "}
            <Link href="/cursos/ia-aplicada-a-la-arquitectura" className="link">
              IA Aplicada a la Arquitectura
            </Link>
            , una asignatura del Master BIM de IDESIE: cómo integrar la inteligencia artificial generativa en el trabajo
            del arquitecto, desde entender cómo funciona un modelo de lenguaje hasta usar agentes dentro de Revit.
          </p>
        </div>
      </section>

      <section className="space-y-10">
        <SectionHeading title="Nuestro compromiso" text="Lo que puedes esperar de cualquier curso de IDESIE AV." />
        <ul className="grid gap-5 sm:grid-cols-2">
          {commitments.map((c) => (
            <li key={c.title} className="glass space-y-2 p-6">
              <h3 className="text-lg">{c.title}</h3>
              <p className="text-sm text-muted">{c.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <SectionHeading title="Profesores" text="Profesionales que enseñan lo que aplican en su trabajo." />
        <ul className="space-y-3">
          <li className="glass flex items-center gap-4 p-5">
            <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-white/10 text-lg font-semibold">
              J
            </span>
            <div>
              <p className="font-medium">José Carlos Martín Mateos</p>
              <p className="text-sm text-muted">Docente de IA Aplicada a la Arquitectura</p>
            </div>
          </li>
        </ul>
      </section>

      <FinalCta title="Empieza a aprender con nosotros" text="Crea tu cuenta gratis y revisa el temario completo de cada curso." />
    </div>
  );
}
