"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { login } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <div className="panel p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-tinta text-white">
            <Lock size={18} />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold leading-tight">Almuerzos</h1>
            <p className="text-sm text-suave">Escribe tu PIN para entrar</p>
          </div>
        </div>
        <form action={action} className="space-y-3">
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            autoFocus
            required
            placeholder="PIN"
            aria-label="PIN"
            className="campo num text-lg tracking-[0.3em]"
          />
          {state?.error && (
            <p role="alert" className="text-sm font-medium text-deuda">
              {state.error}
            </p>
          )}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Comprobando" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
