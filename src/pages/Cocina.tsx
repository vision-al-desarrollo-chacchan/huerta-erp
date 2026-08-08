import { useEffect, useMemo, useState } from 'react';
import { ChefHat, Clock3 } from 'lucide-react';
import { getOrders, subscribeRestaurantData, updateOrderStatus } from '../services/restaurant-store';
import type { OrderStatus, RestaurantOrder } from '../types/restaurant';

const columns: { status: OrderStatus; title: string; action: string; next?: OrderStatus }[] = [
  { status: 'nuevo', title: 'Nuevos', action: 'Comenzar', next: 'preparando' },
  { status: 'preparando', title: 'En preparación', action: 'Marcar listo', next: 'listo' },
  { status: 'listo', title: 'Listos para entregar', action: 'Entregar', next: 'entregado' },
];

export default function Cocina() {
  const [orders, setOrders] = useState<RestaurantOrder[]>(getOrders);
  useEffect(() => subscribeRestaurantData(() => setOrders(getOrders())), []);
  const activeOrders = useMemo(() => orders.filter((order) => ['nuevo', 'preparando', 'listo'].includes(order.status)), [orders]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 p-4 dark:bg-slate-950 lg:p-6">
      <div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-orange-500 p-3 text-white"><ChefHat /></div><div><h1 className="text-2xl font-black text-slate-900 dark:text-white">Pantalla de cocina</h1><p className="text-sm text-slate-500">Pedidos actualizados en tiempo real en este dispositivo</p></div></div>
      <div className="grid gap-4 xl:grid-cols-3">
        {columns.map((column) => (
          <section key={column.status} className="rounded-2xl bg-slate-200/70 p-3 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between px-1"><h2 className="font-bold text-slate-700 dark:text-slate-200">{column.title}</h2><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold dark:bg-slate-800 dark:text-white">{activeOrders.filter((item) => item.status === column.status).length}</span></div>
            <div className="space-y-3">
              {activeOrders.filter((order) => order.status === column.status).map((order) => (
                <article key={order.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-start justify-between"><div><strong className="text-xl text-slate-900 dark:text-white">#{String(order.number).padStart(3, '0')}</strong><p className="text-sm font-semibold capitalize text-blue-600">{order.table ?? order.serviceType}</p></div><span className="flex items-center gap-1 text-xs text-slate-400"><Clock3 className="h-3.5 w-3.5" />{new Date(order.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span></div>
                  <ul className="my-4 space-y-2 border-y border-slate-100 py-3 dark:border-slate-700">{order.items.map((item) => <li key={item.productId} className="flex gap-2 text-sm text-slate-700 dark:text-slate-200"><b className="text-orange-500">{item.quantity}×</b>{item.name}</li>)}</ul>
                  {column.next && <button onClick={() => updateOrderStatus(order.id, column.next!)} className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-bold text-white hover:bg-blue-600 dark:bg-blue-600">{column.action}</button>}
                </article>
              ))}
              {!activeOrders.some((order) => order.status === column.status) && <p className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400 dark:border-slate-700">Sin pedidos</p>}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
