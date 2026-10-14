"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import type { Period } from "@/lib/calc";
import type { Range } from "@/lib/dates";
import { prettyDay, shortDay } from "@/lib/dates";
import { Segmented, cx, usd } from "./ui";

const RANGES: { value: Range; label: string }[] = [
  { value: "day", label: "Hoy" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

export default function Earnings({
  periods,
  costPercent,
}: {
  periods: Record<Range, Period>;
  costPercent: number;
}) {
  const [range, setRange] = useState<Range>("day");
  const p = periods[range];
  const t = p.totals;

  const title =
    range === "day"
      ? prettyDay(p.from)
      : `${shortDay(p.from)} al ${shortDay(p.to)}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Periodo" value={range} options={RANGES} onChange={setRange} />
        <div className="flex gap-2">
          <a className="btn-ghost" href={`/api/export?format=csv&range=${range}`} download>
            <FileText size={16} /> CSV
          </a>
          <a className="btn-ghost" href={`/api/export?format=xlsx&range=${range}`} download>
            <FileSpreadsheet size={16} /> Excel
          </a>
        </div>
      </div>

      <p className="text-sm text-suave first-letter:uppercase">{title}</p>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card label="Vendido" value={usd(t.total)} sub={`${t.count} almuerzos`} />
        <Card
          label="Cobrado"
          value={usd(t.cobrado)}
          sub={`Efectivo ${usd(t.efectivo)}, cuenta ${usd(t.cuenta)}`}
        />
        <Card label="Por cobrar" value={usd(t.porCobrar)} sub={`Deuda ${usd(t.deuda)}`} warn={t.deuda > 0} />
        <Card label={`Gastos e insumos`} value={usd(t.costos)} sub={`${costPercent}% de lo cobrado`} />
        <Card
          label="Sobrante"
          value={usd(t.sobrante)}
          sub="Después de pagar a todos"
          warn={t.sobrante < 0}
          className="col-span-2 md:col-span-1"
        />
      </dl>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold">Ganancias por trabajador</h2>
        {periods.day.workers.length === 0 ? (
          <p className="text-sm text-suave">Agrega trabajadores en Ajustes para ver el reparto.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {periods.day.workers.map((w) => (
              <article key={w.id} className="panel p-4">
                <header className="mb-3 flex items-baseline justify-between gap-2">
                  <h3 className="break-words font-semibold">{w.name}</h3>
                  <span className="num text-sm text-suave">{usd(w.per_lunch)} por almuerzo</span>
                </header>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-suave">
                      <th className="pb-1 font-medium" scope="col">
                        Periodo
                      </th>
                      <th className="pb-1 text-right font-medium" scope="col">
                        Ganado
                      </th>
                      <th className="pb-1 text-right font-medium" scope="col">
                        Pendiente
                      </th>
                    </tr>
                  </thead>
                  <tbody className="num">
                    {RANGES.map((r) => {
                      const mine = periods[r.value].workers.find((x) => x.id === w.id);
                      return (
                        <tr key={r.value} className={cx("border-t border-linea", r.value === range && "bg-fondo/60")}>
                          <th scope="row" className="py-1.5 text-left font-medium">
                            {r.label}
                          </th>
                          <td className="py-1.5 text-right font-semibold">{usd(mine?.ganado ?? 0)}</td>
                          <td className="py-1.5 text-right text-suave">{usd(mine?.pendiente ?? 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </article>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-suave">
          Ganado cuenta los almuerzos ya cobrados. Pendiente es lo que ganarían si se cobra lo que falta.
        </p>
      </section>

      {range !== "day" && (
        <section>
          <h2 className="mb-2 font-display text-lg font-semibold">Día por día</h2>
          {p.daily.length === 0 ? (
            <p className="text-sm text-suave">Todavía no hay ventas en este periodo.</p>
          ) : (
            <div className="panel overflow-x-auto">
              <table className="num w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-suave">
                    <th className="px-4 py-2 font-medium" scope="col">
                      Día
                    </th>
                    <th className="px-4 py-2 text-right font-medium" scope="col">
                      Almuerzos
                    </th>
                    <th className="px-4 py-2 text-right font-medium" scope="col">
                      Vendido
                    </th>
                    <th className="px-4 py-2 text-right font-medium" scope="col">
                      Cobrado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {p.daily.map((d) => (
                    <tr key={d.day} className="border-t border-linea">
                      <th scope="row" className="px-4 py-2 text-left font-medium capitalize">
                        {shortDay(d.day)}
                      </th>
                      <td className="px-4 py-2 text-right">{d.count}</td>
                      <td className="px-4 py-2 text-right">{usd(d.total)}</td>
                      <td className="px-4 py-2 text-right font-semibold">{usd(d.cobrado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Card({
  label,
  value,
  sub,
  warn,
  className,
}: {
  label: string;
  value: string;
  sub: string;
  warn?: boolean;
  className?: string;
}) {
  return (
    <div className={cx("panel p-3.5", className)}>
      <dt className="text-xs text-suave">{label}</dt>
      <dd className={cx("num font-display text-2xl font-bold", warn && "text-deuda")}>{value}</dd>
      <dd className="num mt-0.5 text-xs text-suave">{sub}</dd>
    </div>
  );
}
