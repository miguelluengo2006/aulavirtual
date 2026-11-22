import { getPublishedCourses } from "@/lib/course-data";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { HeroDemo } from "@/components/landing/hero-demo";
import { formatPrice, plural } from "@/lib/format";

const steps = [
  {
    title: "Elige un curso",
    text: "Cómpralo suelto o suscríbete y accede a todo el catálogo.",
  },
  {
    title: "Mira cada lección",
    text: "Vídeos cortos y ordenados. Si lo dejas a medias, sigues justo donde estabas.",
  },
  {
    title: "Responde las preguntas clave",
    text: "Al final de cada vídeo, unas pocas preguntas para comprobar que lo has entendido.",
  },
  {
    title: "Pregunta lo que no te quede claro",
    text: "El profesor del curso responde tus dudas debajo de cada lección.",
  },
];

const features = [
  {
    icon: "progress",
    title: "Tu progreso, siempre a la vista",
    text: "La plataforma guarda lo que ves de verdad, lección a lección. Sabes qué te queda y retomas cada vídeo en el punto exacto.",
  },
  {
    icon: "question",
    title: "Preguntas clave después de cada vídeo",
    text: "No son exámenes: si fallas, ves la explicación y sigues. Sirven para fijar lo importante antes de pasar a lo siguiente.",
  },
  {
    icon: "teacher",
    title: "Profesores que responden",
    text: "Cada curso tiene su profesor. Deja tu duda en la lección y te contesta allí mismo, a la vista del resto de alumnos.",
  },
  {
    icon: "forum",
    title: "Un foro en cada curso",
    text: "Comparte avances y resuelve dudas con otros alumnos que están aprendiendo lo mismo que tú.",
  },
  {
    icon: "devices",
    title: "Desde cualquier dispositivo",
    text: "Ordenador, tablet o móvil, sin instalar nada. Tu progreso se sincroniza entre todos.",
  },
  {
    icon: "lock",
    title: "Contenido protegido",
    text: "Los vídeos se ven solo dentro de la plataforma, con tu cuenta. Así los cursos siguen mereciendo lo que cuestan.",
  },
] as const;

const faqs = [
  {
    q: "¿Cuánto tiempo tengo acceso a un curso?",
    a: "Si lo compras suelto, para siempre. Con la suscripción, a todos los cursos del catálogo mientras la tengas activa.",
  },
  {
    q: "¿Qué pasa si fallo las preguntas clave?",
    a: "Nada. Son de repaso: ves la explicación de cada respuesta y puedes repetirlas las veces que quieras. Nunca te impiden avanzar.",
  },
  {
    q: "¿Puedo descargar los vídeos?",
    a: "No. Todo el contenido se ve dentro de la plataforma, desde el navegador de cualquier dispositivo y con tu cuenta.",
  },
  {
    q: "¿Cómo pregunto una duda?",
    a: "Debajo de cada lección hay un espacio para dudas que atiende el profesor del curso. Para temas más generales, cada curso tiene su foro.",
  },
  {
    q: "¿Necesito instalar algo?",
    a: "No. Basta con un navegador actualizado en el ordenador, la tablet o el móvil.",
  },
  {
    q: "¿Puedo cancelar la suscripción?",
    a: "Sí, cuando quieras. Mantienes el acceso hasta el final del periodo que ya has pagado, y los cursos que hayas comprado sueltos siguen siendo tuyos.",
  },
];

