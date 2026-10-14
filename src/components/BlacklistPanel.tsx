"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { BlacklistEntry } from "@/lib/types";
import { shortDay } from "@/lib/dates";
import { Empty } from "./ui";

export default function BlacklistPanel({
  entries,
  onAdd,
  onRemove,
}: {
  entries: BlacklistEntry[];
  onAdd: (name: string, reason: string) => Promise<boolean>;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-4">
      <form
        className="panel grid gap-2 p-3 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          if (await onAdd(name, reason)) {
            setName("");
            setReason("");
          }
        }}
      >
        <input className="campo" placeholder="Nombre" aria-label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          className="campo"
          placeholder="Motivo (opcional)"
          aria-label="Motivo"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={!name.trim()}>
          <Plus size={16} /> Agregar
        </button>
      </form>

      {entries.length === 0 ? (
        <Empty>La lista negra está vacía. Quien cancele un pedido se agrega aquí automáticamente.</Empty>
      ) : (
        <ul className="panel divide-y divide-linea">
          {entries.map((b) => (
            <li key={b.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="break-words font-semibold">{b.name}</p>
                <p className="text-xs text-suave">
                  {b.reason ?? "Sin motivo"}, desde el <span className="capitalize">{shortDay(b.cancelled_on)}</span>
                </p>
              </div>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-md text-suave hover:bg-deuda/10 hover:text-deuda"
                aria-label={`Quitar a ${b.name} de la lista negra`}
                title="Quitar de la lista negra"
                onClick={() => onRemove(b.id)}
              >
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
