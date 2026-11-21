// Cálculo de progreso de vídeo. Funciones puras, con tests.

export type Range = [number, number];

/** Duración máxima de un latido: el cliente envía cada 10 s, con margen. */
export const MAX_BEAT_SECONDS = 25;
/** Segundos de vídeo que se aceptan por sesión en una ventana de 60 s (permite 1,25×). */
export const MAX_SECONDS_PER_MINUTE = 75;
/** Porcentaje visto a partir del cual una lección cuenta como completada. */
export const COMPLETION_RATIO = 0.9;

/** Une un tramo nuevo a los ya vistos (ordenados y sin solapes). */
export function mergeRange(ranges: Range[], next: Range): Range[] {
  const all = [...ranges, next].sort((a, b) => a[0] - b[0]);
  const out: Range[] = [];
  for (const [s, e] of all) {
    const last = out[out.length - 1];
    // Une también los tramos que se tocan o están a ≤1 s (redondeos del reproductor).
    if (last && s <= last[1] + 1) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

/** Segundos distintos vistos, sin pasar de la duración del vídeo. */
export function watchedSeconds(ranges: Range[], duration?: number | null): number {
  return ranges.reduce((sum, [s, e]) => {
    const end = duration ? Math.min(e, duration) : e;
    return sum + Math.max(0, end - s);
  }, 0);
}

export function isCompleted(watched: number, duration: number | null | undefined): boolean {
  return Boolean(duration) && watched >= duration! * COMPLETION_RATIO;
}

export type BeatCheck = { ok: true; range: Range } | { ok: false; reason: string };

/** Valida un latido del reproductor y lo normaliza a segundos enteros. */
export function checkBeat(
  from: number,
  to: number,
  duration: number | null | undefined,
  secondsInLastMinute: number,
): BeatCheck {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to <= from) {
    return { ok: false, reason: "Tramo inválido" };
  }
  const range: Range = [Math.floor(from), Math.ceil(to)];
  const length = range[1] - range[0];
  if (length > MAX_BEAT_SECONDS) return { ok: false, reason: "Tramo demasiado largo" };
  if (duration && range[1] > duration + 2) return { ok: false, reason: "Fuera de la duración del vídeo" };
  if (duration && range[1] > duration) range[1] = duration;
  if (secondsInLastMinute + length > MAX_SECONDS_PER_MINUTE) {
    return { ok: false, reason: "Demasiados latidos" };
  }
  return { ok: true, range };
}
