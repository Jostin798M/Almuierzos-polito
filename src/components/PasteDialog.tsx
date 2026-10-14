"use client";

import { useMemo, useState } from "react";
import { Ban } from "lucide-react";
import { isAnonymous, nameKey, parseList } from "@/lib/parser";
import type { Order } from "@/lib/types";
import { Modal, cx } from "./ui";

export default function PasteDialog({
  orders,
  limit,
  blockedKeys,
  onClose,
  onAdd,
}: {
  orders: Order[];
  limit: number;
  blockedKeys: Set<string>;
  onClose: () => void;
  onAdd: (names: string[], opts: { skipExisting: boolean; force: boolean }) => void;
}) {
  const [text, setText] = useState("");
  const [skipExisting, setSkipExisting] = useState(true);

  const live = orders.filter((o) => !o.cancelled);
  const taken = useMemo(
    () => new Set(live.filter((o) => !isAnonymous(o.name)).map((o) => nameKey(o.name))),
    [live],
  );
  const parsed = useMemo(() => parseList(text), [text]);
  const rows = parsed.map((name) => ({
    name,
    duplicate: skipExisting && !isAnonymous(name) && taken.has(nameKey(name)),
    blocked: blockedKeys.has(nameKey(name)),
  }));
  const toAdd = rows.filter((r) => !r.duplicate);
  const room = Math.max(0, limit - live.length);
  const overflow = Math.max(0, toAdd.length - room);
  const fit = toAdd.length - overflow;

  return (
    <Modal title="Pegar lista de pedidos" onClose={onClose}>
      <textarea
        className="campo min-h-[140px] resize-y py-2 font-sans"
        placeholder={"1. @~Nombre Apellido\n2. @~Otro nombre\n3. @michael"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        aria-label="Lista de pedidos"
      />
      <label className="mt-3 flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={skipExisting}
          onChange={(e) => setSkipExisting(e.target.checked)}
        />
        Omitir nombres que ya están hoy
      </label>

      {rows.length > 0 && (
        <div className="mt-4">
          <p className="num mb-2 text-sm font-semibold">
            {rows.length} {rows.length === 1 ? "pedido leído" : "pedidos leídos"}
            {rows.length - toAdd.length > 0 && (
              <span className="font-normal text-suave">, {rows.length - toAdd.length} ya estaban</span>
            )}
          </p>
          <ul className="max-h-48 space-y-0.5 overflow-y-auto rounded-md bg-fondo p-2 text-sm">
            {rows.map((r, i) => (
              <li key={i} className={cx("flex items-center gap-2 py-0.5", r.duplicate && "text-suave line-through")}>
                <span className="num w-6 shrink-0 text-right text-xs text-suave">{i + 1}</span>
                <span className="min-w-0 flex-1 break-words">{r.name}</span>
                {r.blocked && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded bg-deuda/10 px-1.5 text-xs font-semibold text-deuda">
                    <Ban size={12} /> Lista negra
                  </span>
                )}
              </li>
            ))}
          </ul>
          {overflow > 0 && (
            <p role="status" className="num mt-2 text-sm font-medium text-deuda">
              {room === 1 ? "Queda 1 cupo" : `Quedan ${room} cupos`} y la lista trae {toAdd.length}. {overflow === 1 ? "Sobra 1" : `Sobran ${overflow}`}.
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        {overflow > 0 && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => onAdd(rows.map((r) => r.name), { skipExisting, force: true })}
          >
            Agregar los {toAdd.length}
          </button>
        )}
        <button
          type="button"
          className="btn-primary"
          disabled={toAdd.length === 0 || fit === 0}
          onClick={() => onAdd(rows.map((r) => r.name), { skipExisting, force: false })}
        >
          {overflow > 0 ? `Agregar solo ${fit}` : `Agregar ${toAdd.length}`}
        </button>
      </div>
    </Modal>
  );
}
