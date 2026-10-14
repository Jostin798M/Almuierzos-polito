"use client";

import { Banknote, Landmark } from "lucide-react";
import type { Debtor } from "@/lib/calc";
import { shortDay } from "@/lib/dates";
import type { PayMethod } from "@/lib/types";
import { Empty, usd } from "./ui";

export default function Debtors({
  debtors,
  onSettle,
}: {
  debtors: Debtor[];
  onSettle: (ids: string[], method: PayMethod) => void;
}) {
  const total = debtors.reduce((a, d) => a + d.total, 0);

  if (debtors.length === 0) return <Empty>Nadie te debe nada. Los pedidos en Retirado, sin pagar aparecen aquí.</Empty>;

  return (
    <div className="space-y-4">
      <p className="num text-sm">
        Te deben <strong className="font-display text-xl text-deuda">{usd(total)}</strong> en total, repartido entre{" "}
        {debtors.length} {debtors.length === 1 ? "persona" : "personas"}.
      </p>
      <ul className="grid gap-3 md:grid-cols-2">
        {debtors.map((d) => (
          <li key={d.key} className="panel p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 break-words font-semibold">{d.name}</h3>
              <p className="num shrink-0 font-display text-lg font-bold text-deuda">{usd(d.total)}</p>
            </div>
            <ul className="num mt-2 space-y-1 text-sm text-suave">
              {d.orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2">
                  <span className="capitalize">{shortDay(o.day)}</span>
                  <span>{usd(o.price)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() => onSettle(d.orders.map((o) => o.id), "efectivo")}
              >
                <Banknote size={16} /> Cobrar en efectivo
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => onSettle(d.orders.map((o) => o.id), "cuenta")}
              >
                <Landmark size={16} /> Cobrar en cuenta
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
