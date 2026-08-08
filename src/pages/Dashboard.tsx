import { useEffect, useState, type ReactNode } from 'react';
import { Banknote, ChefHat, CircleDollarSign, Clock3, Package, ShoppingBag } from 'lucide-react';
import { getCashSession, getOrders, getProducts, orderTotal, subscribeRestaurantData } from '../services/restaurant-store';
import type { RestaurantOrder } from '../types/restaurant';

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

export default function Dashboard() {
  const [orders, setOrders] = useState<RestaurantOrder[]>(getOrders);
  const [cashOpen, setCashOpen] = useState(getCashSession()?.status === 'abierta');
  const products = getProducts();
  useEffect(() => subscribeRestaurantData(() => { setOrders(getOrders()); setCashOpen(getCashSession()?.status === 'abierta'); }), []);

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

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 p-4 dark:bg-slate-950 lg:p-6">
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><p className="text-sm font-bold text-blue-600">OPERACIÓN DE HOY</p><h1 className="text-3xl font-black text-slate-900 dark:text-white">Chicken Huerta</h1><p className="text-sm text-slate-500">Resumen de ventas, pedidos y cocina</p></div><span className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${cashOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>Caja {cashOpen ? 'abierta' : 'cerrada'}</span></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={<CircleDollarSign />} label="Ventas de hoy" value={money.format(sales)} color="blue" />
        <Metric icon={<ShoppingBag />} label="Pedidos cobrados" value={String(paid.length)} color="emerald" />
        <Metric icon={<Banknote />} label="Ticket promedio" value={money.format(average)} color="violet" />
        <Metric icon={<ChefHat />} label="En cocina" value={String(active.length)} color="orange" />
        <Metric icon={<Package />} label="Stock crítico" value={String(lowStock)} color="red" />
      </div>

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
