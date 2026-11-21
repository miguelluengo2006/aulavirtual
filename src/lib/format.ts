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
