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
import { getOrders, orderTotal } from "../services/restaurant-store";
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
  const start = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - Number(period) + 1);
    return d;
  }, [period]);
  const paid = orders.filter(
      (o) => o.status === "pagado" && new Date(o.updatedAt) >= start,
    ),
    buys = purchases.filter((p) => new Date(p.createdAt) >= start),
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
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-950">
            Reportes reales
          </h1>
          <p className="font-medium text-slate-600">
            Ventas, métodos de pago, compras, resultado e inventario.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="rounded-xl border bg-white px-4 py-3 font-bold"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="1">Hoy</option>
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
          </select>
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
            Imprimir
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
          <h2 className="mb-4 text-lg font-black">Últimas ventas</h2>
          {paid.length === 0 ? (
            <Empty />
          ) : (
            paid.slice(0, 8).map((o) => (
              <div key={o.id} className="flex justify-between border-b py-3">
                <span className="font-bold">
                  Pedido #{String(o.number).padStart(3, "0")}
                </span>
                <strong>{money.format(orderTotal(o))}</strong>
              </div>
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
    <div className="rounded-2xl border bg-white p-5">
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
