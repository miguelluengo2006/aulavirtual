import type { Metadata } from "next";
import { Suspense } from "react";
import { CourseList, Faq, FinalCta, PageIntro, Plans, SectionHeading } from "@/components/landing/marketing";

export const metadata: Metadata = {
  title: "Cursos",
  description: "Catálogo de cursos de IDESIE AV: compra un curso suelto o accede a todos con la suscripción.",
};

const buyingFaqs = [
  {
    q: "¿Puedo ver el contenido antes de comprar?",
    a: "Sí. En la página de cada curso tienes el temario completo, con todas las lecciones y su duración.",
  },
  {
    q: "¿Cuánto tiempo tengo acceso a un curso?",
    a: "Si lo compras suelto, para siempre. Con la suscripción, a todos los cursos incluidos mientras la tengas activa.",
  },
  {
    q: "¿Puedo cancelar la suscripción?",
    a: "Sí, cuando quieras. Mantienes el acceso hasta el final del periodo que ya has pagado, y los cursos que hayas comprado sueltos siguen siendo tuyos.",
  },
  {
    q: "¿Puedo descargar los vídeos?",
    a: "No. Todo el contenido se ve dentro de la plataforma, desde el navegador de cualquier dispositivo y con tu cuenta.",
  },
];

// Tienda: catálogo, formas de acceso y dudas sobre la compra.
export default function StorePage() {
  return (
    <div className="space-y-24 pb-8">
      <PageIntro
        eyebrow="Tienda de cursos"
        title="Cursos"
        text="Elige por dónde empezar. Cada curso tiene lecciones en vídeo, preguntas clave después de cada una, un profesor que responde tus dudas y su propio foro."
      />

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
