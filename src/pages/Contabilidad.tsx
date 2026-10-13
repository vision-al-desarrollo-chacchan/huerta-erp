import { useEffect, useState } from "react";
import { createAccountingEntry } from '../services/erp-store';
import { getPeriodSummary, getLedgerPage, limaToday, emptyPeriod, type PeriodSummary, type LedgerRow } from '../services/reporting';
import LoadMoreRecords from '../components/LoadMoreRecords';
const money = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }),
  cls =
    "rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600";
const displayDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value.split("-").reverse().join("/")
    : new Date(value).toLocaleDateString("es-PE",{timeZone:"America/Lima"});
export default function Contabilidad() {
  const [rowData,setRows] = useState<LedgerRow[]>([]), [summaryData,setSummary] = useState<PeriodSummary>(emptyPeriod);
  const [from,setFrom] = useState(() => `${limaToday().slice(0,7)}-01`), [to,setTo] = useState(limaToday);
  const [loadedRange,setLoadedRange] = useState('');
  const range = `${from}:${to}`;
  const rows = loadedRange === range ? rowData : [], summary = loadedRange === range ? summaryData : emptyPeriod;
  const [error,setError] = useState(''), [saving,setSaving] = useState(false);
  const [f, setF] = useState({
    fecha: limaToday(),
    tipo: "egreso" as "ingreso" | "egreso",
    categoria: "Servicios",
    descripcion: "",
    monto: "",
    metodo_pago: "Efectivo",
    referencia: "",
  });
  const load = async () => {
    const [totals,data] = await Promise.all([getPeriodSummary(from,to),getLedgerPage(from,to)]);setSummary(totals);setRows(data);setLoadedRange(`${from}:${to}`);setError('');
  };
  useEffect(() => {
    let active=true;
    void Promise.all([getPeriodSummary(from,to),getLedgerPage(from,to)]).then(([totals,data])=>{if(active){setSummary(totals);setRows(data);setLoadedRange(`${from}:${to}`);setError('');}}).catch(e=>{if(active){setError(e.message);setSummary(emptyPeriod);setRows([]);setLoadedRange(`${from}:${to}`);}});
    return () => { active=false; };
  },[from,to]);
  const income = summary.sales+summary.otherIncome, expense=summary.expenses;
  const save = async () => {
    if (!f.descripcion.trim() || Number(f.monto) <= 0)
      return setError("Completa la descripción y un monto mayor a cero.");
    setSaving(true);
    try {
      await createAccountingEntry({
        ...f,
        monto: Number(f.monto),
        referencia: f.referencia || null,
      });
      setF({ ...f, descripcion: "", monto: "", referencia: "" });
      await load();
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-black text-slate-950">
          Contabilidad operativa
        </h1>
        <p className="font-medium text-slate-600">
          Integra ventas cobradas, compras de inventario y movimientos manuales.
        </p>
      </div>
      {error && (
        <div className="rounded-xl bg-red-50 p-4 font-bold text-red-700">
          {error}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3"><label className="text-sm font-bold">Desde<input aria-label="Desde" type="date" className={cls} value={from} onChange={e=>setFrom(e.target.value || to)}/></label><label className="text-sm font-bold">Hasta<input aria-label="Hasta" type="date" className={cls} value={to} onChange={e=>setTo(e.target.value || from)}/></label><p className="text-sm text-slate-500">Totales del periodo completo. Compras y movimientos manuales corresponden a toda la empresa; ventas a esta sucursal.</p></div>
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5">
          <p className="font-bold text-slate-500">Ingresos</p>
          <strong className="text-3xl text-emerald-600">
            {money.format(income)}
          </strong>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="font-bold text-slate-500">Egresos</p>
          <strong className="text-3xl text-red-600">
            {money.format(expense)}
          </strong>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="font-bold text-slate-500">Resultado operativo</p>
          <strong
            className={`text-3xl ${income - expense >= 0 ? "text-blue-600" : "text-red-600"}`}
          >
            {money.format(income - expense)}
          </strong>
        </div>
      </section>
      <section className="grid gap-4 rounded-2xl border bg-white p-5 md:grid-cols-4">
        <select
          className={cls}
          value={f.tipo}
          onChange={(e) =>
            setF({ ...f, tipo: e.target.value as "ingreso" | "egreso" })
          }
        >
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
        </select>
        <input
          className={cls}
          type="date"
          value={f.fecha}
          onChange={(e) => setF({ ...f, fecha: e.target.value })}
        />
        <select
          className={cls}
          value={f.categoria}
          onChange={(e) => setF({ ...f, categoria: e.target.value })}
        >
          <option>Servicios</option>
          <option>Alquiler</option>
          <option>Planilla</option>
          <option>Mantenimiento</option>
          <option>Impuestos</option>
          <option>Otros</option>
        </select>
        <input
          className={cls}
          placeholder="Descripción *"
          value={f.descripcion}
          onChange={(e) => setF({ ...f, descripcion: e.target.value })}
        />
        <div className="flex rounded-xl border px-4 font-black">
          S/&nbsp;
          <input
            className="w-full py-3 outline-none"
            inputMode="decimal"
            placeholder="Monto"
            value={f.monto}
            onChange={(e) =>
              setF({ ...f, monto: e.target.value.replace(/[^0-9.]/g, "") })
            }
          />
        </div>
        <select
          className={cls}
          value={f.metodo_pago}
          onChange={(e) => setF({ ...f, metodo_pago: e.target.value })}
        >
          <option>Efectivo</option>
          <option>Yape/Plin</option>
          <option>Tarjeta</option>
          <option>Transferencia</option>
        </select>
        <input
          className={cls}
          placeholder="Referencia o comprobante"
          value={f.referencia}
          onChange={(e) => setF({ ...f, referencia: e.target.value })}
        />
        <button
          disabled={saving}
          onClick={() => void save()}
          className="rounded-xl bg-blue-600 font-black text-white disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Registrar movimiento"}
        </button>
      </section>
      <section className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-600">
            <tr>
              <th className="p-4">Fecha</th>
              <th>Detalle</th>
              <th>Categoría</th>
              <th>Origen</th>
              <th>Método</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-500">
                  Aún no hay movimientos.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="p-4">
                    {displayDate(r.date)}
                  </td>
                  <td className="font-bold">{r.description}</td>
                  <td>{r.category}</td>
                  <td>{r.source}</td>
                  <td>{r.method}</td>
                  <td
                    className={`font-black ${r.type === "ingreso" ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {r.type === "ingreso" ? "+" : "-"} {money.format(r.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <LoadMoreRecords key={`${from}:${to}`} rows={rows} load={page=>getLedgerPage(from,to,page)} onLoaded={setRows}/>
      </section>
    </div>
  );
}
