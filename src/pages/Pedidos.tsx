import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, X } from 'lucide-react';
import { cancelOrder, getOrders, orderTotal, subscribeRestaurantData } from '../services/restaurant-store';
import type { RestaurantOrder } from '../types/restaurant';
import { useNotification } from '../context/notification-context';
import { userErrorMessage } from '../lib/errors';

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
const statuses = ['todos', 'nuevo', 'preparando', 'listo', 'entregado', 'pagado', 'anulado'];

export default function Pedidos() {
  const [rows, setRows] = useState<RestaurantOrder[]>([]);
  const [filter, setFilter] = useState('todos');
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const [selected, setSelected] = useState<RestaurantOrder | null>(null);
  const { notify } = useNotification();

  const load = useCallback(() => getOrders()
    .then((data) => {
      setRows(data);
      setSelected((current) => current ? data.find((row) => row.id === current.id) ?? null : null);
      setError('');
    })
    .catch((reason: unknown) => {
      const message = userErrorMessage(reason, 'No se pudieron cargar los pedidos.');
      setError(message);
      notify(message, 'error');
    }), [notify]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const refresh = () => { if (active) void load(); };
    refresh();
    void subscribeRestaurantData(refresh, (status) => {
      if (!active) return;
      setLive(status === 'connected');
      if (status === 'error') notify('Se perdió la actualización en tiempo real. Intentando reconectar…', 'error');
    }).then((cleanup) => { unsubscribe = cleanup; })
      .catch((reason: unknown) => {
        const message = userErrorMessage(reason, 'No se pudo iniciar la actualización en tiempo real.');
        setError(message);
        notify(message, 'error');
      });
    return () => { active = false; unsubscribe?.(); };
  }, [load, notify]);

  const visible = useMemo(() => filter === 'todos' ? rows : rows.filter((row) => row.status === filter), [rows, filter]);

  const annul = async (row: RestaurantOrder) => {
    const reason = prompt(`Motivo obligatorio para anular el pedido #${row.number}:`);
    if (!reason?.trim()) return;
    try {
      await cancelOrder(row.id, reason);
      setSelected(null);
      notify('Pedido anulado y stock restaurado cuando correspondía.', 'success');
      await load();
    } catch (reason) {
      const message = userErrorMessage(reason, 'No se pudo anular el pedido.');
      setError(message);
      notify(message, 'error');
    }
  };

  return <div className="space-y-6 p-4 sm:p-6">
    <div><h1 className="text-3xl font-black text-slate-950">Pedidos</h1><p className="font-medium text-slate-600">Seguimiento real desde la comanda hasta el cobro.</p><span className={`text-xs font-bold ${live ? 'text-emerald-600' : 'text-amber-600'}`}>{live ? '● En tiempo real' : '● Conectando…'}</span></div>
    {error && <div className="rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</div>}
    <div className="flex flex-wrap gap-2">{statuses.map((status) => <button key={status} onClick={() => setFilter(status)} className={`rounded-full px-4 py-2 text-sm font-black capitalize ${filter === status ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>{status}</button>)}</div>
    <section className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50 text-xs font-black uppercase text-slate-600"><tr><th className="p-4">Pedido</th><th>Servicio</th><th>Detalle</th><th>Estado</th><th>Pago</th><th>Total</th><th>Acción</th></tr></thead><tbody className="divide-y">{visible.length === 0 ? <tr><td colSpan={7} className="p-12 text-center text-slate-500">No hay pedidos en este estado.</td></tr> : visible.map((row) => <tr key={row.id} className="cursor-pointer transition hover:bg-blue-50/50" onClick={() => setSelected(row)}>
      <td className="p-4 font-black">#{String(row.number).padStart(3, '0')}<small className="block font-medium text-slate-500">{new Date(row.createdAt).toLocaleString('es-PE')}</small></td>
      <td className="capitalize">{row.serviceType}<small className="block text-slate-500">{row.table || row.customer || '—'}</small></td>
      <td><button type="button" onClick={(event) => { event.stopPropagation(); setSelected(row); }} className="inline-flex items-center gap-2 font-bold text-blue-600"><Eye className="h-4 w-4" />Ver {row.items.reduce((total, item) => total + item.quantity, 0)} productos</button></td>
      <td><span className={`rounded-full px-3 py-1 text-xs font-black ${row.status === 'anulado' ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{row.status}</span></td><td>{row.paymentMethod || 'Pendiente'}</td><td className="font-black">{money.format(orderTotal(row))}</td><td>{row.status !== 'anulado' && <button onClick={(event) => { event.stopPropagation(); void annul(row); }} className="font-black text-red-600">Anular</button>}</td>
    </tr>)}</tbody></table></section>

    {selected && <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/50" role="dialog" aria-modal="true" aria-label={`Detalle del pedido ${selected.number}`} onClick={() => setSelected(null)}>
      <aside className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b p-5"><div><p className="text-xs font-black uppercase text-blue-600">Detalle del pedido</p><h2 className="text-2xl font-black text-slate-950">#{String(selected.number).padStart(3, '0')} · {selected.table || selected.customer || selected.serviceType}</h2><p className="mt-1 text-sm text-slate-500">{new Date(selected.createdAt).toLocaleString('es-PE')}</p></div><button type="button" onClick={() => setSelected(null)} className="rounded-xl bg-slate-100 p-2 text-slate-600" aria-label="Cerrar detalle"><X className="h-5 w-5" /></button></header>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">{selected.items.map((item, index) => <div key={`${item.productId}-${item.additionId ?? 'original'}-${index}`} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-black text-slate-900">{item.quantity} × {item.name}</p>{item.notes && <p className="mt-1 text-sm text-slate-500">Nota: {item.notes}</p>}{item.additionId && <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-800">Adicional</span>}</div><strong className="shrink-0 text-slate-950">{money.format(item.quantity * item.unitPrice)}</strong></div><p className="mt-2 text-xs text-slate-500">Precio unitario: {money.format(item.unitPrice)}</p></div>)}</div>
        <footer className="border-t bg-slate-50 p-5"><div className="mb-2 flex justify-between text-sm font-bold text-slate-600"><span>Estado</span><span className="capitalize">{selected.status}</span></div><div className="mb-4 flex justify-between text-sm font-bold text-slate-600"><span>Pago</span><span>{selected.paymentMethod || 'Pendiente'}</span></div><div className="flex items-end justify-between"><span className="font-bold text-slate-600">Total de la cuenta</span><strong className="text-3xl text-slate-950">{money.format(orderTotal(selected))}</strong></div></footer>
      </aside>
    </div>}
  </div>;
}
