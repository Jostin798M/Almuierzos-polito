"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { COOKIE, SESSION_DAYS, makeToken, pinMatches, verifyToken } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { dayOf } from "@/lib/dates";
import { getDayPrice, getSettings } from "@/lib/data";
import { cleanName, isAnonymous, nameKey } from "@/lib/parser";
import {
  STATUSES,
  isPaid,
  type ActionResult,
  type PayMethod,
  type Status,
} from "@/lib/types";

/* ---------- utilidades internas ---------- */

async function guard() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!(await verifyToken(token))) throw new Error("Sesión vencida. Entra de nuevo con tu PIN.");
}

async function run<T = undefined>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    await guard();
    const data = await fn();
    revalidatePath("/");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

type Fields = Partial<{
  status: Status;
  payment_method: PayMethod | null;
  name: string;
  note: string | null;
  price: number;
}>;

type UndoEntry =
  | { kind: "restore"; items: { id: string; fields: Fields }[] }
  | { kind: "add"; ids: string[] }
  | { kind: "cancel"; id: string; blacklistId: string | null };

async function logUndo(entry: UndoEntry) {
  const { kind, ...payload } = entry;
  const { data, error } = await db()
    .from("undo_log")
    .insert({ kind, payload })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  // Guardamos solo las ultimas 30 acciones
  await db().from("undo_log").delete().lt("id", Number(data.id) - 30);
}

async function getOrder(id: string) {
  const { data, error } = await db().from("orders").select("*").eq("id", id).single();
  if (error || !data) throw new Error("No encontré ese pedido");
  return data;
}

const touch = () => ({ updated_at: new Date().toISOString() });

/* ---------- sesion ---------- */

