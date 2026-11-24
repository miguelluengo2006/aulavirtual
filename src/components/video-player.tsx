"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  lessonId: string;
  watermark: string;
  startAt?: number;
};

const BEAT_MS = 10_000;

/**
 * Reproductor HLS protegido:
 * - pide la playlist al servidor (que comprueba el acceso y firma los segmentos),
 * - marca de agua móvil con el email del alumno (también en pantalla completa),
 * - sin menú contextual ni botón de descarga,
 * - envía latidos de progreso con los tramos realmente reproducidos.
 */
export function VideoPlayer({ lessonId, watermark, startAt = 0 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [mark, setMark] = useState({ top: 12, left: 12 });

  // Carga del vídeo.
  useEffect(() => {
    const video = videoRef.current!;
    const src = `/api/video/${lessonId}/playlist`;
    let destroy = () => {};
    let cancelled = false;

    const resume = startAt > 5 ? startAt : -1;
    // Solo para Safari (HLS nativo): hls.js ya empieza a cargar directamente en `resume`.
    const seekToStart = () => {
      if (resume > 0 && video.duration && resume < video.duration - 5) video.currentTime = resume;
    };

    (async () => {
      const { default: Hls } = await import("hls.js");
      if (cancelled) return;
      if (Hls.isSupported()) {
        const retry = { maxNumRetry: 6, retryDelayMs: 500, maxRetryDelayMs: 8000 };
        const hls = new Hls({
          enableWorker: true,
          // Empieza a descargar donde lo dejó el alumno, no desde el principio.
          startPosition: resume,
          // Pide el primer segmento mientras aún se prepara el reproductor.
          startFragPrefetch: true,
          // ~30 s por delante (hasta 90 s si la conexión va sobrada) y suelta lo visto
          // hace más de 60 s para no llenar la memoria en móviles y vídeos largos.
          maxBufferLength: 30,
          maxMaxBufferLength: 90,
          backBufferLength: 60,
          // Redes inestables (móvil, wifi de obra): más reintentos antes de rendirse.
          fragLoadPolicy: {
            default: {
              maxTimeToFirstByteMs: 10_000,
              maxLoadTimeMs: 60_000,
              timeoutRetry: retry,
              errorRetry: retry,
            },
          },
        });
        // Recuperaciones tras errores graves de red: sin límite, un fallo permanente
        // (p. ej. R2 bloqueando la descarga) dejaría la pantalla en negro sin aviso.
        let networkRecoveries = 0;
        hls.on(Hls.Events.FRAG_LOADED, () => {
          networkRecoveries = 0;
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          const status = (data.response as { code?: number } | undefined)?.code;
          console.warn(`[vídeo] ${data.type}: ${data.details}${status ? ` (HTTP ${status})` : ""}`);
          if (status === 401) setError("Tu sesión ha caducado. Vuelve a entrar.");
          else if (status === 404) setError("Este vídeo todavía no está disponible.");
          else if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRecoveries >= 3) {
            setError("No se ha podido cargar el vídeo. Revisa tu conexión y vuelve a cargar la página.");
            hls.stopLoad();
          } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            networkRecoveries++;
            hls.startLoad();
          }
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else setError("No se ha podido reproducir el vídeo.");
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        destroy = () => hls.destroy();
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.addEventListener("loadedmetadata", seekToStart, { once: true });
        video.src = src; // Safari reproduce HLS de forma nativa
      } else {
        setError("Tu navegador no puede reproducir este vídeo.");
      }
    })();

    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", seekToStart);
      destroy();
    };
  }, [lessonId, startAt]);

  // Seguimiento de lo visto.
  useEffect(() => {
    const video = videoRef.current!;
    const sessionId = crypto.randomUUID();
    let start: number | null = null;
    let last = 0;

    const send = (from: number, to: number, beacon = false) => {
      if (to - from < 1) return;
      const body = JSON.stringify({
        lessonId,
        sessionId,
        from,
        to,
        duration: Number.isFinite(video.duration) ? video.duration : undefined,
      });
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/progress", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    };

    // Envía el tramo [start, last] y empieza uno nuevo.
    const flush = (beacon = false) => {
      if (start !== null) send(start, last, beacon);
      start = video.paused ? null : last;
    };

    const onTime = () => {
      const t = video.currentTime;
      if (video.paused || video.seeking) return;
      if (start === null) start = t;
      else if (t < last || t - last > 2) {
        // Salto: cierra el tramo anterior y empieza otro.
        send(start, last);
        start = t;
      }
      last = t;
    };
    const onSeeking = () => {
      if (start !== null) send(start, last);
      start = null;
    };
    const onPause = () => flush();
    const onHide = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    const onPageHide = () => flush(true);

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("seeking", onSeeking);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onPause);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    const timer = setInterval(() => {
      if (!video.paused) flush();
    }, BEAT_MS);

    const onEnded = () => document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth" });
    video.addEventListener("ended", onEnded);

    return () => {
      flush(true);
      clearInterval(timer);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("seeking", onSeeking);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onPause);
      video.removeEventListener("ended", onEnded);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [lessonId]);

  // La marca de agua cambia de sitio cada 20 s.
  useEffect(() => {
    const t = setInterval(
      () => setMark({ top: 5 + Math.random() * 75, left: 5 + Math.random() * 60 }),
      20_000,
    );
    return () => clearInterval(t);
  }, []);

  const toggleFullscreen = () => {
    const el = containerRef.current!;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl shadow-black/50"
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        ref={videoRef}
        className="h-full w-full"
        controls
        playsInline
        preload="metadata"
        // Pantalla completa propia (botón abajo) para que la marca de agua no desaparezca.
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
      />
      <span
        aria-hidden
        className="pointer-events-none absolute select-none text-xs font-medium text-white/40 transition-all duration-1000 [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]"
        style={{ top: `${mark.top}%`, left: `${mark.left}%` }}
      >
        {watermark}
      </span>
      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label="Pantalla completa"
        title="Pantalla completa"
        className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md hover:bg-black/75"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
      </button>
      {error && (
        <div role="alert" className="absolute inset-0 flex items-center justify-center bg-black/85 p-6 text-center text-muted">
          {error}
        </div>
      )}
    </div>
  );
}
