import { useEffect, useState, type ReactNode } from 'react';
import { Banknote, CheckCircle, LockKeyhole, WalletCards } from 'lucide-react';
import { closeCash, getCashMovements, getCashSession, getCurrentStaffName, getOrders, openCash, orderTotal, registerCashMovement, subscribeRestaurantData, updateOrderStatus } from '../services/restaurant-store';
import type { CashMovement, CashSession, RestaurantOrder } from '../types/restaurant';

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

function errorMessage(reason: unknown, fallback: string) {
  if (reason instanceof Error) return reason.message;
  if (reason && typeof reason === 'object') {
    const value = reason as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [value.message, value.details, value.hint, value.code].filter((item) => typeof item === 'string' && item.length > 0);
    if (parts.length) return parts.join(' · ');
  }
  return fallback;
}

export default function Caja() {
  const [session, setSession] = useState<CashSession | null>(null);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [amount, setAmount] = useState('100');
  const [countedAmount, setCountedAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [nextShiftFund, setNextShiftFund] = useState('100');
  const [paymentMethods, setPaymentMethods] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffName, setStaffName] = useState('Usuario');
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [movementType, setMovementType] = useState<'ingreso' | 'egreso'>('egreso');
  const [movementConcept, setMovementConcept] = useState('');
  const [movementAmount, setMovementAmount] = useState('');
  const [closedReport, setClosedReport] = useState<{ session: CashSession; payments: Record<string, number>; movements: CashMovement[] } | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const load = async () => {
      try { const [cash, currentOrders, currentStaff, currentMovements] = await Promise.all([getCashSession(), getOrders(), getCurrentStaffName(), getCashMovements()]); setSession(cash); setOrders(currentOrders); setStaffName(currentStaff); setMovements(currentMovements); }
      catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo cargar la caja.'); }
      finally { setLoading(false); }
    };
    void load();
    void subscribeRestaurantData(load).then((cleanup) => { unsubscribe = cleanup; }).catch((reason: Error) => setError(reason.message));
    return () => unsubscribe?.();
  }, []);
  const delivered = orders.filter((order) => order.status === 'entregado');
  const paid = orders.filter((order) => order.status === 'pagado');
  const salesTotal = paid.reduce((sum, order) => sum + orderTotal(order), 0);
  const paymentTotals = paid.reduce<Record<string, number>>((totals, order) => { const method = order.paymentMethod ?? 'Sin método'; totals[method] = (totals[method] ?? 0) + orderTotal(order); return totals; }, {});
  const cashMovementNet = movements.filter((item) => item.paymentMethod === 'Efectivo').reduce((sum, item) => sum + (item.type === 'ingreso' ? item.amount : -item.amount), 0);
  const expectedCash = (session?.openingAmount ?? 0) + (paymentTotals.Efectivo ?? 0) + cashMovementNet;
  const displayedCountedAmount = countedAmount === '' ? expectedCash.toFixed(2) : countedAmount;
  const closingDifference = Number(displayedCountedAmount) - expectedCash;

  async function refresh() {
    const [cash, currentOrders, currentMovements] = await Promise.all([getCashSession(), getOrders(), getCashMovements()]);
    setSession(cash); setOrders(currentOrders); setMovements(currentMovements);
  }

  async function collect(order: RestaurantOrder) {
    const paymentMethod = paymentMethods[order.id] ?? 'Efectivo';
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

  async function saveMovement() {
    if (!movementConcept.trim() || Number(movementAmount) <= 0) return;
    setBusyAction('movement'); setError('');
    try { await registerCashMovement({ type: movementType, concept: movementConcept, amount: Number(movementAmount) }); setMovementConcept(''); setMovementAmount(''); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo registrar el movimiento.'); }
    finally { setBusyAction(null); }
  }

  async function finishCash() {
    setBusyAction('close'); setError('');
    try {
      const closed = await closeCash(Number(displayedCountedAmount), Number(nextShiftFund), closingNotes);
      setClosedReport({ session: closed, payments: { ...paymentTotals }, movements: [...movements] });
      setSession(null);
    } catch (reason) {
      setError(errorMessage(reason, 'No se pudo cerrar la caja.'));
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

      {loading ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="text-center"><div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" /><p className="mt-4 text-sm font-semibold text-slate-500">Consultando caja abierta…</p></div>
        </div>
      ) : (!session || session.status === 'cerrada') ? (
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-blue-100 text-blue-600"><LockKeyhole /></div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Abrir caja</h2><p className="mt-2 text-sm text-slate-500">Registra el efectivo con el que empiezas el turno.</p>
          <div className="mt-5 rounded-xl bg-blue-50 p-3 text-left dark:bg-blue-950/40"><p className="text-[11px] font-bold uppercase tracking-wide text-blue-500">Responsable de apertura</p><p className="mt-1 font-bold text-blue-900 dark:text-blue-100">{staffName}</p></div>
          <label className="mt-6 block text-left text-xs font-bold uppercase text-slate-500">Monto inicial</label><input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-center text-2xl font-black dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          <button disabled={busyAction === 'open'} onClick={() => { setBusyAction('open'); void openCash(Number(amount)).then(refresh).catch((reason: Error) => setError(reason.message)).finally(() => setBusyAction(null)); }} className="mt-4 w-full rounded-xl bg-blue-600 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-60">{busyAction === 'open' ? 'Abriendo…' : 'Abrir turno'}</button>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <Metric icon={<Banknote />} label={`Fondo inicial · ${session.openedByName ?? staffName}`} value={money.format(session.openingAmount)} />
            <Metric icon={<WalletCards />} label="Ventas cobradas" value={money.format(salesTotal)} />
            <Metric icon={<CheckCircle />} label="Efectivo esperado" value={money.format(expectedCash)} />
          </div>
          <div className="mb-6 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><h2 className="mb-4 font-bold text-slate-900 dark:text-white">Ventas por método de pago</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{['Efectivo','Yape/Plin','Tarjeta','Transferencia'].map((method) => <div key={method} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-[10px] font-bold uppercase text-slate-400">{method}</p><strong className="mt-1 block text-slate-900 dark:text-white">{money.format(paymentTotals[method] ?? 0)}</strong></div>)}</div><p className="mt-3 text-xs text-slate-400">Solo el efectivo modifica el dinero físico esperado en caja.</p></section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-slate-900 dark:text-white">Caja chica</h2><div className="flex rounded-lg bg-slate-100 p-1 text-xs font-bold dark:bg-slate-800"><button onClick={() => setMovementType('egreso')} className={`rounded-md px-3 py-1.5 ${movementType === 'egreso' ? 'bg-red-600 text-white' : 'text-slate-500'}`}>Salida</button><button onClick={() => setMovementType('ingreso')} className={`rounded-md px-3 py-1.5 ${movementType === 'ingreso' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>Ingreso</button></div></div><div className="grid gap-2 sm:grid-cols-[1fr_100px_auto]"><input value={movementConcept} onChange={(event) => setMovementConcept(event.target.value)} placeholder="Ej.: Compra de hielo" className="rounded-lg border border-slate-200 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" /><input type="number" min="0.01" step="0.01" value={movementAmount} onChange={(event) => setMovementAmount(event.target.value)} placeholder="S/ 0.00" className="rounded-lg border border-slate-200 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" /><button disabled={busyAction === 'movement' || !movementConcept.trim() || Number(movementAmount) <= 0} onClick={() => { void saveMovement(); }} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50 dark:bg-blue-600">{busyAction === 'movement' ? 'Guardando…' : 'Registrar'}</button></div>{movements.length > 0 && <div className="mt-3 max-h-28 space-y-1 overflow-y-auto">{movements.slice(0,5).map((item) => <div key={item.id} className="flex justify-between text-xs"><span className="truncate text-slate-500">{item.concept}</span><strong className={item.type === 'ingreso' ? 'text-emerald-600' : 'text-red-600'}>{item.type === 'ingreso' ? '+' : '-'}{money.format(item.amount)}</strong></div>)}</div>}</section>
          </div>
          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <h2 className="mb-4 font-bold text-slate-900 dark:text-white">Pedidos pendientes de cobro</h2>
              <div className="space-y-3">{delivered.map((order) => <div key={order.id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center"><div><strong className="dark:text-white">Pedido #{String(order.number).padStart(3, '0')}</strong><p className="text-sm capitalize text-slate-500">{order.table ?? order.serviceType} · {order.items.length} productos</p></div><div className="flex items-center gap-2"><strong className="mr-2 text-lg dark:text-white">{money.format(orderTotal(order))}</strong><select value={paymentMethods[order.id] ?? 'Efectivo'} onChange={(event) => setPaymentMethods((current) => ({ ...current, [order.id]: event.target.value }))} className="rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option>Efectivo</option><option>Yape/Plin</option><option>Tarjeta</option><option>Transferencia</option></select><button disabled={busyAction === order.id} onClick={() => { void collect(order); }} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{busyAction === order.id ? 'Cobrando…' : 'Cobrar'}</button></div></div>)}{!delivered.length && <p className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400 dark:border-slate-700">No hay pedidos pendientes.</p>}</div>
            </section>
            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <h2 className="font-bold text-slate-900 dark:text-white">Arqueo y cierre</h2><p className="mt-2 text-sm text-slate-500">Cuenta únicamente el efectivo físico de la caja.</p>
              <p className="mt-3 rounded-lg bg-slate-100 p-2 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Responsable del cierre: {staffName}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center"><div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><p className="text-[10px] font-bold uppercase text-slate-400">Esperado</p><strong className="text-sm dark:text-white">{money.format(expectedCash)}</strong></div><div className={`rounded-lg p-3 ${Math.abs(closingDifference) < 0.01 ? 'bg-emerald-50 text-emerald-700' : closingDifference > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}><p className="text-[10px] font-bold uppercase">{Math.abs(closingDifference) < 0.01 ? 'Cuadrado' : closingDifference > 0 ? 'Sobrante' : 'Faltante'}</p><strong className="text-sm">{money.format(Math.abs(closingDifference))}</strong></div></div>
              <label className="mt-5 block text-xs font-bold uppercase text-slate-500">Efectivo contado</label><input type="number" min="0" step="0.01" value={displayedCountedAmount} onChange={(event) => setCountedAmount(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Fondo siguiente turno</label><input type="number" min="0" max={displayedCountedAmount} step="0.01" value={nextShiftFund} onChange={(event) => setNextShiftFund(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /><p className="mt-2 text-xs text-slate-500">Efectivo a retirar: <strong>{money.format(Math.max(0, Number(displayedCountedAmount) - Number(nextShiftFund || 0)))}</strong></p>
              {Math.abs(closingDifference) >= 0.01 && <><label className="mt-4 block text-xs font-bold uppercase text-amber-600">Explicación obligatoria</label><textarea value={closingNotes} onChange={(event) => setClosingNotes(event.target.value)} placeholder="Indica el motivo del sobrante o faltante..." className="mt-2 min-h-20 w-full rounded-xl border border-amber-300 p-3 text-sm dark:bg-slate-950 dark:text-white" /></>}
              <button disabled={busyAction === 'close' || Number(nextShiftFund) < 0 || Number(nextShiftFund) > Number(displayedCountedAmount) || (Math.abs(closingDifference) >= 0.01 && !closingNotes.trim())} onClick={() => { if (confirm('¿Cerrar la caja actual?')) void finishCash(); }} className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600">{busyAction === 'close' ? 'Cerrando…' : 'Cerrar caja'}</button>
            </aside>
          </div>
        </>
      )}
      {closedReport && <>
        <style>{`@media print { body * { visibility: hidden !important; } #cash-close-receipt, #cash-close-receipt * { visibility: visible !important; } #cash-close-receipt { position: absolute !important; left: 0; top: 0; width: 72mm !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; border: 0 !important; color: #000 !important; background: #fff !important; } .receipt-actions { display: none !important; } } @page { size: 80mm auto; margin: 4mm; }`}</style>
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
          <div id="cash-close-receipt" className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 text-slate-950 shadow-2xl">
            <div className="text-center"><h2 className="text-xl font-black">CHICKEN HUERTA</h2><p className="text-xs">REPORTE DE CIERRE DE CAJA</p><p className="mt-1 text-xs">{new Date(closedReport.session.closedAt!).toLocaleString('es-PE')}</p></div>
            <div className="my-4 border-y border-dashed border-slate-400 py-3 text-xs"><p>Apertura: {closedReport.session.openedByName}</p><p>Cierre: {closedReport.session.closedByName}</p><p>Inicio: {new Date(closedReport.session.openedAt).toLocaleString('es-PE')}</p><p>Fin: {new Date(closedReport.session.closedAt!).toLocaleString('es-PE')}</p></div>
            <ReceiptRow label="Fondo inicial" value={money.format(closedReport.session.openingAmount)} />
            {['Efectivo','Yape/Plin','Tarjeta','Transferencia'].map((method) => <ReceiptRow key={method} label={method} value={money.format(closedReport.payments[method] ?? 0)} />)}
            {closedReport.movements.map((item) => <ReceiptRow key={item.id} label={`${item.type === 'ingreso' ? 'Ingreso' : 'Salida'}: ${item.concept}`} value={`${item.type === 'ingreso' ? '+' : '-'}${money.format(item.amount)}`} />)}
            <div className="my-3 border-y border-dashed border-slate-400 py-3"><ReceiptRow label="Efectivo esperado" value={money.format(closedReport.session.expectedAmount ?? 0)} strong /><ReceiptRow label="Efectivo contado" value={money.format(closedReport.session.closingAmount ?? 0)} strong /><ReceiptRow label={(closedReport.session.difference ?? 0) < 0 ? 'Faltante' : 'Sobrante'} value={money.format(Math.abs(closedReport.session.difference ?? 0))} strong /><ReceiptRow label="Fondo siguiente turno" value={money.format(closedReport.session.nextShiftFund ?? 0)} strong /><ReceiptRow label="Efectivo retirado" value={money.format(closedReport.session.withdrawnAmount ?? 0)} strong /></div>
            {closedReport.session.notes && <p className="text-xs"><b>Observación:</b> {closedReport.session.notes}</p>}
            <div className="mt-10 grid grid-cols-2 gap-6 text-center text-[10px]"><div className="border-t border-black pt-1">Firma cajero</div><div className="border-t border-black pt-1">Firma administrador</div></div>
            <div className="receipt-actions mt-6 grid gap-2"><button onClick={() => window.print()} className="rounded-xl bg-blue-600 py-3 font-bold text-white">Imprimir ticket / Guardar PDF</button><button onClick={() => setClosedReport(null)} className="rounded-xl bg-slate-100 py-3 font-bold text-slate-700">Cerrar reporte</button></div>
          </div>
        </div>
      </>}
    </div>
  );
}

function ReceiptRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-3 text-xs ${strong ? 'font-bold' : ''}`}><span>{label}</span><span className="text-right">{value}</span></div>;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500">{icon}{label}</div><strong className="text-2xl text-slate-900 dark:text-white">{value}</strong></div>;
}
