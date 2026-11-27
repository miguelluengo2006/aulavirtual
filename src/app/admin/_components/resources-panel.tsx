"use client";

import { useId, useState } from "react";
import {
  addFileResource,
  addLinkResource,
  deleteResource,
  moveResource,
  prepareResourceUpload,
  renameResource,
} from "../_actions/resources";
import { formatBytes, isAllowedResourceFile, MAX_RESOURCE_BYTES, RESOURCE_EXTENSIONS, resourceLabel } from "@/lib/resource-rules";
import { ConfirmButton, Dialog, useAdminAction, useToast } from "./feedback";

export type AdminResource = {
  id: string;
  lessonId: string | null;
  moduleId: string | null;
  kind: "link" | "file";
  title: string;
  url: string | null;
  fileName: string | null;
  sizeBytes: number | null;
};
type Parent = { type: "lesson" | "module"; id: string; title: string };
type Module = { id: string; title: string; lessons: { id: string; title: string }[] };

/** Pestaña "Recursos": material de cada módulo y de cada lección (archivos o enlaces). */
export function ResourcesPanel({ modules, resources }: { modules: Module[]; resources: AdminResource[] }) {
  const [adding, setAdding] = useState<Parent | null>(null);
  const ofModule = (id: string) => resources.filter((r) => r.moduleId === id);
  const ofLesson = (id: string) => resources.filter((r) => r.lessonId === id);

  if (modules.length === 0) {
    return <p className="a-muted text-sm">Primero crea módulos y lecciones en la pestaña Temario.</p>;
  }

  return (
    <div className="space-y-5">
      {modules.map((m, mi) => (
        <section key={m.id} className="a-card overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e1e7f0] bg-[#f8fafd] px-5 py-4">
            <div>
              <p className="a-subtle text-xs">Módulo {mi + 1}</p>
              <h3 className="font-semibold">{m.title}</h3>
            </div>
            <button type="button" className="a-btn a-btn-secondary a-btn-sm" onClick={() => setAdding({ type: "module", id: m.id, title: m.title })}>
              Añadir recurso al módulo
            </button>
          </div>
          <div className="px-5 py-3">
            <ResourceList items={ofModule(m.id)} empty="Sin recursos para todo el módulo." />
          </div>
          <ul className="divide-y divide-[#eef2f7] border-t border-[#e1e7f0]">
            {m.lessons.map((l, li) => {
              const items = ofLesson(l.id);
              return (
                <li key={l.id} className="space-y-2 px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm">
                      <span className="a-subtle tabular-nums">{mi + 1}.{li + 1}</span> <span className="font-medium">{l.title}</span>
                      {items.length > 0 && <span className="a-chip a-chip-blue ml-2">{items.length}</span>}
                    </p>
                    <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={() => setAdding({ type: "lesson", id: l.id, title: l.title })}>
                      Añadir recurso
                    </button>
                  </div>
                  {items.length > 0 && <ResourceList items={items} />}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <AddResourceDialog parent={adding} onClose={() => setAdding(null)} />
    </div>
  );
}

function ResourceList({ items, empty }: { items: AdminResource[]; empty?: string }) {
  if (items.length === 0) return empty ? <p className="a-subtle text-sm">{empty}</p> : null;
  return (
    <ul className="space-y-1.5">
      {items.map((r, i) => (
        <ResourceRow key={r.id} r={r} first={i === 0} last={i === items.length - 1} />
      ))}
    </ul>
  );
}

function ResourceRow({ r, first, last }: { r: AdminResource; first: boolean; last: boolean }) {
  const { run, pending } = useAdminAction();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(r.title);
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-[#e1e7f0] px-3 py-2 text-sm">
      <span className={`a-chip ${r.kind === "file" ? "a-chip-teal" : "a-chip-blue"}`}>{resourceLabel(r)}</span>
      {editing ? (
        <form
          className="flex flex-1 flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => renameResource({ id: r.id, title }), "Recurso renombrado.", () => setEditing(false));
          }}
        >
          <input className="a-input min-w-48 flex-1" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} aria-label="Título del recurso" />
          <button className="a-btn a-btn-primary a-btn-sm" disabled={pending}>Guardar</button>
          <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={() => setEditing(false)}>Cancelar</button>
        </form>
      ) : (
        <>
          <span className="min-w-0 flex-1">
            <span className="font-medium">{r.title}</span>
            <span className="a-subtle ml-2 text-xs">
              {r.kind === "file" ? [r.fileName, formatBytes(r.sizeBytes)].filter(Boolean).join(" · ") : r.url}
            </span>
          </span>
          <span className="flex items-center gap-1">
            <button type="button" className="a-btn a-btn-ghost a-btn-sm" disabled={first || pending} aria-label="Subir" onClick={() => run(() => moveResource({ id: r.id, direction: "up" }))}>↑</button>
            <button type="button" className="a-btn a-btn-ghost a-btn-sm" disabled={last || pending} aria-label="Bajar" onClick={() => run(() => moveResource({ id: r.id, direction: "down" }))}>↓</button>
            <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={() => setEditing(true)}>Renombrar</button>
            <ConfirmButton
              label="Quitar"
              className="a-btn a-btn-danger-soft a-btn-sm"
              title={`¿Quitar "${r.title}"?`}
              description={r.kind === "file" ? "El archivo se borra y los alumnos dejarán de verlo." : "Los alumnos dejarán de ver este enlace."}
              confirmLabel="Quitar recurso"
              danger
              onConfirm={() => run(() => deleteResource({ id: r.id }), "Recurso quitado.")}
            />
          </span>
        </>
      )}
    </li>
  );
}

/** Sube el archivo directamente a R2 con la URL firmada (con barra de progreso). */
function uploadTo(url: string, file: File, contentType: string, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}

function AddResourceDialog({ parent, onClose }: { parent: Parent | null; onClose: () => void }) {
  const ids = useId();
  const toast = useToast();
  const { run, pending } = useAdminAction();
  const [kind, setKind] = useState<"file" | "link">("file");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const busy = pending || progress !== null;

  const close = () => {
    if (progress !== null) return; // no cerrar a mitad de subida
    setTitle("");
    setUrl("");
    setFile(null);
    setKind("file");
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parent) return;
    const p = { type: parent.type, id: parent.id };
    if (kind === "link") {
      const ok = await run(() => addLinkResource({ parent: p, title, url }), "Enlace añadido.");
      if (ok) close();
      return;
    }
    if (!file) return;
    if (!isAllowedResourceFile(file.name)) {
      toast({ tone: "error", text: "Ese tipo de archivo no se admite." });
      return;
    }
    if (file.size > MAX_RESOURCE_BYTES) {
      toast({ tone: "error", text: `El archivo pesa más de ${formatBytes(MAX_RESOURCE_BYTES)}.` });
      return;
    }
    let prepared: { key: string; uploadUrl: string; contentType: string } | null = null;
    await run(
      () => prepareResourceUpload({ parent: p, fileName: file.name, contentType: file.type || "application/octet-stream", size: file.size }),
      undefined,
      (d) => (prepared = d),
    );
    if (!prepared) return;
    const { key, uploadUrl, contentType } = prepared;
    setProgress(0);
    try {
      await uploadTo(uploadUrl, file, contentType, setProgress);
    } catch {
      setProgress(null);
      toast({
        tone: "error",
        text: "No se ha podido subir el archivo. Si es la primera vez, revisa que el CORS del bucket de R2 permita PUT desde la web.",
      });
      return;
    }
    setProgress(null);
    const ok = await run(
      () => addFileResource({ parent: p, title: title.trim() || file.name.replace(/\.[^.]+$/, ""), key, fileName: file.name, contentType }),
      "Archivo subido.",
    );
    if (ok) close();
  };

  return (
    <Dialog open={parent !== null} onClose={close} title={parent ? `Añadir recurso a ${parent.type === "module" ? "el módulo" : "la lección"} "${parent.title}"` : ""} wide>
      <form onSubmit={submit} className="space-y-4">
        <div role="radiogroup" aria-label="Tipo de recurso" className="flex gap-2">
          {(["file", "link"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={`a-btn a-btn-sm ${kind === k ? "a-btn-primary" : "a-btn-secondary"}`}
            >
              {k === "file" ? "Subir un archivo" : "Añadir un enlace"}
            </button>
          ))}
        </div>

        {kind === "file" ? (
          <div className="space-y-1.5">
            <label htmlFor={`${ids}-f`} className="a-label">Archivo</label>
            <input
              id={`${ids}-f`}
              type="file"
              className="a-input"
              accept={RESOURCE_EXTENSIONS.map((e) => `.${e}`).join(",")}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
            <p className="a-help">PDF, Office, imágenes, ZIP o modelos (DWG, IFC, RVT…). Hasta {formatBytes(MAX_RESOURCE_BYTES)}.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor={`${ids}-u`} className="a-label">Enlace</label>
            <input id={`${ids}-u`} type="url" className="a-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" required />
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor={`${ids}-t`} className="a-label">Título que verán los alumnos</label>
          <input
            id={`${ids}-t`}
            className="a-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
            placeholder={kind === "file" ? "Si lo dejas vacío, se usa el nombre del archivo" : "Por ejemplo: Guía oficial de IFC"}
            required={kind === "link"}
          />
        </div>

        {progress !== null && (
          <div className="space-y-1">
            <div className="h-2 overflow-hidden rounded-full bg-[#e8eef7]">
              <div className="h-full bg-[#1d4ed8] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="a-subtle text-xs">Subiendo… {progress} %</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="a-btn a-btn-ghost" onClick={close} disabled={progress !== null}>Cancelar</button>
          <button type="submit" className="a-btn a-btn-primary" disabled={busy}>
            {kind === "file" ? (progress !== null ? "Subiendo…" : "Subir archivo") : "Añadir enlace"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
