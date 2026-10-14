export const STATUSES = [
  "en_espera",
  "confirmado",
  "pagado_sin_retirar",
  "retirado",
  "retirado_sin_pagar",
] as const;

export type Status = (typeof STATUSES)[number];
export type PayMethod = "efectivo" | "cuenta";

export const STATUS_LABEL: Record<Status, string> = {
  en_espera: "En espera",
  confirmado: "Confirmado",
  pagado_sin_retirar: "Pagado, sin retirar",
  retirado: "Retirado",
  retirado_sin_pagar: "Retirado, sin pagar",
};

export const STATUS_SHORT: Record<Status, string> = {
  en_espera: "Espera",
  confirmado: "Confirmado",
  pagado_sin_retirar: "Pagado",
  retirado: "Retirado",
  retirado_sin_pagar: "Sin pagar",
};

// Estados en los que el dinero ya entro
export const PAID_STATUSES: Status[] = ["pagado_sin_retirar", "retirado"];

export function isPaid(s: Status) {
  return PAID_STATUSES.includes(s);
}

export type Order = {
  id: string;
  day: string;
  name: string;
  status: Status;
  payment_method: PayMethod | null;
  price: number;
  note: string | null;
  is_extra: boolean;
  cancelled: boolean;
  created_at: string;
};

export type Worker = {
  id: string;
  name: string;
  per_lunch: number;
  active: boolean;
  position: number;
};

export type Settings = {
  base_price: number;
  daily_limit: number;
  cost_percent: number;
};

export type BlacklistEntry = {
  id: string;
  name: string;
  name_key: string;
  reason: string | null;
  cancelled_on: string;
};

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };
