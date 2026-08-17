import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Banknote, ChefHat, CircleDollarSign, Clock3, Package, ShoppingBag } from 'lucide-react';
import { getCashSession, getOrders, getProducts, orderTotal, subscribeRestaurantData } from '../services/restaurant-store';
import type { RestaurantOrder, RestaurantProduct } from '../types/restaurant';

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

export default function Dashboard() {
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [cashOpen, setCashOpen] = useState(false);
  const [products, setProducts] = useState<RestaurantProduct[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const load = async () => {
      try { const [currentOrders, cash, currentProducts] = await Promise.all([getOrders(), getCashSession(), getProducts()]); setOrders(currentOrders); setCashOpen(cash?.status === 'abierta'); setProducts(currentProducts); }
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
      };
    });

    const indexByDate = new Map(days.map((day, index) => [day.key, index]));
    orders.filter((order) => order.status === 'pagado').forEach((order) => {
      const key = new Date(order.updatedAt).toLocaleDateString('en-CA');
      const index = indexByDate.get(key);
      if (index !== undefined) days[index].total += orderTotal(order);
    });
    return days;
  }, [orders]);
  const weeklySales = salesByDay.reduce((sum, day) => sum + day.total, 0);
  const highestDailySale = Math.max(...salesByDay.map((day) => day.total), 1);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 p-4 dark:bg-slate-950 lg:p-6">
      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><p className="text-sm font-bold text-blue-600">OPERACIÓN DE HOY</p><h1 className="text-3xl font-black text-slate-900 dark:text-white">Chicken Huerta</h1><p className="text-sm text-slate-500">Resumen de ventas, pedidos y cocina</p></div><span className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${cashOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>Caja {cashOpen ? 'abierta' : 'cerrada'}</span></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={<CircleDollarSign />} label="Ventas de hoy" value={money.format(sales)} color="blue" />
        <Metric icon={<ShoppingBag />} label="Pedidos cobrados" value={String(paid.length)} color="emerald" />
        <Metric icon={<Banknote />} label="Ticket promedio" value={money.format(average)} color="violet" />
        <Metric icon={<ChefHat />} label="En cocina" value={String(active.length)} color="orange" />
        <Metric icon={<Package />} label="Stock crítico" value={String(lowStock)} color="red" />
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">Ventas de los últimos 7 días</h2>
            <p className="text-sm text-slate-500">Solo incluye pedidos cobrados</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total semanal</p>
            <strong className="text-2xl text-blue-600">{money.format(weeklySales)}</strong>
          </div>
        </div>
        <div className="grid h-64 grid-cols-7 items-end gap-2 sm:gap-4" aria-label="Gráfico de ventas de los últimos 7 días">
          {salesByDay.map((day) => {
            const height = day.total > 0 ? Math.max((day.total / highestDailySale) * 100, 8) : 2;
            return (
              <div key={day.key} className="flex h-full min-w-0 flex-col justify-end text-center">
                <span className="mb-2 truncate text-[10px] font-black text-slate-700 dark:text-slate-200 sm:text-xs" title={money.format(day.total)}>
                  {day.total > 0 ? money.format(day.total) : 'S/ 0'}
                </span>
                <div className="flex h-44 items-end rounded-lg bg-slate-50 px-1 dark:bg-slate-800">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-blue-700 to-sky-400 transition-all duration-500"
                    style={{ height: `${height}%` }}
                    title={`${day.label} ${day.shortDate}: ${money.format(day.total)}`}
                  />
                </div>
                <span className="mt-2 text-xs font-bold capitalize text-slate-600 dark:text-slate-300">{day.label}</span>
                <span className="hidden text-[10px] text-slate-400 sm:block">{day.shortDate}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-slate-900 dark:text-white">Pedidos recientes</h2><span className="text-xs text-slate-400">Actualización automática</span></div><div className="space-y-2">{todayOrders.slice(0, 8).map((order) => <div key={order.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"><div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-sm font-black dark:bg-slate-800 dark:text-white">#{order.number}</div><div><p className="text-sm font-semibold text-slate-800 dark:text-white">{order.table ?? order.serviceType}</p><p className="flex items-center gap-1 text-xs capitalize text-slate-400"><Clock3 className="h-3 w-3" />{order.status}</p></div><strong className="dark:text-white">{money.format(orderTotal(order))}</strong></div>)}{!todayOrders.length && <p className="py-14 text-center text-sm text-slate-400">Todavía no hay pedidos registrados hoy.</p>}</div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><h2 className="mb-4 font-bold text-slate-900 dark:text-white">Productos más vendidos</h2><div className="space-y-3">{ranking.map(([name, quantity], index) => <div key={name} className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-xs font-black text-blue-600 dark:bg-blue-950">{index + 1}</span><span className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{name}</span><strong className="text-sm dark:text-white">{quantity} und.</strong></div>)}{!ranking.length && <p className="py-14 text-center text-sm text-slate-400">El ranking aparecerá al cobrar ventas.</p>}</div></section>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, color }: { icon: ReactNode; label: string; value: string; color: string }) {
  const colors: Record<string, string> = { blue: 'bg-blue-100 text-blue-600', emerald: 'bg-emerald-100 text-emerald-600', violet: 'bg-violet-100 text-violet-600', orange: 'bg-orange-100 text-orange-600', red: 'bg-red-100 text-red-600' };
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className={`mb-4 grid h-10 w-10 place-items-center rounded-xl ${colors[color]}`}>{icon}</div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><strong className="mt-1 block text-2xl text-slate-900 dark:text-white">{value}</strong></div>;
}
