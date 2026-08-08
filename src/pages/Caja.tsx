import { useEffect, useState, type ReactNode } from 'react';
import { Banknote, CheckCircle, LockKeyhole, WalletCards } from 'lucide-react';
import { closeCash, getCashSession, getOrders, openCash, orderTotal, subscribeRestaurantData, updateOrderStatus } from '../services/restaurant-store';
import type { CashSession, RestaurantOrder } from '../types/restaurant';

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

export default function Caja() {
  const [session, setSession] = useState<CashSession | null>(null);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [amount, setAmount] = useState('100');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const load = async () => {
      try { const [cash, currentOrders] = await Promise.all([getCashSession(), getOrders()]); setSession(cash); setOrders(currentOrders); }
      catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo cargar la caja.'); }
    };
    void load();
    void subscribeRestaurantData(load).then((cleanup) => { unsubscribe = cleanup; }).catch((reason: Error) => setError(reason.message));
    return () => unsubscribe?.();
  }, []);
  const delivered = orders.filter((order) => order.status === 'entregado');
  const paid = orders.filter((order) => order.status === 'pagado');
  const salesTotal = paid.reduce((sum, order) => sum + orderTotal(order), 0);
  const expectedCash = (session?.openingAmount ?? 0) + paid.filter((order) => order.paymentMethod === 'Efectivo').reduce((sum, order) => sum + orderTotal(order), 0);

  async function refresh() {
    const [cash, currentOrders] = await Promise.all([getCashSession(), getOrders()]);
    setSession(cash); setOrders(currentOrders);
  }

  async function collect(order: RestaurantOrder) {
    setBusyAction(order.id);
    setError('');
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: 'pagado', paymentMethod } : item));
    try {
      await updateOrderStatus(order.id, 'pagado', paymentMethod);
    } catch (reason) {
      setOrders((current) => current.map((item) => item.id === order.id ? order : item));
      setError(reason instanceof Error ? reason.message : 'No se pudo cobrar el pedido.');
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 p-4 dark:bg-slate-950 lg:p-6">
      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div><h1 className="text-2xl font-black text-slate-900 dark:text-white">Caja y cobros</h1><p className="text-sm text-slate-500">Apertura, pedidos pendientes y ventas cobradas</p></div>
        <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${session?.status === 'abierta' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}><span className={`h-2.5 w-2.5 rounded-full ${session?.status === 'abierta' ? 'bg-emerald-500' : 'bg-slate-400'}`} />Caja {session?.status ?? 'cerrada'}</div>
      </div>

      {(!session || session.status === 'cerrada') ? (
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-blue-100 text-blue-600"><LockKeyhole /></div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Abrir caja</h2><p className="mt-2 text-sm text-slate-500">Registra el efectivo con el que empiezas el turno.</p>
          <label className="mt-6 block text-left text-xs font-bold uppercase text-slate-500">Monto inicial</label><input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-center text-2xl font-black dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          <button disabled={busyAction === 'open'} onClick={() => { setBusyAction('open'); void openCash(Number(amount)).then(refresh).catch((reason: Error) => setError(reason.message)).finally(() => setBusyAction(null)); }} className="mt-4 w-full rounded-xl bg-blue-600 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-60">{busyAction === 'open' ? 'Abriendo…' : 'Abrir turno'}</button>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <Metric icon={<Banknote />} label="Fondo inicial" value={money.format(session.openingAmount)} />
            <Metric icon={<WalletCards />} label="Ventas cobradas" value={money.format(salesTotal)} />
            <Metric icon={<CheckCircle />} label="Efectivo esperado" value={money.format(expectedCash)} />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <h2 className="mb-4 font-bold text-slate-900 dark:text-white">Pedidos pendientes de cobro</h2>
              <div className="space-y-3">{delivered.map((order) => <div key={order.id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center"><div><strong className="dark:text-white">Pedido #{String(order.number).padStart(3, '0')}</strong><p className="text-sm capitalize text-slate-500">{order.table ?? order.serviceType} · {order.items.length} productos</p></div><div className="flex items-center gap-2"><strong className="mr-2 text-lg dark:text-white">{money.format(orderTotal(order))}</strong><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option>Efectivo</option><option>Yape/Plin</option><option>Tarjeta</option><option>Transferencia</option></select><button disabled={busyAction === order.id} onClick={() => { void collect(order); }} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{busyAction === order.id ? 'Cobrando…' : 'Cobrar'}</button></div></div>)}{!delivered.length && <p className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400 dark:border-slate-700">No hay pedidos pendientes.</p>}</div>
            </section>
            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><h2 className="font-bold text-slate-900 dark:text-white">Cerrar turno</h2><p className="mt-2 text-sm text-slate-500">Cuenta el efectivo físico antes de cerrar.</p><label className="mt-5 block text-xs font-bold uppercase text-slate-500">Efectivo contado</label><input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /><button disabled={busyAction === 'close'} onClick={() => { if (confirm('¿Cerrar la caja actual?')) { setBusyAction('close'); void closeCash(Number(amount)).then(refresh).catch((reason: Error) => setError(reason.message)).finally(() => setBusyAction(null)); } }} className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-60 dark:bg-red-600">{busyAction === 'close' ? 'Cerrando…' : 'Cerrar caja'}</button></aside>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500">{icon}{label}</div><strong className="text-2xl text-slate-900 dark:text-white">{value}</strong></div>;
}
