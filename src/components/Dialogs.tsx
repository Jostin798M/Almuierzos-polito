"use client";

import { useState } from "react";
import { isAnonymous } from "@/lib/parser";
import type { Order } from "@/lib/types";
import { Modal, parseNum, usd } from "./ui";

export function EditDialog({
  order,
  onClose,
  onSave,
}: {
  order: Order;
  onClose: () => void;
  onSave: (v: { name: string; note: string; price: number }) => void;
}) {
  const [name, setName] = useState(order.name);
  const [note, setNote] = useState(order.note ?? "");
  const [price, setPrice] = useState(String(order.price));
  const priceNum = parseNum(price);
  const valid = name.trim().length > 0 && priceNum >= 0;

  return (
    <Modal title="Editar pedido" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave({ name, note, price: priceNum });
        }}
      >
        <label className="block text-sm font-semibold">
          Nombre
          <input className="campo mt-1 font-normal" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label className="block text-sm font-semibold">
          Nota
          <input
            className="campo mt-1 font-normal"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: sin ensalada, extra arroz"
          />
        </label>
        <label className="block text-sm font-semibold">
          Precio
          <input
            className="campo num mt-1 font-normal"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={!valid}>
            Guardar cambios
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function CancelDialog({
  order,
  onClose,
  onConfirm,
}: {
  order: Order;
  onClose: () => void;
  onConfirm: (v: { blacklist: boolean; reason: string }) => void;
}) {
  const anon = isAnonymous(order.name);
  const [blacklist, setBlacklist] = useState(!anon);
  const [reason, setReason] = useState("");

  return (
    <Modal title="Cancelar pedido" onClose={onClose}>
      <p className="mb-3 break-words text-sm">
        Vas a cancelar el pedido de <strong>{order.name}</strong> ({usd(order.price)}).
      </p>
      <label className="mb-3 flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={blacklist}
          disabled={anon}
          onChange={(e) => setBlacklist(e.target.checked)}
        />
        <span>
          Agregar a la lista negra
          {anon && <span className="block text-xs text-suave">Este nombre no identifica a nadie, no se puede bloquear.</span>}
        </span>
      </label>
      {blacklist && (
        <label className="mb-3 block text-sm font-semibold">
          Motivo (opcional)
          <input
            className="campo mt-1 font-normal"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Canceló su pedido"
          />
        </label>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>
          Volver
        </button>
        <button type="button" className="btn-danger" onClick={() => onConfirm({ blacklist, reason })}>
          Cancelar pedido
        </button>
      </div>
    </Modal>
  );
}
