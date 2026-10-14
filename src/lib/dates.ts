// Todas las fechas se calculan en la zona horaria del negocio, no en la del servidor.
export const TZ = process.env.APP_TIMEZONE || "America/Guayaquil";

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha YYYY-MM-DD en la zona del negocio. */
export function dayOf(date: Date = new Date()): string {
  return fmt.format(date);
}

function parse(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  const d = parse(day);
  d.setUTCDate(d.getUTCDate() + n);
  return toStr(d);
}

/** Lunes de la semana que contiene `day`. */
export function weekStart(day: string): string {
  const d = parse(day);
  const dow = (d.getUTCDay() + 6) % 7; // lunes = 0
  return addDays(day, -dow);
}

export function monthStart(day: string): string {
  return day.slice(0, 7) + "-01";
}

export type Range = "day" | "week" | "month";

export function rangeBounds(range: Range, day: string): { from: string; to: string } {
  if (range === "day") return { from: day, to: day };
  if (range === "week") return { from: weekStart(day), to: addDays(weekStart(day), 6) };
  const from = monthStart(day);
  const d = parse(from);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return { from, to: toStr(d) };
}

export function prettyDay(day: string): string {
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parse(day));
}

export function shortDay(day: string): string {
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(parse(day));
}
