import "server-only";
import { db } from "./supabase";
import { dayOf, rangeBounds, weekStart, monthStart, type Range } from "./dates";
import { byStatus, debtorsOf, periodOf, type Debtor, type Period } from "./calc";
import type { BlacklistEntry, Order, Settings, Status, Worker } from "./types";

const num = (v: unknown) => Number(v ?? 0);

function mapOrder(r: Record<string, unknown>): Order {
  return {
    id: r.id as string,
    day: r.day as string,
    name: r.name as string,
    status: r.status as Status,
    payment_method: (r.payment_method as Order["payment_method"]) ?? null,
    price: num(r.price),
    note: (r.note as string | null) ?? null,
    is_extra: Boolean(r.is_extra),
    cancelled: Boolean(r.cancelled),
    created_at: r.created_at as string,
  };
}

/** Lee todos los pedidos de un rango, paginando (Supabase devuelve maximo 1000 por consulta). */
export async function fetchOrders(from: string, to: string): Promise<Order[]> {
  const out: Order[] = [];
  const page = 1000;
  for (let start = 0; ; start += page) {
    const { data, error } = await db()
      .from("orders")
      .select("*")
      .gte("day", from)
      .lte("day", to)
      .order("created_at", { ascending: true })
      .range(start, start + page - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []).map(mapOrder));
    if (!data || data.length < page) break;
  }
  return out;
}

export async function getSettings(): Promise<Settings> {
  const { data, error } = await db().from("settings").select("*").eq("id", 1).single();
  if (error) throw new Error(error.message);
  return {
    base_price: num(data.base_price),
    daily_limit: num(data.daily_limit),
    cost_percent: num(data.cost_percent),
  };
}

export async function getDayPrice(day: string, settings: Settings): Promise<{ price: number; custom: boolean }> {
  const { data } = await db().from("day_prices").select("price").eq("day", day).maybeSingle();
  if (data) return { price: num(data.price), custom: true };
  return { price: settings.base_price, custom: false };
}

export async function getWorkers(): Promise<Worker[]> {
  const { data, error } = await db()
    .from("workers")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    per_lunch: num(w.per_lunch),
    active: Boolean(w.active),
    position: num(w.position),
  }));
}

export async function getBlacklist(): Promise<BlacklistEntry[]> {
  const { data, error } = await db()
    .from("blacklist")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as BlacklistEntry[];
}

export type Dashboard = {
  today: string;
  settings: Settings;
  dayPrice: { price: number; custom: boolean };
  workers: Worker[];
  orders: Order[]; // pedidos de hoy (incluye cancelados)
  counts: Record<Status, number>;
  periods: Record<Range, Period>;
  debtors: Debtor[];
  blacklist: BlacklistEntry[];
  canUndo: boolean;
};

export async function loadDashboard(): Promise<Dashboard> {
  const today = dayOf();
  const from = [weekStart(today), monthStart(today)].sort()[0];
  const to = rangeBounds("month", today).to;

  const [settings, workers, blacklist, history, debts, undo] = await Promise.all([
    getSettings(),
    getWorkers(),
    getBlacklist(),
    fetchOrders(from, to),
    db().from("orders").select("*").eq("status", "retirado_sin_pagar").eq("cancelled", false),
    db().from("undo_log").select("id", { count: "exact", head: true }),
  ]);
  const dayPrice = await getDayPrice(today, settings);

  const orders = history.filter((o) => o.day === today);
  const active = workers.filter((w) => w.active);
  const bounds = {
    day: rangeBounds("day", today),
    week: rangeBounds("week", today),
    month: rangeBounds("month", today),
  };

  return {
    today,
    settings,
    dayPrice,
    workers,
    orders,
    counts: byStatus(orders),
    periods: {
      day: periodOf(history, bounds.day.from, bounds.day.to, settings, active),
      week: periodOf(history, bounds.week.from, bounds.week.to, settings, active),
      month: periodOf(history, bounds.month.from, bounds.month.to, settings, active),
    },
    debtors: debtorsOf((debts.data ?? []).map(mapOrder)),
    blacklist,
    canUndo: (undo.count ?? 0) > 0,
  };
}
