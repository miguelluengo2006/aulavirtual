"use client";

import { useState } from "react";
import { updateCourse } from "../_actions/courses";
import { parsePrice } from "@/lib/admin/rules";
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

export function CourseForm({ course }: { course: Course }) {
  const toast = useToast();
  const { run, pending } = useAdminAction();
  const [title, setTitle] = useState(course.title);
  const [slug, setSlug] = useState(course.slug);
  const [description, setDescription] = useState(course.description);
  const [price, setPrice] = useState(centsToText(course.priceCents));
  const [currency, setCurrency] = useState<"eur" | "usd">((course.currency as "eur" | "usd") ?? "eur");
  const [inSub, setInSub] = useState(course.includedInSubscription);

  return (
    <form
      className="grid gap-5 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const priceCents = parsePrice(price);
        if (priceCents === "invalid") {
          toast({ tone: "error", text: "Escribe el precio en euros, por ejemplo 49 o 49,90." });
          return;
        }
        await run(
          () => updateCourse({ id: course.id, title, slug, description, priceCents, currency, includedInSubscription: inSub }),
          "Datos del curso guardados.",
        );
      }}
    >
      <label className="block md:col-span-2">
        <span className="a-label">Título</span>
        <input className="a-input" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="block">
        <span className="a-label">Dirección web</span>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm a-subtle">/cursos/</span>
          <input
            className="a-input font-mono text-sm"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title="Solo minúsculas, números y guiones"
            maxLength={80}
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
          />
        </div>
        {slug !== course.slug && <span className="a-help text-amber-700">Cambiar la dirección rompe los enlaces antiguos al curso.</span>}
      </label>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <label className="block">
          <span className="a-label">Precio</span>
          <input className="a-input" inputMode="decimal" placeholder="Sin precio todavía" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label className="block">
          <span className="a-label">Moneda</span>
          <select className="a-input pr-8" value={currency} onChange={(e) => setCurrency(e.target.value as "eur" | "usd")}>
            <option value="eur">EUR</option>
            <option value="usd">USD</option>
          </select>
        </label>
      </div>
      <label className="block md:col-span-2">
        <span className="a-label">Descripción</span>
        <textarea className="a-input min-h-28" required maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e1e7f0] p-4 md:col-span-2">
        <input type="checkbox" className="mt-0.5 size-4 accent-[#1d4ed8]" checked={inSub} onChange={(e) => setInSub(e.target.checked)} />
        <span className="text-sm">
          <span className="block font-medium">Incluido en la suscripción</span>
          <span className="a-muted">Los suscriptores podrán verlo sin comprarlo aparte.</span>
        </span>
      </label>
      <div className="md:col-span-2">
        <button disabled={pending} className="a-btn a-btn-primary">{pending ? "Guardando…" : "Guardar cambios"}</button>
      </div>
    </form>
  );
}
