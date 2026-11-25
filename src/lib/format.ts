export function formatPrice(cents: number | null, currency: string) {
  if (cents === null) return "Precio pendiente";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function formatDuration(totalSeconds: number | null | undefined) {
  if (!totalSeconds) return "—";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "1 lección", "3 lecciones". */
export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Minutos de vídeo para mostrar: "menos de 1 min", "12 min", "1 h 5 min". */
export function formatTotalMinutes(totalSeconds: number) {
  if (totalSeconds < 60) return "menos de 1 min";
  const min = Math.round(totalSeconds / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}`;
}

/** Fecha y hora cortas en español, hora de Madrid ("24 nov 2026, 18:05"). */
export function formatDateTime(d: Date | string) {
  return new Date(d).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}
