"use client";

import { useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import {
  Ban,
  ClipboardPaste,
  LayoutGrid,
  LogOut,
  Plus,
  ReceiptText,
  Settings as SettingsIcon,
  Undo2,
  Wallet,
} from "lucide-react";
import type { Dashboard as Data } from "@/lib/data";
import { byStatus, totalsOf } from "@/lib/calc";
import { prettyDay } from "@/lib/dates";
import {
  addBlacklist,
  addExtra,
  addOrders,
  cancelOrder,
  editOrder,
  logout,
  moveOrder,
  removeBlacklist,
  restoreOrder,
  setPayMethod,
  settleDebts,
  undo,
} from "@/app/actions";
import { isPaid, type ActionResult, type Order, type PayMethod, type Status } from "@/lib/types";
import Board from "./Board";
import BlacklistPanel from "./BlacklistPanel";
import Counter from "./Counter";
import Debtors from "./Debtors";
import { CancelDialog, EditDialog } from "./Dialogs";
import Earnings from "./Earnings";
import PasteDialog from "./PasteDialog";
import SettingsPanel from "./SettingsPanel";
import { cx, usd } from "./ui";

type Tab = "tablero" | "ganancias" | "deudores" | "negra" | "ajustes";
type Patch = { id: string; patch: Partial<Order> };

export default function Dashboard({ data }: { data: Data }) {
  const [tab, setTab] = useState<Tab>("tablero");
  const [pasting, setPasting] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [toast, setToast] = useState<{ msg: string; error: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [pending, start] = useTransition();

  // Los cambios se ven al instante; el servidor confirma despues
  const [orders, patchOrder] = useOptimistic(data.orders, (cur, { id, patch }: Patch) =>
    cur.map((o) => (o.id === id ? { ...o, ...patch } : o)),
  );

  const activeWorkers = useMemo(() => data.workers.filter((w) => w.active), [data.workers]);
  const counts = useMemo(() => byStatus(orders), [orders]);
  const totals = useMemo(() => totalsOf(orders, data.settings, activeWorkers), [orders, data.settings, activeWorkers]);
  const blockedKeys = useMemo(() => new Set(data.blacklist.map((b) => b.name_key)), [data.blacklist]);

  function notify(msg: string, error = false) {
    setToast({ msg, error });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), error ? 6000 : 3000);
  }

  async function exec<T>(fn: () => Promise<ActionResult<T>>, okMsg?: string): Promise<ActionResult<T>> {
    const r = await fn();
    if (!r.ok) notify(r.error, true);
    else if (okMsg) notify(okMsg);
    return r;
  }

  const move = (id: string, status: Status) =>
    start(async () => {
      const cur = orders.find((o) => o.id === id);
      patchOrder({
        id,
        patch: { status, payment_method: isPaid(status) && !cur?.payment_method ? "efectivo" : (cur?.payment_method ?? null) },
      });
      await exec(() => moveOrder(id, status));
    });

  const pay = (id: string, method: PayMethod) =>
    start(async () => {
      patchOrder({ id, patch: { payment_method: method } });
      await exec(() => setPayMethod(id, method));
    });

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "tablero", label: "Tablero", icon: <LayoutGrid size={20} /> },
    { id: "ganancias", label: "Ganancias", icon: <Wallet size={20} /> },
    { id: "deudores", label: "Deudores", icon: <ReceiptText size={20} />, badge: data.debtors.length },
    { id: "negra", label: "Lista negra", icon: <Ban size={20} /> },
    { id: "ajustes", label: "Ajustes", icon: <SettingsIcon size={20} /> },
  ];

  return (
    <div className="mx-auto min-h-dvh max-w-[1500px] px-4 pb-28 pt-4 md:pb-10">
      <div
        aria-hidden
        className={cx(
          "fixed inset-x-0 top-0 z-[60] h-0.5 bg-maiz transition-opacity duration-300",
          pending ? "opacity-100" : "opacity-0",
        )}
      />

      <header className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold leading-none">Almuerzos</h1>
          <p className="mt-1 text-sm text-suave first-letter:uppercase">
            {prettyDay(data.today)}, <span className="num normal-case">{usd(data.dayPrice.price)}</span> cada uno
            {data.dayPrice.custom && " (precio de hoy)"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost"
            disabled={!data.canUndo}
            onClick={() => start(async () => void (await exec(() => undo(), "Cambio deshecho")))}
          >
            <Undo2 size={16} /> Deshacer
          </button>
          <form action={logout}>
            <button type="submit" className="btn-ghost" aria-label="Salir" title="Salir">
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </header>

      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-linea bg-white pb-[env(safe-area-inset-bottom)] md:static md:mb-5 md:flex md:gap-1 md:rounded-lg md:border-0 md:bg-transparent md:p-0"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => setTab(t.id)}
            className={cx(
              "relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold transition-colors md:min-h-[44px] md:flex-row md:gap-2 md:rounded-md md:px-4 md:text-sm",
              tab === t.id ? "text-tinta md:bg-tinta md:text-white" : "text-suave hover:text-tinta md:hover:bg-white",
            )}
          >
            {t.icon}
            <span className="truncate">{t.label}</span>
            {!!t.badge && (
              <span className="num absolute right-2 top-1.5 min-w-[18px] rounded-full bg-deuda px-1 text-center text-[11px] font-bold leading-[18px] text-white md:static md:ml-0.5">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <main className="space-y-4">
        {tab === "tablero" && (
          <>
            <Counter counts={counts} limit={data.settings.daily_limit} totals={totals} />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-primary" onClick={() => setPasting(true)}>
                <ClipboardPaste size={16} /> Pegar lista
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => start(async () => void (await exec(() => addExtra(), "Extra agregado")))}
              >
                <Plus size={16} /> Extra
              </button>
            </div>
            <Board
              orders={orders}
              blockedKeys={blockedKeys}
              onMove={move}
              onPay={pay}
              onEdit={setEditing}
              onCancel={setCancelling}
              onRestore={(id) => start(async () => void (await exec(() => restoreOrder(id), "Pedido restaurado")))}
            />
          </>
        )}

        {tab === "ganancias" && <Earnings periods={data.periods} costPercent={data.settings.cost_percent} />}

        {tab === "deudores" && (
          <Debtors
            debtors={data.debtors}
            onSettle={(ids, method) => start(async () => void (await exec(() => settleDebts(ids, method), "Deuda cobrada")))}
          />
        )}

        {tab === "negra" && (
          <BlacklistPanel
            entries={data.blacklist}
            onAdd={async (name, reason) => (await exec(() => addBlacklist(name, reason), "Agregado a la lista negra")).ok}
            onRemove={(id) => start(async () => void (await exec(() => removeBlacklist(id), "Quitado de la lista negra")))}
          />
        )}

        {tab === "ajustes" && (
          <SettingsPanel settings={data.settings} dayPrice={data.dayPrice} workers={data.workers} exec={exec} />
        )}
      </main>

      {pasting && (
        <PasteDialog
          orders={orders}
          limit={data.settings.daily_limit}
          blockedKeys={blockedKeys}
          onClose={() => setPasting(false)}
          onAdd={(names, opts) => {
            setPasting(false);
            start(async () => {
              const r = await exec(() => addOrders(names, opts));
              if (r.ok && r.data) {
                const { added, skippedExisting, skippedLimit } = r.data;
                const extra = [
                  skippedExisting ? `${skippedExisting} ya estaban` : "",
                  skippedLimit ? `${skippedLimit} pasaban el límite` : "",
                ].filter(Boolean);
                notify(`${added} agregados${extra.length ? `, ${extra.join(" y ")}` : ""}`);
              }
            });
          }}
        />
      )}

      {editing && (
        <EditDialog
          order={editing}
          onClose={() => setEditing(null)}
          onSave={(v) => {
            const id = editing.id;
            setEditing(null);
            start(async () => {
              patchOrder({ id, patch: { name: v.name, note: v.note || null, price: v.price } });
              await exec(() => editOrder(id, v), "Pedido actualizado");
            });
          }}
        />
      )}

      {cancelling && (
        <CancelDialog
          order={cancelling}
          onClose={() => setCancelling(null)}
          onConfirm={(v) => {
            const id = cancelling.id;
            setCancelling(null);
            start(async () => {
              patchOrder({ id, patch: { cancelled: true } });
              await exec(() => cancelOrder(id, v), v.blacklist ? "Cancelado y agregado a la lista negra" : "Pedido cancelado");
            });
          }}
        />
      )}

      {toast && (
        <div
          role="status"
          className={cx(
            "fixed bottom-20 left-1/2 z-[70] max-w-[92vw] -translate-x-1/2 rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-lg md:bottom-6",
            toast.error ? "bg-deuda" : "bg-tinta",
          )}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
