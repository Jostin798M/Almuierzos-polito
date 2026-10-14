import { isPaid, type Order, type Settings, type Worker, type Status } from "./types";
import { nameKey, isAnonymous } from "./parser";

export const money = (n: number) => Math.round(n * 100) / 100;

export type Totals = {
  count: number; // almuerzos no cancelados
  paidCount: number; // ya cobrados
  total: number; // suma de precios (lo vendido)
  cobrado: number; // dinero que ya entro
  efectivo: number;
  cuenta: number;
  porCobrar: number; // vendido y aun no cobrado
  deuda: number; // retirado y sin pagar
  costos: number; // gastos e insumos (% de lo cobrado)
  repartible: number; // cobrado - costos
  sobrante: number; // repartible - lo que ganan los trabajadores
};

export type WorkerEarning = {
  id: string;
  name: string;
  per_lunch: number;
  ganado: number; // por almuerzos ya cobrados
  pendiente: number; // por almuerzos aun sin cobrar
};

export type Period = {
  from: string;
  to: string;
  totals: Totals;
  workers: WorkerEarning[];
  daily: { day: string; count: number; total: number; cobrado: number }[];
};

export function byStatus(orders: Order[]): Record<Status, number> {
  const out: Record<Status, number> = {
    en_espera: 0,
    confirmado: 0,
    pagado_sin_retirar: 0,
    retirado: 0,
    retirado_sin_pagar: 0,
  };
  for (const o of orders) if (!o.cancelled) out[o.status]++;
  return out;
}

export function totalsOf(orders: Order[], settings: Settings, workers: Worker[]): Totals {
  const live = orders.filter((o) => !o.cancelled);
  let total = 0;
  let cobrado = 0;
  let efectivo = 0;
  let cuenta = 0;
  let deuda = 0;
  let paidCount = 0;
  for (const o of live) {
    total += o.price;
    if (isPaid(o.status)) {
      paidCount++;
      cobrado += o.price;
      if (o.payment_method === "cuenta") cuenta += o.price;
      else efectivo += o.price;
    } else if (o.status === "retirado_sin_pagar") {
      deuda += o.price;
    }
  }
  const costos = (cobrado * settings.cost_percent) / 100;
  const repartible = cobrado - costos;
  const pagadoTrabajadores = workers
    .filter((w) => w.active)
    .reduce((acc, w) => acc + w.per_lunch * paidCount, 0);
  return {
    count: live.length,
    paidCount,
    total: money(total),
    cobrado: money(cobrado),
    efectivo: money(efectivo),
    cuenta: money(cuenta),
    porCobrar: money(total - cobrado),
    deuda: money(deuda),
    costos: money(costos),
    repartible: money(repartible),
    sobrante: money(repartible - pagadoTrabajadores),
  };
}

export function periodOf(
  orders: Order[],
  from: string,
  to: string,
  settings: Settings,
  workers: Worker[],
): Period {
  const inRange = orders.filter((o) => o.day >= from && o.day <= to);
  const totals = totalsOf(inRange, settings, workers);
  const live = inRange.filter((o) => !o.cancelled);
  const pending = totals.count - totals.paidCount;
  const earnings: WorkerEarning[] = workers
    .filter((w) => w.active)
    .map((w) => ({
      id: w.id,
      name: w.name,
      per_lunch: w.per_lunch,
      ganado: money(w.per_lunch * totals.paidCount),
      pendiente: money(w.per_lunch * pending),
    }));

  const days = new Map<string, { count: number; total: number; cobrado: number }>();
  for (const o of live) {
    const d = days.get(o.day) ?? { count: 0, total: 0, cobrado: 0 };
    d.count++;
    d.total += o.price;
    if (isPaid(o.status)) d.cobrado += o.price;
    days.set(o.day, d);
  }
  const daily = [...days.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, v]) => ({ day, count: v.count, total: money(v.total), cobrado: money(v.cobrado) }));

  return { from, to, totals, workers: earnings, daily };
}

export type Debtor = {
  key: string;
  name: string;
  total: number;
  orders: { id: string; day: string; price: number }[];
};

export function debtorsOf(debts: Order[]): Debtor[] {
  const map = new Map<string, Debtor>();
  for (const o of debts) {
    // Los nombres anonimos (".") son personas distintas: no se agrupan
    const key = isAnonymous(o.name) ? `anon-${o.id}` : nameKey(o.name);
    const d = map.get(key) ?? { key, name: o.name, total: 0, orders: [] };
    d.total += o.price;
    d.orders.push({ id: o.id, day: o.day, price: o.price });
    map.set(key, d);
  }
  return [...map.values()]
    .map((d) => ({ ...d, total: money(d.total) }))
    .sort((a, b) => b.total - a.total);
}