export default function Home() {
  return (
    <div className="space-y-28 pb-8">
      {/* Portada */}
      <section className="grid items-center gap-10 pt-4 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div className="space-y-7">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl">
            Aprende en vídeo y comprueba lo que has entendido
          </h1>
          <p className="max-w-xl text-lg text-muted">
            Cursos en lecciones cortas, con preguntas clave al final de cada vídeo y profesores que
            responden tus dudas. Tu progreso se guarda solo, en cualquier dispositivo.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#cursos" className="btn btn-primary">
              Ver los cursos
            </a>
            <a href="#como-funciona" className="btn btn-ghost">
              Cómo funciona
            </a>
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

      {/* Cómo funciona */}
      <section id="como-funciona" className="scroll-mt-28 space-y-10">
        <SectionHeading
          title="Cómo funciona"
          text="Un método sencillo: ver, comprobar y preguntar. Lección a lección."
        />
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="glass space-y-3 p-6">
              <span className="grid size-10 place-items-center rounded-full bg-white text-sm font-semibold text-navy">
                {i + 1}
              </span>
              <h3 className="text-lg">{s.title}</h3>
              <p className="text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Ventajas */}
      <section className="space-y-10">
        <SectionHeading
          title="Pensado para que termines lo que empiezas"
          text="Todo lo que necesitas para aprender a tu ritmo, en un solo sitio."
        />
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

      {/* Catálogo */}
      <section id="cursos" className="scroll-mt-28 space-y-10">
        <SectionHeading
          title="Cursos"
          text="Elige por dónde empezar. Puedes ver el temario completo de cada curso antes de comprarlo."
        />
        <Suspense fallback={<p className="text-subtle">Cargando cursos…</p>}>
          <CourseList />
        </Suspense>
      </section>

      {/* Precios */}
      <section id="precios" className="scroll-mt-28 space-y-10">
        <SectionHeading
          title="Dos formas de acceder"
          text="Compra solo lo que te interesa o accede a todo con una suscripción."
        />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="glass flex flex-col gap-6 p-8">
            <div className="space-y-2">
              <h3 className="text-2xl">Curso suelto</h3>
              <p className="text-muted">Para cuando sabes exactamente qué quieres aprender.</p>
            </div>
            <ul className="flex-1 space-y-3 text-sm">
              <Perk>Pago único, sin cuotas</Perk>
              <Perk>Acceso para siempre al curso</Perk>
              <Perk>Preguntas clave, dudas y foro del curso</Perk>
              <Perk>Precio indicado en cada curso</Perk>
            </ul>
            <a href="#cursos" className="btn btn-ghost">
              Elegir un curso
            </a>
          </div>
          <div className="glass glass-strong relative flex flex-col gap-6 overflow-hidden p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-accent/20 blur-3xl"
            />
            <div className="relative space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-2xl">Suscripción</h3>
                <span className="chip chip-accent">Todo el catálogo</span>
              </div>
              <p className="text-muted">Para aprender sin límites y probar cursos nuevos.</p>
            </div>
            <ul className="relative flex-1 space-y-3 text-sm">
              <Perk>Todos los cursos incluidos en la suscripción</Perk>
              <Perk>Los cursos nuevos, en cuanto se publican</Perk>
              <Perk>Preguntas clave, dudas y foros de todos los cursos</Perk>
              <Perk>Cancela cuando quieras</Perk>
            </ul>
            <Link href="/registro" className="btn btn-primary relative">
              Crear cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section id="preguntas" className="scroll-mt-28 grid gap-10 lg:grid-cols-[1fr_1.6fr]">
        <SectionHeading title="Preguntas frecuentes" text="Lo que más nos preguntan antes de empezar." />
        <div className="space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="glass group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-medium [&::-webkit-details-marker]:hidden">
                {f.q}
                <span
                  aria-hidden
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-lg leading-none transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="px-6 pb-5 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Llamada final */}
      <section className="glass relative overflow-hidden px-8 py-14 text-center sm:px-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_20%_100%,rgb(59_130_246/0.3),transparent),radial-gradient(40%_70%_at_85%_0%,rgb(45_212_191/0.25),transparent)]"
        />
        <div className="relative mx-auto max-w-2xl space-y-6">
          <h2 className="text-3xl sm:text-4xl">Empieza hoy tu próximo curso</h2>
          <p className="text-lg text-muted">
            Crea tu cuenta gratis, mira el temario de cada curso y empieza cuando quieras.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/registro" className="btn btn-primary">
              Crear cuenta gratis
            </Link>
            <a href="#cursos" className="btn btn-ghost">
              Ver los cursos
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ title, text }: { title: string; text: string }) {
  return (
    <div className="max-w-2xl space-y-3">
      <h2 className="text-3xl sm:text-4xl">{title}</h2>
      <p className="text-lg text-muted">{text}</p>
    </div>
  );
}

function Check() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-4 shrink-0 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden
    >
      <path d="m4.5 10.5 3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Perk({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1">
        <Check />
      </span>
      <span>{children}</span>
    </li>
  );
}

function FeatureIcon({ name }: { name: (typeof features)[number]["icon"] }) {
  const paths: Record<typeof name, React.ReactNode> = {
    progress: <path d="M4 18V6m5 12V10m5 8V4m5 14v-6" />,
    question: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14m0 3h.01" />
      </>
    ),
    teacher: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>
    ),
    forum: <path d="M4 5h11v8H8l-4 3V5Zm7 11h5l4 3v-9h-3" />,
    devices: (
      <>
        <rect x="3" y="5" width="13" height="10" rx="1.5" />
        <path d="M7 19h5m6-11h3v11h-5V8z" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

async function CourseList() {
  await connection();
  const list = await getPublishedCourses();

  if (list.length === 0) {
    return (
      <div className="glass space-y-2 p-8">
        <p className="font-medium">Estamos preparando los primeros cursos.</p>
        <p className="text-muted">Crea tu cuenta y los encontrarás aquí en cuanto se publiquen.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((c) => (
        <li key={c.id}>
          <Link
            href={`/cursos/${c.slug}`}
            className="glass flex h-full flex-col gap-5 overflow-hidden transition-colors hover:bg-white/10"
          >
            <div className="relative h-28 bg-[radial-gradient(120%_140%_at_0%_0%,#1d4ed8_0%,#0b2a5c_50%,transparent_100%)]">
              <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_100%_100%,rgb(45_212_191/0.35),transparent_70%)]" />
              <span className="absolute bottom-3 left-6 text-sm text-white/80">
                {plural(c.lessonCount, "lección", "lecciones")}
                {c.totalSeconds >= 60 && `, ${Math.round(c.totalSeconds / 60)} min de vídeo`}
              </span>
            </div>
            <div className="flex-1 space-y-2 px-6">
              <h3 className="text-xl">{c.title}</h3>
              <p className="line-clamp-3 text-sm text-muted">{c.description}</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 pb-6 text-sm">
              <span className="text-lg font-semibold">{formatPrice(c.priceCents, c.currency)}</span>
              {c.includedInSubscription && <span className="chip chip-accent">En la suscripción</span>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
