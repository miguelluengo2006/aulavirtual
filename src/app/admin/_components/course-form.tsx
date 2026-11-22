"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCourse, updateCourse } from "../_actions/courses";
import { parsePrice, slugify } from "@/lib/admin/rules";
import { useAdminAction, useToast } from "./feedback";

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string;
  priceCents: number | null;
  currency: string;
  includedInSubscription: boolean;
};

const centsToText = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2).replace(".", ","));

export function CourseForm({ course }: { course?: Course }) {
  const router = useRouter();
  const toast = useToast();
  const { run, pending } = useAdminAction();
  const [title, setTitle] = useState(course?.title ?? "");
  const [slug, setSlug] = useState(course?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(course));
  const [description, setDescription] = useState(course?.description ?? "");
  const [price, setPrice] = useState(centsToText(course?.priceCents ?? null));
  const [currency, setCurrency] = useState<"eur" | "usd">((course?.currency as "eur" | "usd") ?? "eur");
  const [inSub, setInSub] = useState(course?.includedInSubscription ?? true);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = parsePrice(price);
    if (priceCents === "invalid") {
      toast({ tone: "error", text: "Escribe el precio en euros, por ejemplo 49 o 49,90." });
      return;
    }
    const fields = { title, slug, description, priceCents, currency, includedInSubscription: inSub };
    if (course) {
      await run(() => updateCourse({ id: course.id, ...fields }), "Datos del curso guardados.");
    } else {
      await run(() => createCourse(fields), "Curso creado como borrador.", (d) => router.push(`/admin/cursos/${d.id}`));
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 md:grid-cols-2">
      <label className="block space-y-1.5 md:col-span-2">
        <span className="pl-1 text-sm text-muted">Título</span>
        <input
          className="field"
          required
          maxLength={160}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="pl-1 text-sm text-muted">Dirección web</span>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm text-subtle">/cursos/</span>
          <input
            className="field font-mono text-sm"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title="Solo minúsculas, números y guiones"
            maxLength={80}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
          />
        </div>
        {course && slug !== course.slug && (
          <span className="block pl-1 text-xs text-warning">
            Cambiar la dirección rompe los enlaces antiguos al curso.
          </span>
        )}
      </label>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <label className="block space-y-1.5">
          <span className="pl-1 text-sm text-muted">Precio</span>
          <input
            className="field"
            inputMode="decimal"
            placeholder="Sin precio todavía"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="pl-1 text-sm text-muted">Moneda</span>
          <select className="field pr-8" value={currency} onChange={(e) => setCurrency(e.target.value as "eur" | "usd")}>
            <option value="eur">EUR</option>
            <option value="usd">USD</option>
          </select>
        </label>
      </div>
      <label className="block space-y-1.5 md:col-span-2">
        <span className="pl-1 text-sm text-muted">Descripción</span>
        <textarea
          className="field min-h-28 rounded-3xl py-3"
          required
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label className="flex cursor-pointer items-center gap-3 pl-1 text-sm md:col-span-2">
        <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={inSub} onChange={(e) => setInSub(e.target.checked)} />
        Incluido en la suscripción a todo el catálogo
      </label>
      <div className="md:col-span-2">
        <button disabled={pending} className="btn btn-primary">
          {pending ? "Guardando…" : course ? "Guardar cambios" : "Crear curso"}
        </button>
      </div>
    </form>
  );
}
