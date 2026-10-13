import { useEffect, useState } from "react";
import { getSupplies, type Supply } from '../services/inventory-store';
import { getOrders, orderTotal } from '../services/restaurant-store';
import { getPeriodSummary, getSalePage, getSalesCsv, limaToday, shiftDate, emptyPeriod, type PeriodSummary, type SaleSummary } from '../services/reporting';
import LoadMoreRecords from '../components/LoadMoreRecords';
import type { RestaurantOrder } from "../types/restaurant";
const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});
export default function Reportes() {
  const [summaryData, setSummary] = useState<PeriodSummary>(emptyPeriod);
  const [paidData, setPaid] = useState<SaleSummary[]>([]), [supplies,setSupplies] = useState<Supply[]>([]);
  const [period,setPeriod] = useState('30'), [selectedDate,setSelectedDate] = useState(limaToday);
  const [selectedSale,setSelectedSale] = useState<RestaurantOrder | null>(null);
  const [loadedRange,setLoadedRange] = useState(''), [exporting,setExporting] = useState(false), [error,setError] = useState('');
  const to = period === 'date' ? selectedDate : limaToday();
  const from = period === 'date' ? selectedDate : shiftDate(to, 1-Number(period));
  const range = `${from}:${to}`, loadingDay = loadedRange !== range;
  const summary = loadedRange === range ? summaryData : emptyPeriod, paid = loadedRange === range ? paidData : [];
  useEffect(() => { let active = true; void getSupplies().then(rows => { if(active)setSupplies(rows); }).catch(e => { if(active)setError(e.message); }); return () => { active=false; }; }, []);
  useEffect(() => {
    let active=true;
    void Promise.all([getPeriodSummary(from,to),getSalePage(from,to)]).then(([totals,rows])=>{if(active){setSummary(totals);setPaid(rows);setLoadedRange(`${from}:${to}`);setSelectedSale(null);setError('');}}).catch(e=>{if(active){setError(e.message);setSummary(emptyPeriod);setPaid([]);setLoadedRange(`${from}:${to}`);}});
    return () => { active=false; };
  },[from,to]);
  const {sales,expenses,otherIncome,methods,products} = summary;
  const openSale = async (id:string) => { try { const rows=await getOrders({ids:[id]});if(!rows[0])throw new Error('El pedido ya no está disponible.');setSelectedSale(rows[0]); } catch(e){setError(e instanceof Error?e.message:'No se pudo abrir el detalle.');} };
  const exportCsv = async () => {
    setExporting(true);setError('');
    try {
      const csv=await getSalesCsv(from,to);
      const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`reporte-ventas-${from}-${to}.csv`;a.click();URL.revokeObjectURL(a.href);
    }catch(e){setError(e instanceof Error?e.message:'No se pudo exportar el periodo completo.');}finally{setExporting(false);}
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
            Ventas de esta sucursal; compras y movimientos manuales de toda la empresa.
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
            max={limaToday()}
            onChange={(e) => setSelectedDate(e.target.value || limaToday())}
            className="rounded-xl border bg-white px-4 py-3 font-bold"
            aria-label="Fecha de las ventas"
          />}
          <button
            disabled={exporting || loadingDay} onClick={() => void exportCsv()}
            className="rounded-xl bg-blue-600 px-5 py-3 font-black text-white"
          >
            {exporting ? "Exportando…" : "Descargar CSV"}
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
                  key={p.key}
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
              <button type="button" onClick={() => void openSale(o.id)} key={o.id} className="flex w-full items-center justify-between border-b py-3 text-left transition hover:bg-blue-50">
                <span><b>Pedido #{String(o.numero).padStart(3, "0")}</b><small className="block text-slate-500">{new Date(o.updated_at).toLocaleString("es-PE",{timeZone:"America/Lima"})} · {o.metodo_pago || "Sin método"}</small></span>
                <span className="flex items-center gap-3"><strong>{money.format(o.total)}</strong><span className="text-sm font-bold text-blue-600">Ver</span></span>
              </button>
            ))
          )}
          <LoadMoreRecords key={`${from}:${to}`} rows={paid} load={page => getSalePage(from,to,page)} onLoaded={setPaid}/>
          <p className="text-xs text-slate-500">Detalle: {paid.length} de {summary.count} ventas. Los totales y el CSV incluyen el periodo completo.</p>
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