export async function login(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const pin = String(formData.get("pin") ?? "");
  if (!pinMatches(pin)) {
    await new Promise((r) => setTimeout(r, 800)); // frena adivinar el PIN
    return { error: "PIN incorrecto" };
  }
  const jar = await cookies();
  jar.set(COOKIE, await makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect("/login");
}

/* ---------- pedidos ---------- */

export type AddResult = { added: number; skippedExisting: number; skippedLimit: number };

export async function addOrders(
  rawNames: string[],
  opts: { skipExisting: boolean; force: boolean },
) {
  return run<AddResult>(async () => {
    const today = dayOf();
    const settings = await getSettings();
    const { price } = await getDayPrice(today, settings);

    const { data: existing, error } = await db()
      .from("orders")
      .select("name")
      .eq("day", today)
      .eq("cancelled", false);
    if (error) throw new Error(error.message);

    const taken = new Set((existing ?? []).filter((o) => !isAnonymous(o.name)).map((o) => nameKey(o.name)));
    let names = rawNames.map(cleanName);

    let skippedExisting = 0;
    if (opts.skipExisting) {
      const before = names.length;
      names = names.filter((n) => isAnonymous(n) || !taken.has(nameKey(n)));
      skippedExisting = before - names.length;
    }

    let skippedLimit = 0;
    if (!opts.force) {
      const room = Math.max(0, settings.daily_limit - (existing?.length ?? 0));
      if (names.length > room) {
        skippedLimit = names.length - room;
        names = names.slice(0, room);
      }
    }

    if (names.length === 0) return { added: 0, skippedExisting, skippedLimit };

    const { data, error: insErr } = await db()
      .from("orders")
      .insert(names.map((name) => ({ day: today, name, price })))
      .select("id");
    if (insErr) throw new Error(insErr.message);

    await logUndo({ kind: "add", ids: (data ?? []).map((r) => r.id as string) });
    return { added: names.length, skippedExisting, skippedLimit };
  });
}

export async function addExtra() {
  return run(async () => {
    const today = dayOf();
    const settings = await getSettings();
    const { price } = await getDayPrice(today, settings);
    const { data, error } = await db()
      .from("orders")
      .insert({ day: today, name: "Extra", price, is_extra: true })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logUndo({ kind: "add", ids: [data.id as string] });
  });
}

export async function moveOrder(id: string, status: Status) {
  return run(async () => {
    if (!STATUSES.includes(status)) throw new Error("Estado no válido");
    const o = await getOrder(id);
    const method: PayMethod | null =
      isPaid(status) && !o.payment_method ? "efectivo" : (o.payment_method as PayMethod | null);
    const { error } = await db()
      .from("orders")
      .update({ status, payment_method: method, ...touch() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await logUndo({
      kind: "restore",
      items: [{ id, fields: { status: o.status, payment_method: o.payment_method } }],
    });
  });
}

export async function setPayMethod(id: string, method: PayMethod) {
  return run(async () => {
    if (method !== "efectivo" && method !== "cuenta") throw new Error("Método no válido");
    const o = await getOrder(id);
    const { error } = await db()
      .from("orders")
      .update({ payment_method: method, ...touch() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await logUndo({ kind: "restore", items: [{ id, fields: { payment_method: o.payment_method } }] });
  });
}

export async function editOrder(
  id: string,
  input: { name: string; note: string; price: number },
) {
  return run(async () => {
    const name = cleanName(input.name);
    const price = Number(input.price);
    if (!Number.isFinite(price) || price < 0) throw new Error("Precio no válido");
    const o = await getOrder(id);
    const note = input.note.trim() || null;
    const { error } = await db()
      .from("orders")
      .update({ name, note, price, ...touch() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await logUndo({
      kind: "restore",
      items: [{ id, fields: { name: o.name, note: o.note, price: Number(o.price) } }],
    });
  });
}

export async function cancelOrder(id: string, opts: { blacklist: boolean; reason: string }) {
  return run(async () => {
    const o = await getOrder(id);
    const { error } = await db()
      .from("orders")
      .update({ cancelled: true, cancelled_at: new Date().toISOString(), ...touch() })
      .eq("id", id);
    if (error) throw new Error(error.message);

    let blacklistId: string | null = null;
    if (opts.blacklist && !isAnonymous(o.name)) {
      const key = nameKey(o.name);
      const { data: dup } = await db().from("blacklist").select("id").eq("name_key", key).limit(1);
      if (!dup || dup.length === 0) {
        const { data, error: blErr } = await db()
          .from("blacklist")
          .insert({
            name: o.name,
            name_key: key,
            reason: opts.reason.trim() || "Canceló su pedido",
            cancelled_on: o.day,
          })
          .select("id")
          .single();
        if (blErr) throw new Error(blErr.message);
        blacklistId = data.id as string;
      }
    }
    await logUndo({ kind: "cancel", id, blacklistId });
  });
}

export async function restoreOrder(id: string) {
  return run(async () => {
    const { error } = await db()
      .from("orders")
      .update({ cancelled: false, cancelled_at: null, ...touch() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  });
}

/** Cobra una o varias deudas: pasan a "retirado" con el metodo elegido. */
export async function settleDebts(ids: string[], method: PayMethod) {
  return run(async () => {
    if (ids.length === 0) return;
    const { data: before, error } = await db().from("orders").select("*").in("id", ids);
    if (error) throw new Error(error.message);
    const { error: upErr } = await db()
      .from("orders")
      .update({ status: "retirado", payment_method: method, ...touch() })
      .in("id", ids);
    if (upErr) throw new Error(upErr.message);
    await logUndo({
      kind: "restore",
      items: (before ?? []).map((o) => ({
        id: o.id as string,
        fields: { status: o.status as Status, payment_method: o.payment_method as PayMethod | null },
      })),
    });
  });
}

export async function undo() {
  return run(async () => {
    const { data, error } = await db()
      .from("undo_log")
      .select("*")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("No hay nada que deshacer");

    const p = data.payload as Record<string, unknown>;
    if (data.kind === "add") {
      await db().from("orders").delete().in("id", p.ids as string[]);
    } else if (data.kind === "restore") {
      for (const item of p.items as { id: string; fields: Fields }[]) {
        await db().from("orders").update({ ...item.fields, ...touch() }).eq("id", item.id);
      }
    } else if (data.kind === "cancel") {
      await db()
        .from("orders")
        .update({ cancelled: false, cancelled_at: null, ...touch() })
        .eq("id", p.id as string);
      if (p.blacklistId) await db().from("blacklist").delete().eq("id", p.blacklistId as string);
    }
    await db().from("undo_log").delete().eq("id", data.id);
  });
}

/* ---------- lista negra ---------- */

export async function addBlacklist(name: string, reason: string) {
  return run(async () => {
    const clean = cleanName(name);
    if (isAnonymous(clean)) throw new Error("Escribe un nombre real");
    const key = nameKey(clean);
    const { data: dup } = await db().from("blacklist").select("id").eq("name_key", key).limit(1);
    if (dup && dup.length > 0) throw new Error("Ya está en la lista negra");
    const { error } = await db()
      .from("blacklist")
      .insert({ name: clean, name_key: key, reason: reason.trim() || null, cancelled_on: dayOf() });
    if (error) throw new Error(error.message);
  });
}

export async function removeBlacklist(id: string) {
  return run(async () => {
    const { error } = await db().from("blacklist").delete().eq("id", id);
    if (error) throw new Error(error.message);
  });
}

/* ---------- ajustes ---------- */

export async function saveSettings(input: {
  base_price: number;
  daily_limit: number;
  cost_percent: number;
}) {
  return run(async () => {
    const { base_price, daily_limit, cost_percent } = input;
    if (!(base_price >= 0)) throw new Error("Precio base no válido");
    if (!Number.isInteger(daily_limit) || daily_limit < 0) throw new Error("Límite no válido");
    if (!(cost_percent >= 0 && cost_percent <= 100)) throw new Error("El porcentaje va de 0 a 100");
    const { error } = await db()
      .from("settings")
      .update({ base_price, daily_limit, cost_percent })
      .eq("id", 1);
    if (error) throw new Error(error.message);
  });
}

/** Precio solo para hoy. price = null vuelve al precio base. */
export async function setTodayPrice(price: number | null, applyToExisting: boolean) {
  return run(async () => {
    const today = dayOf();
    if (price === null) {
      await db().from("day_prices").delete().eq("day", today);
      return;
    }
    if (!(price >= 0)) throw new Error("Precio no válido");
    const { error } = await db().from("day_prices").upsert({ day: today, price });
    if (error) throw new Error(error.message);
    if (applyToExisting) {
      await db().from("orders").update({ price, ...touch() }).eq("day", today).eq("cancelled", false);
    }
  });
}

/* ---------- trabajadores ---------- */

export async function saveWorker(input: { id?: string; name: string; per_lunch: number }) {
  return run(async () => {
    const name = input.name.trim();
    if (!name) throw new Error("Escribe el nombre del trabajador");
    if (!(input.per_lunch >= 0)) throw new Error("Monto no válido");
    if (input.id) {
      const { error } = await db()
        .from("workers")
        .update({ name, per_lunch: input.per_lunch })
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    } else {
      const { data: last } = await db()
        .from("workers")
        .select("position")
        .order("position", { ascending: false })
        .limit(1);
      const position = (last?.[0]?.position ?? 0) + 1;
      const { error } = await db().from("workers").insert({ name, per_lunch: input.per_lunch, position });
      if (error) throw new Error(error.message);
    }
  });
}

export async function removeWorker(id: string) {
  return run(async () => {
    const { error } = await db().from("workers").delete().eq("id", id);
    if (error) throw new Error(error.message);
  });
}
