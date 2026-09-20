import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, Banknote, CalendarDays, ChefHat, CircleDollarSign, Clock3, Package, ShoppingBag, Store } from 'lucide-react';
import { getCashSession, getCashSessionSales, getOrders, getProducts, orderTotal, subscribeRestaurantData, type CashSessionSale } from '../services/restaurant-store';
import type { RestaurantOrder, RestaurantProduct } from '../types/restaurant';

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

export default function Dashboard() {
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [cashOpen, setCashOpen] = useState(false);
  const [products, setProducts] = useState<RestaurantProduct[]>([]);
  const [cashSessionSales, setCashSessionSales] = useState<CashSessionSale[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const load = async () => {
      try {
        const since = new Date();
        since.setHours(0, 0, 0, 0);
        since.setDate(since.getDate() - 6);
        const [currentOrders, cash, currentProducts, currentCashSessionSales] = await Promise.all([getOrders(), getCashSession(), getProducts(), getCashSessionSales(since.toISOString())]);
        setOrders(currentOrders); setCashOpen(cash?.status === 'abierta'); setProducts(currentProducts); setCashSessionSales(currentCashSessionSales);
      }
      catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo cargar el dashboard.'); }
    };
    void load();
    void subscribeRestaurantData(load).then((cleanup) => { unsubscribe = cleanup; }).catch((reason: Error) => setError(reason.message));
    return () => unsubscribe?.();
  }, []);

  const today = new Date().toDateString();
  const todayOrders = orders.filter((order) => new Date(order.createdAt).toDateString() === today && order.status !== 'anulado');
  const paid = todayOrders.filter((order) => order.status === 'pagado');
  const sales = paid.reduce((sum, order) => sum + orderTotal(order), 0);
  const average = paid.length ? sales / paid.length : 0;
  const active = todayOrders.filter((order) => ['nuevo', 'preparando', 'listo'].includes(order.status));
  const lowStock = products.filter((product) => product.stock <= 5).length;

  const totals = new Map<string, number>();
  paid.flatMap((order) => order.items).forEach((item) => totals.set(item.name, (totals.get(item.name) ?? 0) + item.quantity));
  const ranking = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const salesByDay = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return {
        key: date.toLocaleDateString('en-CA'),
        label: new Intl.DateTimeFormat('es-PE', { weekday: 'short' }).format(date).replace('.', ''),
        shortDate: new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit' }).format(date),
        total: 0,
        hasOpenCash: false,
      };
    });

    const indexByDate = new Map(days.map((day, index) => [day.key, index]));
    cashSessionSales.forEach((cashSale) => {
      const key = new Date(cashSale.openedAt).toLocaleDateString('en-CA');
      const index = indexByDate.get(key);
      if (index !== undefined) {
        days[index].total += cashSale.total;
        days[index].hasOpenCash ||= cashSale.isOpen;
      }
    });
    return days;
  }, [cashSessionSales]);
  const weeklySales = salesByDay.reduce((sum, day) => sum + day.total, 0);
  const highestDailySale = Math.max(...salesByDay.map((day) => day.total), 1);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 lg:p-6">
      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div><p className="text-lg font-bold text-slate-700 dark:text-slate-200">¡Hola! 👋</p><h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">Chicken Huerta</h1><p className="text-sm font-medium text-slate-500">Resumen de ventas, pedidos y cocina en tiempo real</p></div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900"><CalendarDays className="h-5 w-5 text-blue-600"/><div><p className="text-xs font-bold text-slate-400">HOY</p><p className="text-sm font-bold text-slate-700 dark:text-slate-100">{new Intl.DateTimeFormat('es-PE',{weekday:'long',day:'2-digit',month:'long'}).format(new Date())}</p></div></div>
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm ${cashOpen ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-red-300 bg-red-50 text-red-700'}`}><Store className="h-5 w-5"/><div><p className="text-xs font-black uppercase">Caja {cashOpen ? 'abierta' : 'cerrada'}</p><p className="text-xs opacity-75">Estado de operación</p></div></div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={<CircleDollarSign />} label="Ventas de hoy" value={money.format(sales)} color="blue" note="Total cobrado hoy" />
        <Metric icon={<ShoppingBag />} label="Pedidos cobrados" value={String(paid.length)} color="emerald" note="Pedidos completados" />
        <Metric icon={<Banknote />} label="Ticket promedio" value={money.format(average)} color="violet" note="Promedio por pedido" />
        <Metric icon={<ChefHat />} label="En cocina" value={String(active.length)} color="orange" note={active.length ? "Pedidos activos" : "Sin pedidos"} />
        <Metric icon={<Package />} label="Stock crítico" value={String(lowStock)} color="red" note={lowStock ? "Requiere atención" : "Stock saludable"} />
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">Ventas de los últimos 7 días</h2>
            <p className="text-sm text-slate-500">Cada turno pertenece al día en que se abrió la caja</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total semanal</p>
            <strong className="text-2xl text-blue-600">{money.format(weeklySales)}</strong>
          </div>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="relative grid h-72 min-w-[620px] grid-cols-7 items-end gap-3 rounded-2xl bg-slate-50/80 px-4 pb-3 pt-5 dark:bg-slate-950/50 sm:gap-5" aria-label="Gráfico de ventas de los últimos 7 días">
            <div className="pointer-events-none absolute inset-x-4 top-[25%] border-t border-dashed border-slate-200 dark:border-slate-700" />
            <div className="pointer-events-none absolute inset-x-4 top-1/2 border-t border-dashed border-slate-200 dark:border-slate-700" />
            <div className="pointer-events-none absolute inset-x-4 top-[75%] border-t border-dashed border-slate-200 dark:border-slate-700" />
            {salesByDay.map((day) => {
              const height = day.total > 0 ? Math.max((day.total / highestDailySale) * 100, 7) : 1;
              return (
                <div key={day.key} className="relative z-10 flex h-full min-w-0 flex-col justify-end text-center">
                  <div className="mb-2 min-h-9">
                    <span className="block truncate text-[11px] font-black text-slate-700 dark:text-slate-100" title={money.format(day.total)}>{day.total > 0 ? money.format(day.total) : 'S/ 0'}</span>
                    {day.hasOpenCash && <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />En curso</span>}
                  </div>
                  <div className="flex h-44 items-end justify-center">
                    <div className={`w-3/5 min-w-7 max-w-14 rounded-t-xl shadow-sm transition-all duration-500 ${day.hasOpenCash ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-gradient-to-t from-blue-700 to-sky-400'}`} style={{ height: `${height}%` }} title={`${day.label} ${day.shortDate}: ${money.format(day.total)}`} />
                  </div>
                  <span className="mt-2 text-xs font-black capitalize text-slate-700 dark:text-slate-200">{day.label}</span>
                  <span className="text-[10px] font-medium text-slate-400">{day.shortDate}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-slate-900 dark:text-white">Pedidos recientes</h2><span className="text-xs text-slate-400">Actualización automática</span></div><div className="space-y-2">{todayOrders.slice(0, 8).map((order) => <div key={order.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"><div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-sm font-black dark:bg-slate-800 dark:text-white">#{order.number}</div><div><p className="text-sm font-semibold text-slate-800 dark:text-white">{order.table ?? order.serviceType}</p><p className="flex items-center gap-1 text-xs capitalize text-slate-400"><Clock3 className="h-3 w-3" />{order.status}</p></div><strong className="dark:text-white">{money.format(orderTotal(order))}</strong></div>)}{!todayOrders.length && <p className="py-14 text-center text-sm text-slate-400">Todavía no hay pedidos registrados hoy.</p>}</div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><h2 className="mb-4 font-bold text-slate-900 dark:text-white">Productos más vendidos</h2><div className="space-y-3">{ranking.map(([name, quantity], index) => <div key={name} className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-xs font-black text-blue-600 dark:bg-blue-950">{index + 1}</span><span className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{name}</span><strong className="text-sm dark:text-white">{quantity} und.</strong></div>)}{!ranking.length && <p className="py-14 text-center text-sm text-slate-400">El ranking aparecerá al cobrar ventas.</p>}</div></section>
        <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm dark:border-red-950 dark:bg-slate-900"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><AlertTriangle className="h-5 w-5 text-red-500"/>Stock crítico</h2><span className="rounded-full bg-red-50 px-2 py-1 text-xs font-black text-red-600">{lowStock}</span></div><div className="space-y-2">{products.filter((product)=>product.stock<=5).slice(0,5).map((product)=><div key={product.id} className="flex items-center justify-between rounded-xl bg-red-50/70 px-3 py-3 dark:bg-red-950/20"><span className="truncate pr-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{product.name}</span><strong className="whitespace-nowrap text-xs text-red-600">{product.stock} und.</strong></div>)}{!lowStock && <p className="py-14 text-center text-sm text-slate-400">No hay productos con stock crítico.</p>}</div></section>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, color, note }: { icon: ReactNode; label: string; value: string; color: string; note?: string }) {
  const colors: Record<string, string> = { blue: 'bg-blue-100 text-blue-600', emerald: 'bg-emerald-100 text-emerald-600', violet: 'bg-violet-100 text-violet-600', orange: 'bg-orange-100 text-orange-600', red: 'bg-red-100 text-red-600' };
  return <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"><div className="flex items-start justify-between"><div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${colors[color]}`}>{icon}</div><span className="text-lg text-slate-300">⋮</span></div><p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><strong className="mt-1 block text-2xl text-slate-950 dark:text-white">{value}</strong>{note && <p className="mt-3 text-xs font-semibold text-slate-500">{note}</p>}</div>;
}
