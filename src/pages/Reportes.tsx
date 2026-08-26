import { useEffect, useMemo, useState } from "react";
import {
  getAccountingEntries,
  type AccountingEntry,
} from "../services/erp-store";
import {
  getInventoryPurchases,
  getSupplies,
  type InventoryPurchase,
  type Supply,
} from "../services/inventory-store";
import { getOrders, getPaidOrdersByDate, orderTotal } from "../services/restaurant-store";
import type { RestaurantOrder } from "../types/restaurant";
const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});
export default function Reportes() {
  const [orders, setOrders] = useState<RestaurantOrder[]>([]),
    [purchases, setPurchases] = useState<InventoryPurchase[]>([]),
    [entries, setEntries] = useState<AccountingEntry[]>([]),
    [supplies, setSupplies] = useState<Supply[]>([]),
    [period, setPeriod] = useState("30"),
    [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString("en-CA")),
    [dailyOrders, setDailyOrders] = useState<RestaurantOrder[] | null>(null),
    [selectedSale, setSelectedSale] = useState<RestaurantOrder | null>(null),
    [loadingDay, setLoadingDay] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    void Promise.all([
      getOrders(),
      getInventoryPurchases(),
      getAccountingEntries(),
      getSupplies(),
    ])
      .then(([o, p, e, s]) => {
        setOrders(o);
        setPurchases(p);
        setEntries(e);
        setSupplies(s);
      })
      .catch((e) =>
        setError(
          e instanceof Error
            ? e.message
            : "No se pudieron generar los reportes.",
        ),
      );
  }, []);
  useEffect(() => {
    if (period !== "date") {
      setDailyOrders(null);
      return;
    }
    const start = new Date(`${selectedDate}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    setLoadingDay(true);
    setError("");
    void getPaidOrdersByDate(start.toISOString(), end.toISOString())
      .then(setDailyOrders)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudieron cargar las ventas del día."))
      .finally(() => setLoadingDay(false));
  }, [period, selectedDate]);
  const start = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - Number(period) + 1);
    return d;
  }, [period]);
  const paid = period === "date" ? (dailyOrders ?? []) : orders.filter(
      (o) => o.status === "pagado" && new Date(o.updatedAt) >= start,
    ),
    buys = purchases.filter((p) => p.status === 'registrada' && new Date(p.createdAt) >= start),
    manual = entries.filter(
      (e) => new Date(`${e.fecha}T00:00:00`) >= start,
    );
  const sales = paid.reduce((s, o) => s + orderTotal(o), 0),
    expenses =
      buys.reduce((s, p) => s + p.totalCost, 0) +
      manual
        .filter((e) => e.tipo === "egreso")
        .reduce((s, e) => s + e.monto, 0),
    otherIncome = manual
      .filter((e) => e.tipo === "ingreso")
      .reduce((s, e) => s + e.monto, 0);
  const methods = paid.reduce<Record<string, number>>((a, o) => {
    const k = o.paymentMethod || "Sin método";
    a[k] = (a[k] || 0) + orderTotal(o);
    return a;
  }, {});
  const products = Object.values(
    paid
      .flatMap((o) => o.items)
      .reduce<
        Record<string, { name: string; quantity: number; amount: number }>
      >((a, i) => {
        const k = i.productId || i.name;
        if (!a[k]) a[k] = { name: i.name, quantity: 0, amount: 0 };
        a[k].quantity += i.quantity;
        a[k].amount += i.quantity * i.unitPrice;
        return a;
      }, {}),
  )
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);
  const exportCsv = () => {
    const lines = [
      ["Fecha", "Pedido", "Servicio", "Método", "Total"],
      ...paid.map((o) => [
        new Date(o.updatedAt).toLocaleDateString("es-PE"),
        String(o.number),
        o.serviceType,
        o.paymentMethod || "",
        orderTotal(o).toFixed(2),
      ]),
    ];
    const blob = new Blob(
      [
        lines
          .map((r) =>
            r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
          )
          .join("\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reporte-ventas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div id="daily-report" className="space-y-6 p-6">
      <style>{`@media print { body * { visibility: hidden !important; } #daily-report, #daily-report * { visibility: visible !important; } #daily-report { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; padding: 0 !important; color: #000 !important; background: #fff !important; } #daily-report section, #daily-report section > div, #daily-report .report-block { break-inside: avoid !important; page-break-inside: avoid !important; box-shadow: none !important; } .report-actions { display: none !important; } } @page { size: A4 portrait; margin: 10mm; }`}</style>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-950">
            Reportes reales
          </h1>
          <p className="font-medium text-slate-600">
            Ventas, métodos de pago, compras, resultado e inventario.
          </p>
        </div>
        <div className="report-actions flex gap-2">
          <select
            className="rounded-xl border bg-white px-4 py-3 font-bold"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="1">Hoy</option>
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="date">Elegir un día</option>
          </select>
          {period === "date" && <input
            type="date"
            value={selectedDate}
            max={new Date().toLocaleDateString("en-CA")}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border bg-white px-4 py-3 font-bold"
            aria-label="Fecha de las ventas"
          />}
          <button
            onClick={exportCsv}
            className="rounded-xl bg-blue-600 px-5 py-3 font-black text-white"
          >
            Descargar CSV
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-slate-900 px-5 py-3 font-black text-white"
          >
            Guardar / enviar PDF
          </button>
        </div>
      </div>
      {error && (
        <div className="rounded-xl bg-red-50 p-4 font-bold text-red-700">
          {error}
        </div>
      )}
      <section className="grid gap-4 md:grid-cols-4">
        <Kpi title="Ventas cobradas" value={money.format(sales)} />
        <Kpi title="Otros ingresos" value={money.format(otherIncome)} />
        <Kpi title="Compras y gastos" value={money.format(expenses)} />
        <Kpi
          title="Resultado operativo"
          value={money.format(sales + otherIncome - expenses)}
          tone={sales + otherIncome - expenses >= 0 ? "green" : "red"}
        />
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5">
          <h2 className="mb-4 text-lg font-black">Ventas por método de pago</h2>
          {Object.keys(methods).length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {Object.entries(methods)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between rounded-xl bg-slate-50 p-4"
                  >
                    <span className="font-bold">{k}</span>
                    <strong>{money.format(v)}</strong>
                  </div>
                ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <h2 className="mb-4 text-lg font-black">Productos más vendidos</h2>
          {products.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {products.map((p, i) => (
                <div
                  key={p.name}
                  className="grid grid-cols-[32px_1fr_auto] items-center gap-3 rounded-xl bg-slate-50 p-3"
                >
                  <b className="text-blue-600">#{i + 1}</b>
                  <span className="font-bold">
                    {p.name}
                    <small className="block font-medium text-slate-500">
                      {p.quantity} unidades
                    </small>
                  </span>
                  <strong>{money.format(p.amount)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5">
          <h2 className="mb-4 text-lg font-black">{period === "date" ? `Ventas del ${new Date(`${selectedDate}T12:00:00`).toLocaleDateString("es-PE")}` : "Últimas ventas"}</h2>
          {loadingDay ? <p className="py-8 text-center font-bold text-slate-500">Cargando ventas…</p> : paid.length === 0 ? (
            <Empty />
          ) : (
            paid.map((o) => (
              <button type="button" onClick={() => setSelectedSale(o)} key={o.id} className="flex w-full items-center justify-between border-b py-3 text-left transition hover:bg-blue-50">
                <span><b>Pedido #{String(o.number).padStart(3, "0")}</b><small className="block text-slate-500">{new Date(o.updatedAt).toLocaleString("es-PE")} · {o.paymentMethod || "Sin método"}</small></span>
                <span className="flex items-center gap-3"><strong>{money.format(orderTotal(o))}</strong><span className="text-sm font-bold text-blue-600">Ver</span></span>
              </button>
            ))
          )}
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <h2 className="mb-4 text-lg font-black">Alertas de stock</h2>
          {supplies.filter((s) => s.stock <= s.minStock).length === 0 ? (
            <p className="rounded-xl bg-emerald-50 p-6 text-center font-bold text-emerald-700">
              Inventario sin alertas.
            </p>
          ) : (
            supplies
              .filter((s) => s.stock <= s.minStock)
              .map((s) => (
                <div key={s.id} className="flex justify-between border-b py-3">
                  <span className="font-bold">{s.name}</span>
                  <strong className="text-red-600">
                    {s.stock} {s.unit} / mín. {s.minStock}
                  </strong>
                </div>
              ))
          )}
        </div>
      </section>
      {selectedSale && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/60 p-4" onClick={() => setSelectedSale(null)}>
        <section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-5 flex items-start justify-between"><div><h2 className="text-2xl font-black">Pedido #{String(selectedSale.number).padStart(3, "0")}</h2><p className="text-sm text-slate-500">{new Date(selectedSale.updatedAt).toLocaleString("es-PE")}</p></div><button type="button" onClick={() => setSelectedSale(null)} className="rounded-lg bg-slate-100 px-3 py-2 font-black">Cerrar</button></div>
          <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm"><div><span className="text-slate-500">Servicio</span><b className="block capitalize">{selectedSale.table || selectedSale.serviceType}</b></div><div><span className="text-slate-500">Método de pago</span><b className="block">{selectedSale.paymentMethod || "Sin método"}</b></div>{selectedSale.customer && <div className="col-span-2"><span className="text-slate-500">Cliente</span><b className="block">{selectedSale.customer}</b></div>}</div>
          <div className="divide-y">{selectedSale.items.map((item, index) => <div key={`${item.productId}-${index}`} className="grid grid-cols-[1fr_auto] gap-3 py-3"><div><b>{item.quantity} × {item.name}</b>{item.notes && <small className="block text-slate-500">{item.notes}</small>}</div><strong>{money.format(item.quantity * item.unitPrice)}</strong></div>)}</div>
          <div className="mt-4 flex justify-between border-t-2 border-slate-900 pt-4 text-xl"><b>Total</b><strong>{money.format(orderTotal(selectedSale))}</strong></div>
        </section>
      </div>}
    </div>
  );
}
function Kpi({
  title,
  value,
  tone = "blue",
}: {
  title: string;
  value: string;
  tone?: "blue" | "green" | "red";
}) {
  return (
    <div className="report-block rounded-2xl border bg-white p-5">
      <p className="font-bold text-slate-500">{title}</p>
      <strong
        className={`text-2xl ${tone === "green" ? "text-emerald-600" : tone === "red" ? "text-red-600" : "text-slate-950"}`}
      >
        {value}
      </strong>
    </div>
  );
}
function Empty() {
  return (
    <p className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">
      Sin datos para este periodo.
    </p>
  );
}
