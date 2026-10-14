"use client";

import { useState } from "react";
import { Ban, Banknote, ChevronLeft, ChevronRight, Landmark, Pencil, RotateCcw, X } from "lucide-react";
import { nameKey } from "@/lib/parser";
import { STATUSES, STATUS_LABEL, STATUS_SHORT, isPaid, type Order, type PayMethod, type Status } from "@/lib/types";
import { STATUS_STYLE, cx, usd } from "./ui";

type Props = {
  orders: Order[];
  blockedKeys: Set<string>;
  onMove: (id: string, status: Status) => void;
  onPay: (id: string, method: PayMethod) => void;
  onEdit: (o: Order) => void;
  onCancel: (o: Order) => void;
  onRestore: (id: string) => void;
};

export default function Board(p: Props) {
  const [tab, setTab] = useState<Status>("en_espera");
  const live = p.orders.filter((o) => !o.cancelled);
  const cancelled = p.orders.filter((o) => o.cancelled);

  return (
    <div className="space-y-4">
      {/* Telefono y tablet: una columna a la vez */}
      <div role="tablist" aria-label="Estados" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 xl:hidden">
        {STATUSES.map((s) => {
          const n = live.filter((o) => o.status === s).length;
          const active = tab === s;
          return (
            <button
              key={s}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(s)}
              className={cx(
                "flex min-h-[44px] shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold shadow-ficha transition-colors",
                active ? "bg-tinta text-white" : "bg-white text-tinta",
              )}
            >
              <span className={cx("h-2.5 w-2.5 rounded-[3px]", STATUS_STYLE[s].dot)} aria-hidden />
              {STATUS_SHORT[s]}
              <span className={cx("num rounded px-1.5 text-xs", active ? "bg-white/20" : "bg-fondo")}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        {STATUSES.map((s) => {
          const list = live.filter((o) => o.status === s);
          return (
            <section
              key={s}
              role="tabpanel"
              aria-label={STATUS_LABEL[s]}
              className={cx(tab === s ? "block" : "hidden", "xl:block")}
            >
              <h2 className="mb-2 hidden items-center gap-2 text-sm font-semibold xl:flex">
                <span className={cx("h-3 w-3 rounded-[3px]", STATUS_STYLE[s].dot)} aria-hidden />
                {STATUS_LABEL[s]}
                <span className="num ml-auto rounded bg-white px-1.5 text-xs shadow-ficha">{list.length}</span>
              </h2>
              {list.length === 0 ? (
                <p className="rounded-md border border-dashed border-linea px-3 py-5 text-center text-sm text-suave">
                  Sin pedidos
                </p>
              ) : (
                <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                  {list.map((o) => (
                    <OrderCard key={o.id} o={o} blocked={p.blockedKeys.has(nameKey(o.name))} {...p} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {cancelled.length > 0 && (
        <details className="panel p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Cancelados hoy <span className="num text-suave">({cancelled.length})</span>
          </summary>
          <ul className="mt-3 divide-y divide-linea">
            {cancelled.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 break-words text-sm text-suave line-through">{o.name}</span>
                <button type="button" className="btn-ghost" onClick={() => p.onRestore(o.id)}>
                  <RotateCcw size={16} /> Restaurar
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function OrderCard({
  o,
  blocked,
  onMove,
  onPay,
  onEdit,
  onCancel,
}: { o: Order; blocked: boolean } & Props) {
  const i = STATUSES.indexOf(o.status);
  const prev = STATUSES[i - 1];
  const next = STATUSES[i + 1];

  return (
    <li className={cx("panel border-l-4 p-2.5", STATUS_STYLE[o.status].bar)}>
      <div className="flex items-start gap-1.5">
        <Arrow
          disabled={!prev}
          label={prev ? `Mover a ${STATUS_LABEL[prev]}` : "Es el primer estado"}
          onClick={() => prev && onMove(o.id, prev)}
        >
          <ChevronLeft size={20} />
        </Arrow>

        <div className="min-w-0 flex-1 px-0.5 pt-1">
          <button
            type="button"
            onClick={() => onEdit(o)}
            title={o.name}
            className="line-clamp-2 w-full break-words text-left font-semibold leading-snug"
          >
            {o.name}
          </button>
          {blocked && (
            <span className="mt-1 inline-flex items-center gap-1 rounded bg-deuda/10 px-1.5 py-0.5 text-xs font-semibold text-deuda">
              <Ban size={12} /> Lista negra
            </span>
          )}
          {o.note && <p className="mt-0.5 line-clamp-2 break-words text-xs text-suave">{o.note}</p>}
          <p className="num mt-0.5 text-xs text-suave">{usd(o.price)}</p>
        </div>

        <Arrow
          disabled={!next}
          label={next ? `Mover a ${STATUS_LABEL[next]}` : "Es el último estado"}
          onClick={() => next && onMove(o.id, next)}
        >
          <ChevronRight size={20} />
        </Arrow>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        {isPaid(o.status) && <PayChip method={o.payment_method ?? "efectivo"} onToggle={(m) => onPay(o.id, m)} />}
        <span className="flex-1" />
        <IconBtn label="Editar pedido" onClick={() => onEdit(o)}>
          <Pencil size={16} />
        </IconBtn>
        <IconBtn label="Cancelar pedido" danger onClick={() => onCancel(o)}>
          <X size={18} />
        </IconBtn>
      </div>
    </li>
  );
}

function Arrow({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-11 w-10 shrink-0 place-items-center rounded-md bg-fondo text-tinta transition-colors hover:bg-linea disabled:opacity-30 disabled:hover:bg-fondo"
    >
      {children}
    </button>
  );
}

function IconBtn({
  children,
  label,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cx(
        "grid h-9 w-9 place-items-center rounded-md text-suave transition-colors",
        danger ? "hover:bg-deuda/10 hover:text-deuda" : "hover:bg-fondo hover:text-tinta",
      )}
    >
      {children}
    </button>
  );
}

function PayChip({ method, onToggle }: { method: PayMethod; onToggle: (m: PayMethod) => void }) {
  const cash = method === "efectivo";
  return (
    <button
      type="button"
      onClick={() => onToggle(cash ? "cuenta" : "efectivo")}
      aria-label={`Pago en ${cash ? "efectivo" : "cuenta"}. Tocar para cambiar`}
      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-md bg-fondo px-2.5 text-xs font-semibold hover:bg-linea"
    >
      {cash ? <Banknote size={15} /> : <Landmark size={15} />}
      {cash ? "Efectivo" : "Cuenta"}
    </button>
  );
}
