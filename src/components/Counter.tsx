import { STATUSES, STATUS_SHORT, type Status } from "@/lib/types";
import type { Totals } from "@/lib/calc";
import { STATUS_STYLE, cx, usd } from "./ui";

export default function Counter({
  counts,
  limit,
  totals,
}: {
  counts: Record<Status, number>;
  limit: number;
  totals: Totals;
}) {
  const sold = STATUSES.reduce((a, s) => a + counts[s], 0);
  const remaining = Math.max(0, limit - sold);
  const over = Math.max(0, sold - limit);

  // Una celda por almuerzo, ordenadas por estado; luego los cupos libres
  const cells: (Status | null)[] = [];
  for (const s of STATUSES) for (let i = 0; i < counts[s]; i++) cells.push(s);
  while (cells.length < limit) cells.push(null);

  const headline = over > 0 ? `+${over}` : String(remaining);
  const caption = over > 0 ? "sobre el límite" : remaining === 0 ? "agotado" : "quedan";

  return (
    <section
      aria-label={`Vendidos ${sold} de ${limit}. ${over > 0 ? `Pasados por ${over}` : `Quedan ${remaining}`}`}
      className="flex overflow-hidden rounded-lg shadow-ficha"
    >
      {/* Talon: lo que queda */}
      <div className="relative flex w-[8.5rem] shrink-0 flex-col justify-between bg-maiz px-4 py-4 text-tinta sm:w-48 sm:px-5">
        <span className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full bg-fondo" aria-hidden />
        <span className="absolute -bottom-2.5 -right-2.5 h-5 w-5 rounded-full bg-fondo" aria-hidden />
        <span className="absolute inset-y-3 right-0 border-r-2 border-dashed border-tinta/35" aria-hidden />
        <p className="text-sm font-semibold">{caption}</p>
        <p
          className={cx(
            "num font-display text-[4.25rem] font-extrabold leading-[0.9] sm:text-[5.5rem]",
            over > 0 && "text-deuda",
          )}
        >
          {headline}
        </p>
        <p className="num text-sm font-medium">
          {sold} de {limit} hoy
        </p>
      </div>

      {/* Tira de almuerzos */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 bg-white p-4 sm:p-5">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(13px,1fr))] gap-1" aria-hidden>
          {cells.map((s, i) => (
            <span
              key={i}
              className={cx(
                "h-6 rounded-[3px] sm:h-7",
                s ? STATUS_STYLE[s].dot : "bg-fondo",
                i >= limit && "outline outline-2 outline-offset-1 outline-deuda",
              )}
            />
          ))}
        </div>

        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
          {STATUSES.map((s) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className={cx("h-3 w-3 shrink-0 rounded-[3px]", STATUS_STYLE[s].dot)} aria-hidden />
              <span className="text-suave">{STATUS_SHORT[s]}</span>
              <span className="num font-semibold">{counts[s]}</span>
            </li>
          ))}
        </ul>

        <dl className="grid grid-cols-3 gap-2 border-t border-linea pt-3">
          <Stat label="Vendido" value={usd(totals.total)} />
          <Stat label="Cobrado" value={usd(totals.cobrado)} />
          <Stat label="Por cobrar" value={usd(totals.porCobrar)} warn={totals.deuda > 0} />
        </dl>
      </div>
    </section>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-suave">{label}</dt>
      <dd className={cx("num font-display text-base font-bold sm:text-xl", warn && "text-deuda")}>{value}</dd>
    </div>
  );
}
