"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import type { Status } from "@/lib/types";

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

const usdFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const usd = (n: number) => usdFmt.format(n);

export function parseNum(s: string): number {
  const n = Number(s.replace(",", ".").trim());
  return s.trim() === "" || !Number.isFinite(n) ? NaN : n;
}

// Clases escritas completas para que Tailwind las detecte
export const STATUS_STYLE: Record<Status, { dot: string; bar: string; text: string; soft: string }> = {
  en_espera: { dot: "bg-espera", bar: "border-l-espera", text: "text-espera", soft: "bg-espera/10" },
  confirmado: { dot: "bg-confirmado", bar: "border-l-confirmado", text: "text-confirmado", soft: "bg-confirmado/10" },
  pagado_sin_retirar: { dot: "bg-pagado", bar: "border-l-pagado", text: "text-pagado", soft: "bg-pagado/10" },
  retirado: { dot: "bg-retirado", bar: "border-l-retirado", text: "text-retirado", soft: "bg-retirado/10" },
  retirado_sin_pagar: { dot: "bg-deuda", bar: "border-l-deuda", text: "text-deuda", soft: "bg-deuda/10" },
};

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-md text-suave hover:bg-fondo"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-md bg-fondo p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "min-h-[36px] rounded px-3.5 text-sm font-semibold transition-colors",
            value === o.value ? "bg-white text-tinta shadow-ficha" : "text-suave hover:text-tinta",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed border-linea px-4 py-6 text-center text-sm text-suave">{children}</p>;
}
