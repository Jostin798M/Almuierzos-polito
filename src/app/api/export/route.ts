import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { COOKIE, verifyToken } from "@/lib/auth";
import { dayOf, rangeBounds, type Range } from "@/lib/dates";
import { fetchOrders, getSettings, getWorkers } from "@/lib/data";
import { periodOf } from "@/lib/calc";
import { STATUS_LABEL } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: NextRequest) {
  // Defensa extra: ademas del proxy, validamos la sesion aqui
  if (!(await verifyToken(req.cookies.get(COOKIE)?.value))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const format = sp.get("format") === "xlsx" ? "xlsx" : "csv";
  const range = (["day", "week", "month"].includes(sp.get("range") ?? "") ? sp.get("range") : "month") as Range;
  const { from, to } = rangeBounds(range, dayOf());

  const [orders, settings, workers] = await Promise.all([
    fetchOrders(from, to),
    getSettings(),
    getWorkers(),
  ]);

  const header = ["Fecha", "Nombre", "Estado", "Método de pago", "Precio", "Nota", "Extra", "Cancelado"];
  const rows = orders.map((o) => [
    o.day,
    o.name,
    STATUS_LABEL[o.status],
    o.payment_method ?? "",
    o.price.toFixed(2),
    o.note ?? "",
    o.is_extra ? "Sí" : "",
    o.cancelled ? "Sí" : "",
  ]);
  const filename = `almuerzos_${from}_a_${to}`;

  if (format === "csv") {
    // BOM al inicio para que Excel abra bien las tildes
    const body = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  const period = periodOf(orders, from, to, settings, workers.filter((w) => w.active));
  const wb = new ExcelJS.Workbook();
  wb.creator = "Almuerzos Dashboard";

  const s1 = wb.addWorksheet("Pedidos");
  s1.addRow(header).font = { bold: true };
  rows.forEach((r) => s1.addRow(r.map((v, i) => (i === 4 ? Number(v) : v))));
  s1.columns = [14, 32, 22, 16, 10, 28, 8, 10].map((width) => ({ width }));

  const s2 = wb.addWorksheet("Resumen diario");
  s2.addRow(["Fecha", "Almuerzos", "Vendido", "Cobrado"]).font = { bold: true };
  [...period.daily].reverse().forEach((d) => s2.addRow([d.day, d.count, d.total, d.cobrado]));
  s2.columns = [14, 12, 12, 12].map((width) => ({ width }));

  const s3 = wb.addWorksheet("Trabajadores");
  s3.addRow(["Trabajador", "Por almuerzo", "Ganado", "Pendiente de cobro"]).font = { bold: true };
  period.workers.forEach((w) => s3.addRow([w.name, w.per_lunch, w.ganado, w.pendiente]));
  s3.addRow([]);
  const t = period.totals;
  s3.addRow(["Cobrado", t.cobrado]);
  s3.addRow([`Gastos e insumos (${settings.cost_percent}%)`, t.costos]);
  s3.addRow(["Sobrante después de repartir", t.sobrante]);
  s3.columns = [34, 14, 12, 20].map((width) => ({ width }));

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}
