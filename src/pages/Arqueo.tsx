import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getBusinessContext, getCashSession, getCurrentStaffName, getOrders } from '../services/restaurant-store';

type Audit = { id: string; caja_id: string; estado: string; responsable: string; observaciones: string | null; iniciado_at: string; cerrado_at: string | null };
type Line = { insumo_id: string; nombre: string; unidad: string; stock_inicial: number; comprado: number; vendido: number; otras_salidas: number; stock_esperado: number; costo_unitario: number; conteo: number | null };
const money = (n: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);
const amount = (n: number) => new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 }).format(n);

export default function Arqueo() {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [history, setHistory] = useState<Audit[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [cashId, setCashId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const salesOnlyMode = true; // Chicken Huerta: por ahora solo resumen/cierre de ventas
  const [salesSummary, setSalesSummary] = useState<{ name: string; quantity: number; total: number }[]>([]);

  async function selectAudit(next: Audit) {
    const { data, error: requestError } = await supabase.from('rest_arqueo_items').select('*').eq('arqueo_id', next.id).order('nombre');
    if (requestError) throw requestError;
    setAudit(next);
    setLines((data ?? []).map(x => ({ ...x, stock_inicial: Number(x.stock_inicial), comprado: Number(x.comprado), vendido: Number(x.vendido), otras_salidas: Number(x.otras_salidas), stock_esperado: Number(x.stock_esperado), costo_unitario: Number(x.costo_unitario), conteo: x.conteo == null ? null : Number(x.conteo) })));
    setCounts(Object.fromEntries((data ?? []).filter(x => x.conteo != null).map(x => [x.insumo_id, String(x.conteo)])));
    setNotes(next.observaciones ?? '');
  }
  async function load() {
    const [{ empresaId }, cash] = await Promise.all([getBusinessContext(), getCashSession(true)]);
    setCashId(cash?.id ?? null);
    const { data, error: requestError } = await supabase.from('rest_arqueos').select('*').eq('empresa_id', empresaId).order('iniciado_at', { ascending: false }).limit(20);
    if (requestError) throw requestError;
    const audits = (data ?? []) as Audit[];
    setHistory(audits);
    const current = audits.find(x => x.caja_id === cash?.id) ?? audits[0];
    const orders = await getOrders();
    const shiftOrders = cash?.id ? orders.filter(order => order.cashSessionId === cash.id && order.status === 'pagado') : [];
    const summary = new Map<string, { name: string; quantity: number; total: number }>();
    shiftOrders.flatMap(order => order.items).forEach(item => {
      const key = item.productId || item.name;
      const previous = summary.get(key) ?? { name: item.name, quantity: 0, total: 0 };
      previous.quantity += item.quantity;
      previous.total += item.quantity * item.unitPrice;
      summary.set(key, previous);
    });
    setSalesSummary([...summary.values()].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name)));
    if (current) await selectAudit(current);
    else { setAudit(null); setLines([]); }
  }
  useEffect(() => { void load().catch(e => setError(String(e.message ?? e))).finally(() => setLoading(false)); }, []);

  async function start(refresh = false) {
    if (!cashId) return;
    setBusy(true); setError('');
    try {
      const name = await getCurrentStaffName();
      const { error: requestError } = await supabase.rpc('rest_iniciar_arqueo', { p_caja_id: cashId, p_responsable: name, p_actualizar: refresh });
      if (requestError) throw requestError;
      await load();
    } catch (e) { setError(String((e as Error).message ?? e)); }
    finally { setBusy(false); }
  }
  async function close() {
    if (!audit || !confirm('¿Cerrar este arqueo? El conteo quedará registrado.')) return;
    setBusy(true); setError('');
    try {
      const payload = Object.fromEntries(lines.map(x => [x.insumo_id, Number(counts[x.insumo_id])]));
      const { error: requestError } = await supabase.rpc('rest_cerrar_arqueo', { p_arqueo_id: audit.id, p_conteos: payload, p_observaciones: notes });
      if (requestError) throw requestError;
      await load();
    } catch (e) { setError(String((e as Error).message ?? e)); }
    finally { setBusy(false); }
  }

  const missing = lines.filter(x => (Number(counts[x.insumo_id]) - x.stock_esperado) < -0.0001);
  const loss = missing.reduce((sum, x) => sum + (x.stock_esperado - Number(counts[x.insumo_id])) * x.costo_unitario, 0);
  const complete = lines.every(x => counts[x.insumo_id] !== undefined && counts[x.insumo_id].trim() !== '' && Number.isFinite(Number(counts[x.insumo_id])) && Number(counts[x.insumo_id]) >= 0);
  const salesUnits = salesSummary.reduce((sum, item) => sum + item.quantity, 0);
  const salesTotal = salesSummary.reduce((sum, item) => sum + item.total, 0);
  const salesReport = salesSummary.length
    ? salesSummary.map(item => `• ${item.name}: ${amount(item.quantity)} vendido${item.quantity === 1 ? '' : 's'} · ${money(item.total)}`).join('\n')
    : 'Sin ventas pagadas registradas en este turno.';
  const report = salesOnlyMode
    ? `HUERTA ERP · CIERRE DE TURNO\nTurno: ${audit ? new Date(audit.iniciado_at).toLocaleString('es-PE') : ''}\nResponsable: ${audit?.responsable ?? ''}\n\nRESUMEN DE VENTAS\n${salesReport}\n\nTotal de platos/productos: ${amount(salesUnits)}\nTotal vendido: ${money(salesTotal)}`
    : `HUERTA ERP · CIERRE DE TURNO\nTurno: ${audit ? new Date(audit.iniciado_at).toLocaleString('es-PE') : ''}\nResponsable: ${audit?.responsable ?? ''}\n\nRESUMEN DE VENTAS\n${salesReport}\n\nTotal de platos/productos: ${amount(salesUnits)}\nTotal vendido: ${money(salesTotal)}\n\nARQUEO DE INVENTARIO\n${lines.map(x => `${x.nombre}: inicial ${amount(x.stock_inicial)}, vendido ${amount(x.vendido)}, esperado ${amount(x.stock_esperado)}, físico ${counts[x.insumo_id] ?? 'pendiente'}, diferencia ${complete ? amount(Number(counts[x.insumo_id]) - x.stock_esperado) : 'pendiente'}`).join('\n')}\nFaltantes: ${missing.length} · Valor al costo: ${money(loss)}\nObservaciones: ${notes || 'Ninguna'}`;
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: 'Arqueo Huerta ERP', text: report }); return; } catch { /* Compartir cancelado */ } }
    await navigator.clipboard.writeText(report);
    alert('Reporte copiado. Puedes pegarlo en WhatsApp.');
  }
  return <div className="space-y-5 p-4 text-slate-900 dark:text-white lg:p-6">
    <style>{`@media print { body * { visibility: hidden !important; } #arqueo-report, #arqueo-report * { visibility: visible !important; } #arqueo-report { position: absolute; top: 0; left: 0; width: 100%; color: black !important; background: white !important; } #arqueo-report input { border: 0 !important; } } @page { size: A4 landscape; margin: 12mm; }`}</style>
    <div><h1 className="text-3xl font-black">{salesOnlyMode ? "Resumen de ventas" : "Arqueo de inventario"}</h1><p className="text-sm text-slate-500">{salesOnlyMode ? "Revisa los platos vendidos durante el turno y comparte el cierre con tu encargado." : "Cuenta los insumos al final del turno y compara con el stock que registró el sistema. El arqueo de efectivo sigue en Caja."}</p></div>
    {error && <p role="alert" className="rounded-xl bg-red-100 p-4 text-red-800">{error}</p>}
    {loading ? <p>Cargando arqueos…</p> : <>
      {!salesOnlyMode && <div className="flex flex-wrap items-center gap-3">
        {cashId && !history.some(x => x.caja_id === cashId) && <button disabled={busy} onClick={() => void start()} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">Iniciar arqueo del turno</button>}
        {cashId && audit?.caja_id === cashId && audit.estado === 'abierto' && <button disabled={busy} onClick={() => { if (confirm('¿Actualizar el stock esperado? Tendrás que repetir el conteo físico.')) void start(true); }} className="rounded-xl border border-blue-500 px-5 py-3 font-bold text-blue-600 disabled:opacity-50">Actualizar por nuevas ventas</button>}
        {!cashId && <p className="rounded-xl bg-amber-50 p-3 text-amber-800">Para iniciar un arqueo, abre primero un turno en Caja.</p>}
        {history.length > 0 && <select aria-label="Seleccionar arqueo" value={audit?.id ?? ''} onChange={e => { const selected = history.find(x => x.id === e.target.value); if (selected) void selectAudit(selected).catch(err => setError(String(err.message ?? err))); }} className="rounded-xl border p-3 text-slate-900">{history.map(x => <option key={x.id} value={x.id}>{new Date(x.iniciado_at).toLocaleString('es-PE')} · {x.estado}</option>)}</select>}
      </div>}
      {audit && <><div className="rounded-2xl border bg-white p-4 dark:bg-slate-900"><div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-black">Resumen de ventas del turno</h2><p className="text-sm text-slate-500">Platos cobrados en la caja actual. Se actualiza automáticamente desde Ventas.</p></div><div className="text-right"><span className="block text-xs font-semibold uppercase text-slate-500">Unidades vendidas</span><b className="text-2xl">{salesSummary.reduce((sum, item) => sum + item.quantity, 0)}</b></div></div>{salesSummary.length ? <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-white"><tr><th className="p-3">Plato / producto</th><th className="p-3 text-center">Cantidad</th><th className="p-3 text-right">Total vendido</th></tr></thead><tbody>{salesSummary.map(item => <tr key={item.name} className="border-t"><td className="p-3 font-semibold">{item.name}</td><td className="p-3 text-center text-lg font-black">{amount(item.quantity)}</td><td className="p-3 text-right font-bold">{money(item.total)}</td></tr>)}</tbody><tfoot><tr className="border-t-2 font-black"><td className="p-3">TOTAL</td><td className="p-3 text-center">{amount(salesSummary.reduce((sum, item) => sum + item.quantity, 0))}</td><td className="p-3 text-right">{money(salesSummary.reduce((sum, item) => sum + item.total, 0))}</td></tr></tfoot></table></div> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800">Todavía no hay platos pagados registrados en este turno.</p>}</div>{!salesOnlyMode && <div id="arqueo-report" className="space-y-4"><div className="rounded-2xl border bg-white p-4 dark:bg-slate-900"><h2 className="mb-2 text-xl font-black">Huerta ERP · Arqueo de inventario</h2><p><b>Responsable:</b> {audit.responsable} · <b>Turno:</b> {new Date(audit.iniciado_at).toLocaleString('es-PE')} · <b>Estado:</b> {audit.estado}</p><p className="mt-2 text-sm text-slate-500">Las compras, mermas y ajustes del turno ya están incluidos en el stock esperado. El valor del faltante usa el costo promedio del insumo.</p></div>
      <div className="overflow-x-auto rounded-2xl border bg-white dark:bg-slate-900"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-white"><tr>{['Insumo','Inicial','Entradas','Vendido','Otras salidas','Esperado','Físico','Diferencia'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{lines.map(x => { const count = counts[x.insumo_id]; const difference = count === undefined || count === '' ? null : Number(count) - x.stock_esperado; return <tr key={x.insumo_id} className="border-t"><td className="p-3 font-semibold">{x.nombre}<small className="block text-slate-500">{x.unidad}</small></td><td className="p-3">{amount(x.stock_inicial)}</td><td className="p-3">{amount(x.comprado)}</td><td className="p-3">{amount(x.vendido)}</td><td className="p-3">{amount(x.otras_salidas)}</td><td className="p-3 font-bold">{amount(x.stock_esperado)}</td><td className="p-3">{audit.estado === 'abierto' ? <input aria-label={`Conteo físico de ${x.nombre}`} type="number" min="0" step="0.001" value={count ?? ''} onChange={e => setCounts(prev => ({ ...prev, [x.insumo_id]: e.target.value }))} className="w-24 rounded border p-2 text-slate-900" /> : amount(x.conteo ?? 0)}</td><td className={`p-3 font-bold ${difference === null ? '' : difference < 0 ? 'text-red-600' : difference > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>{difference === null ? 'Pendiente' : `${difference < 0 ? 'Faltan ' : difference > 0 ? 'Sobran ' : 'Cuadra · '}${amount(Math.abs(difference))} · ${money(Math.abs(difference) * x.costo_unitario)}`}</td></tr>; })}</tbody></table></div>
      <div className="rounded-xl bg-amber-50 p-4 font-semibold text-amber-900">Productos con faltante: {missing.length} · Pérdida estimada al costo: {money(loss)}</div>
      {notes && <p className="rounded-xl border p-3"><b>Observaciones:</b> {notes}</p>}</div>}
      {!salesOnlyMode && <label className="block">Observaciones<textarea disabled={audit.estado === 'cerrado'} value={notes} onChange={e => setNotes(e.target.value)} className="mt-2 block min-h-20 w-full rounded-xl border p-3 text-slate-900" placeholder="Motivo de las diferencias, mermas o incidencias" /></label>}
      <div className="flex flex-wrap gap-3">{!salesOnlyMode && audit.estado === 'abierto' && <button disabled={busy || !complete || !cashId || audit.caja_id !== cashId} onClick={() => void close()} className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50">Cerrar arqueo</button>}<button disabled={salesOnlyMode ? salesSummary.length === 0 : !complete} onClick={() => void share().catch(e => setError(String(e.message ?? e)))} className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-50">Compartir reporte</button>{!salesOnlyMode && <button disabled={!complete} onClick={() => window.print()} className="rounded-xl border px-5 py-3 font-bold">Imprimir / PDF</button>}</div></>}
    </>}
  </div>;
}
