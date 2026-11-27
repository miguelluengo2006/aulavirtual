// Piezas compartidas de las páginas públicas (inicio, tienda, cómo funciona, sobre nosotros).
import Link from "next/link";
import { connection } from "next/server";
import { getPublishedCourses } from "@/lib/course-data";
import { formatPrice, formatTotalMinutes, plural } from "@/lib/format";

export const steps = [
  {
    title: "Elige un curso",
    text: "Cómpralo suelto o suscríbete y accede a todo el catálogo.",
  },
  {
    title: "Mira cada lección",
    text: "Vídeos cortos y ordenados. Si lo dejas a medias, sigues justo donde estabas.",
  },
  {
    title: "Comprueba lo que has entendido",
    text: "Al final de cada vídeo, 5 preguntas sobre lo que se explica. Si repites, te salen otras distintas.",
  },
  {
    title: "Pregunta lo que no te quede claro",
    text: "El profesor del curso responde tus dudas debajo de cada lección.",
  },
];

export const features = [
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

// Lo que el alumno encuentra en cada lección, en el mismo orden que en la página de la lección.
export const lessonParts = [
  { title: "El vídeo", text: "Una lección corta y al grano. Si lo dejas a medias, al volver sigue justo donde estabas." },
  { title: "Resumen del vídeo", text: "Las ideas principales de la lección en unas pocas frases, para repasar de un vistazo." },
  { title: "Recursos", text: "Cuando la lección o el módulo los tiene: documentos, planos, modelos o enlaces para practicar." },
  {
    title: "Test",
    text: "En su propia pestaña, aparte del vídeo: 5 preguntas sacadas de un banco más amplio, así que si repites te salen otras. Ves la explicación de cada respuesta.",
  },
  { title: "Dudas", text: "Pregunta lo que no te haya quedado claro. El profesor del curso te responde en la misma lección." },
  { title: "Foro del curso", text: "Para temas más generales: comparte tus ejercicios y aprende con el resto de alumnos." },
];

export const buyingFaqs = [
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

export const faqs = [
  {
    q: "¿Cuánto tiempo tengo acceso a un curso?",
    a: "Si lo compras suelto, para siempre. Con la suscripción, a todos los cursos del catálogo mientras la tengas activa.",
  },
  {
    q: "¿Qué pasa si fallo las preguntas clave?",
    a: "Nada. Son de repaso: ves la explicación de cada respuesta y puedes volver a intentarlo con otras preguntas de la misma lección. Nunca te impiden avanzar.",
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

export function SectionHeading({ title, text }: { title: string; text: string }) {
  return (
    <div className="max-w-2xl space-y-3">
      <h2 className="text-3xl sm:text-4xl">{title}</h2>
      <p className="text-lg text-muted">{text}</p>
    </div>
  );
}

export function Check() {
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

export function Perk({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1">
        <Check />
      </span>
      <span>{children}</span>
    </li>
  );
}

export function FeatureIcon({ name }: { name: (typeof features)[number]["icon"] }) {
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

/** Tono de la portada de cada curso: estable a partir de su dirección, dentro de la paleta azul-turquesa. */
function coverHue(slug: string) {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 195 + (h % 40); // 195–235: del turquesa al azul
}

/** Portada generada de un curso: degradados, retícula y brillo. Sin imágenes externas. */
export function CourseCover({
  slug,
  className = "",
  children,
}: {
  slug: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const hue = coverHue(slug);
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(120% 140% at 0% 0%, hsl(${hue + 10} 90% 45%) 0%, hsl(${hue + 20} 80% 22%) 45%, #061430 100%)`,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-25 [mask-image:radial-gradient(80%_80%_at_70%_30%,black,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(255 255 255 / 0.18) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.18) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-16 -right-10 size-56 rounded-full blur-3xl"
        style={{ background: `hsl(${hue - 25} 80% 55% / 0.45)` }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

type CatalogCourse = Awaited<ReturnType<typeof getPublishedCourses>>[number];

function CourseMeta({ c }: { c: CatalogCourse }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/80">
      <li>{plural(c.moduleCount, "módulo", "módulos")}</li>
      <li>{plural(c.lessonCount, "lección", "lecciones")}</li>
      {c.totalSeconds >= 60 && <li>{formatTotalMinutes(c.totalSeconds)} de vídeo</li>}
    </ul>
  );
}

/** Tarjeta de un curso en la tienda. `featured`: versión ancha, para destacar. */
export function CourseCard({ c, featured = false }: { c: CatalogCourse; featured?: boolean }) {
  const teacher = c.instructors[0];
  return (
    <Link
      href={`/cursos/${c.slug}`}
      className={`group glass flex h-full overflow-hidden !rounded-[2rem] transition duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-2xl hover:shadow-black/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${featured ? "flex-col md:flex-row" : "flex-col"}`}
    >
      <CourseCover slug={c.slug} className={featured ? "min-h-56 md:w-[44%] md:shrink-0" : "h-44"}>
        <div className="flex h-full flex-col justify-between p-6">
          <div className="flex flex-wrap gap-2">
            <span className="chip border-white/20 bg-black/25 text-white backdrop-blur-sm">Online · a tu ritmo</span>
            {c.includedInSubscription && (
              <span className="chip chip-accent backdrop-blur-sm">En la suscripción</span>
            )}
          </div>
          <CourseMeta c={c} />
        </div>
      </CourseCover>
      <div className="flex flex-1 flex-col gap-5 p-6 sm:p-8">
        <div className="flex-1 space-y-3">
          <h3 className={featured ? "text-3xl sm:text-4xl" : "text-2xl"}>{c.title}</h3>
          <p className={`text-muted ${featured ? "line-clamp-4 text-lg" : "line-clamp-3 text-sm"}`}>{c.description}</p>
          {teacher && (
            <p className="flex items-center gap-2.5 pt-1 text-sm">
              <span aria-hidden className="grid size-7 place-items-center rounded-full bg-white/10 text-xs font-semibold">
                {teacher.name.charAt(0)}
              </span>
              <span className="text-muted">
                Con <span className="text-white">{teacher.name}</span>
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <span className="text-2xl font-semibold tracking-tight">{formatPrice(c.priceCents, c.currency)}</span>
          <span className="btn btn-primary btn-sm transition group-hover:bg-white/90">Ver ficha del curso</span>
        </div>
      </div>
    </Link>
  );
}

/**
 * Cursos publicados. Con `limit`, solo los primeros (portada).
 * Si solo hay uno, se muestra en grande (ficha destacada).
 */
export async function CourseList({ limit }: { limit?: number } = {}) {
  await connection();
  const all = await getPublishedCourses();
  const list = limit ? all.slice(0, limit) : all;

  if (list.length === 0) {
    return (
      <div className="glass space-y-2 p-8">
        <p className="font-medium">Estamos preparando los primeros cursos.</p>
        <p className="text-muted">Crea tu cuenta y los encontrarás aquí en cuanto se publiquen.</p>
      </div>
    );
  }
  if (list.length === 1) return <CourseCard c={list[0]} featured />;
  return (
    <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {list.map((c) => (
        <li key={c.id}>
          <CourseCard c={c} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Cursos que se están preparando (aún sin publicar). Solo título: sin precio,
 * temario ni fechas hasta que estén confirmados. Quitar de aquí al publicarlo.
 */
export const upcomingCourses: readonly { slug: string; title: string }[] = [
  { slug: "master-bim-online", title: "Master BIM Online" },
];

/** Bloque «Próximamente» con los cursos en preparación. */
export function UpcomingCourses() {
  if (upcomingCourses.length === 0) return null;
  return (
    <div className="space-y-4">
      <h3 className="text-xl">Próximamente</h3>
      <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {upcomingCourses.map((c) => (
          <li key={c.slug} className="glass flex h-full flex-col overflow-hidden !rounded-[2rem]">
            <CourseCover slug={c.slug} className="h-32">
              <div className="p-6">
                <span className="chip border-white/20 bg-black/25 text-white">En preparación</span>
              </div>
            </CourseCover>
            <div className="space-y-2 p-6">
              <p className="text-2xl font-semibold tracking-tight">{c.title}</p>
              <p className="text-sm text-muted">
                Estamos preparando este curso. Crea tu cuenta y lo encontrarás aquí en cuanto se publique.
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Cabecera de una página pública (un único h1 por página). */
export function PageIntro({ eyebrow, title, text }: { eyebrow?: string; title: string; text: string }) {
  return (
    <header className="max-w-3xl space-y-4">
      {eyebrow && <p className="text-sm font-medium text-accent">{eyebrow}</p>}
      <h1 className="text-4xl sm:text-5xl">{title}</h1>
      <p className="text-lg text-muted">{text}</p>
    </header>
  );
}

/** Las dos formas de acceder: curso suelto y suscripción. */
export function Plans() {
  return (
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
        <Link href="/cursos#catalogo" className="btn btn-ghost">
          Elegir un curso
        </Link>
      </div>
      <div className="glass glass-strong relative flex flex-col gap-6 overflow-hidden p-8">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-accent/20 blur-3xl" />
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
  );
}

/** Preguntas frecuentes desplegables. */
export function Faq({ items }: { items: readonly { q: string; a: string }[] }) {
  return (
    <div className="space-y-3">
      {items.map((f) => (
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
  );
}

/** Llamada final al pie de cada página. */
export function FinalCta({ title, text }: { title: string; text: string }) {
  return (
    <section className="glass relative overflow-hidden px-8 py-14 text-center sm:px-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_20%_100%,rgb(59_130_246/0.3),transparent),radial-gradient(40%_70%_at_85%_0%,rgb(45_212_191/0.25),transparent)]"
      />
      <div className="relative mx-auto max-w-2xl space-y-6">
        <h2 className="text-3xl sm:text-4xl">{title}</h2>
        <p className="text-lg text-muted">{text}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/registro" className="btn btn-primary">
            Crear cuenta gratis
          </Link>
          <Link href="/cursos" className="btn btn-ghost">
            Ver los cursos
          </Link>
        </div>
      </div>
    </section>
  );
}
