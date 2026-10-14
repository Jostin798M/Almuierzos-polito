"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import type { ActionResult, Settings, Worker } from "@/lib/types";
import { parseNum, usd } from "./ui";
import {
  removeWorker,
  saveSettings,
  saveWorker,
  setTodayPrice,
} from "@/app/actions";

type Exec = <T>(fn: () => Promise<ActionResult<T>>, okMsg?: string) => Promise<ActionResult<T>>;

export default function SettingsPanel({
  settings,
  dayPrice,
  workers,
  exec,
}: {
  settings: Settings;
  dayPrice: { price: number; custom: boolean };
  workers: Worker[];
  exec: Exec;
}) {
  const [base, setBase] = useState(String(settings.base_price));
  const [limit, setLimit] = useState(String(settings.daily_limit));
  const [pct, setPct] = useState(String(settings.cost_percent));
  const [todayP, setTodayP] = useState(String(dayPrice.price));
  const [apply, setApply] = useState(true);

  const baseN = parseNum(base);
  const limitN = parseNum(limit);
  const pctN = parseNum(pct);
  const settingsValid = baseN >= 0 && Number.isInteger(limitN) && limitN >= 0 && pctN >= 0 && pctN <= 100;

  // Cuenta rapida por almuerzo con el precio de hoy
  const price = dayPrice.price;
  const costos = (price * (Number.isFinite(pctN) ? pctN : 0)) / 100;
  const pagos = workers.filter((w) => w.active).reduce((a, w) => a + w.per_lunch, 0);
  const sobra = price - costos - pagos;

  return (
    <div className="max-w-3xl space-y-6">
      <section className="panel p-4">
        <h2 className="mb-3 font-display text-lg font-semibold">General</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm font-semibold">
            Precio base
            <input className="campo num mt-1 font-normal" inputMode="decimal" value={base} onChange={(e) => setBase(e.target.value)} />
          </label>
          <label className="block text-sm font-semibold">
            Límite de almuerzos por día
            <input className="campo num mt-1 font-normal" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} />
          </label>
          <label className="block text-sm font-semibold">
            Gastos e insumos (% de lo cobrado)
            <input className="campo num mt-1 font-normal" inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} />
          </label>
        </div>
        <button
          type="button"
          className="btn-primary mt-3"
          disabled={!settingsValid}
          onClick={() =>
            exec(() => saveSettings({ base_price: baseN, daily_limit: limitN, cost_percent: pctN }), "Ajustes guardados")
          }
        >
          <Save size={16} /> Guardar ajustes
        </button>
      </section>

      <section className="panel p-4">
        <h2 className="font-display text-lg font-semibold">Precio solo de hoy</h2>
        <p className="mb-3 text-sm text-suave">
          {dayPrice.custom ? "Hoy tiene un precio distinto al base." : "Hoy se usa el precio base."} Mañana vuelve al base.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm font-semibold">
            Precio de hoy
            <input
              className="campo num mt-1 block w-32 font-normal"
              inputMode="decimal"
              value={todayP}
              onChange={(e) => setTodayP(e.target.value)}
            />
          </label>
          <label className="flex min-h-[40px] items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={apply} onChange={(e) => setApply(e.target.checked)} />
            Aplicar a los pedidos de hoy
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={!(parseNum(todayP) >= 0)}
            onClick={() => exec(() => setTodayPrice(parseNum(todayP), apply), "Precio de hoy guardado")}
          >
            Guardar precio de hoy
          </button>
          {dayPrice.custom && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setTodayP(String(settings.base_price));
                exec(() => setTodayPrice(null, false), "Volvió al precio base");
              }}
            >
              Volver al precio base
            </button>
          )}
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="font-display text-lg font-semibold">Trabajadores</h2>
        <p className="mb-3 text-sm text-suave">Cada uno gana un monto fijo por cada almuerzo cobrado.</p>
        <ul className="space-y-2">
          {workers.map((w) => (
            <WorkerRow key={w.id + w.name + w.per_lunch} worker={w} exec={exec} />
          ))}
          <WorkerRow key="nuevo" exec={exec} />
        </ul>

        <div
          className={`num mt-4 rounded-md p-3 text-sm ${sobra < 0 ? "bg-deuda/10 text-deuda" : "bg-fondo"}`}
          role="status"
        >
          Con precio {usd(price)}: gastos {usd(costos)}, trabajadores {usd(pagos)}.{" "}
          <strong>{sobra < 0 ? `Faltan ${usd(-sobra)} por almuerzo.` : `Sobran ${usd(sobra)} por almuerzo.`}</strong>
        </div>
      </section>
    </div>
  );
}

function WorkerRow({ worker, exec }: { worker?: Worker; exec: Exec }) {
  const [name, setName] = useState(worker?.name ?? "");
  const [amount, setAmount] = useState(worker ? String(worker.per_lunch) : "");
  const amountN = parseNum(amount);
  const valid = name.trim().length > 0 && amountN >= 0;
  const changed = !worker || name !== worker.name || amountN !== worker.per_lunch;

  return (
    <li className="grid grid-cols-[1fr_6.5rem_auto] items-center gap-2">
      <input
        className="campo"
        placeholder="Nombre del trabajador"
        aria-label="Nombre del trabajador"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="campo num"
        inputMode="decimal"
        placeholder="0.00"
        aria-label="Ganancia por almuerzo"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <div className="flex gap-1">
        <button
          type="button"
          className="btn-primary px-3"
          disabled={!valid || !changed}
          aria-label={worker ? "Guardar trabajador" : "Agregar trabajador"}
          title={worker ? "Guardar" : "Agregar"}
          onClick={async () => {
            const r = await exec(() => saveWorker({ id: worker?.id, name, per_lunch: amountN }), "Trabajador guardado");
            if (r.ok && !worker) {
              setName("");
              setAmount("");
            }
          }}
        >
          {worker ? <Save size={16} /> : <Plus size={16} />}
        </button>
        {worker && (
          <button
            type="button"
            className="btn-ghost px-3 hover:text-deuda"
            aria-label={`Eliminar a ${worker.name}`}
            title="Eliminar"
            onClick={() => {
              if (confirm(`¿Eliminar a ${worker.name}? Dejará de repartirse ganancia con esta persona.`)) {
                exec(() => removeWorker(worker.id), "Trabajador eliminado");
              }
            }}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </li>
  );
}
