"use client";

import { useEffect, useState, type ReactNode } from "react";

type Props = {
  /** Texto de la marca de agua (email del alumno y fecha). */
  watermark: string;
  children: ReactNode;
};

/**
 * Disuade de capturar el contenido de una lección. Ninguna web puede impedir
 * del todo una captura (la hace el sistema operativo), así que esto:
 * - pone una marca de agua suave con el email y la fecha por toda la lección,
 *   para que cualquier captura identifique a quien la hizo;
 * - tapa la lección al pulsar Imprimir pantalla o los atajos de captura
 *   (y borra la imagen del portapapeles en Windows);
 * - pausa el vídeo y oculta la lección si la ventana pierde el foco
 *   (herramientas de recortes, grabadores);
 * - impide seleccionar, copiar, arrastrar e imprimir.
 */
export function CaptureGuard({ watermark, children }: Props) {
  const [shield, setShield] = useState<null | "capture" | "away">(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pauseVideos = () =>
      document.querySelectorAll("video").forEach((v) => v.pause());

    const flash = () => {
      setShield("capture");
      pauseVideos();
      clearTimeout(timer);
      timer = setTimeout(
        () => setShield((s) => (s === "capture" ? null : s)),
        2500,
      );
    };

    const isCaptureShortcut = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      return (
        e.key === "PrintScreen" ||
        // macOS: Cmd+Mayús+3/4/5/6
        (e.metaKey && e.shiftKey && ["3", "4", "5", "6"].includes(k)) ||
        // Windows: Win+Mayús+S (recortes)
        (e.metaKey && e.shiftKey && k === "s")
      );
    };

    const onKey = (e: KeyboardEvent) => {
      if (!isCaptureShortcut(e)) return;
      flash();
      // Windows guarda la captura en el portapapeles: la sustituimos por un texto.
      if (e.key === "PrintScreen") {
        navigator.clipboard
          ?.writeText("Contenido protegido de IDESIE AV")
          .catch(() => {});
      }
    };

    const onBlur = () => {
      pauseVideos();
      setShield("away");
    };
    const onFocus = () => setShield((s) => (s === "away" ? null : s));
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onBlur();
      else if (document.hasFocus()) onFocus(); // móviles: al volver a la app no siempre llega "focus"
    };

    // PrintScreen en Windows solo dispara keyup; los atajos, keydown.
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const block = (e: { preventDefault: () => void }) => e.preventDefault();

  return (
    <div
      className="capture-guard relative min-w-0 select-none"
      onCopy={block}
      onCut={block}
      onDragStart={block}
      onContextMenu={block}
    >
      {children}

      {/* Marca de agua en mosaico: cualquier recorte la incluye. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      >
        <div className="absolute -inset-1/4 grid -rotate-[20deg] grid-cols-3 content-around gap-y-24 opacity-[0.07] sm:grid-cols-4">
          {Array.from({ length: 48 }, (_, i) => (
            <span
              key={i}
              className="whitespace-nowrap text-center text-sm font-medium text-white"
            >
              {watermark}
            </span>
          ))}
        </div>
      </div>

      {shield && (
        <div
          role="status"
          className="absolute inset-0 z-20 flex items-start justify-center rounded-3xl bg-navy/95 p-8 pt-24 text-center backdrop-blur-xl"
        >
          <p className="max-w-sm text-muted">
            {shield === "capture"
              ? "El contenido del curso está protegido y no se puede capturar."
              : "Vuelve a esta ventana para seguir con la lección."}
          </p>
        </div>
      )}
    </div>
  );
}
