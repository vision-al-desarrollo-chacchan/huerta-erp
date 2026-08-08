import { useMemo, useState } from 'react';
import { CheckCircle, Minus, Plus, Search, ShoppingBag, Trash2 } from 'lucide-react';
import { createOrder, getCashSession, getProducts } from '../services/restaurant-store';
import type { OrderItem, ServiceType } from '../types/restaurant';

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

export default function Ventas() {
  const [products] = useState(getProducts);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [serviceType, setServiceType] = useState<ServiceType>('salon');
  const [table, setTable] = useState('Mesa 1');
  const [notice, setNotice] = useState('');

  const categories = ['Todas', ...Array.from(new Set(products.map((item) => item.category)))];
  const filtered = products.filter((product) => {
    const matchesCategory = category === 'Todas' || product.category === category;
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    return product.active && matchesCategory && matchesSearch;
  });
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [cart]);

  function addProduct(productId: string) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setCart((current) => {
      const found = current.find((item) => item.productId === productId);
      if (found) return current.map((item) => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { productId, name: product.name, quantity: 1, unitPrice: product.price }];
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((current) => current
      .map((item) => item.productId === productId ? { ...item, quantity: item.quantity + delta } : item)
      .filter((item) => item.quantity > 0));
  }

  function sendOrder() {
    setNotice('');
    if (!getCashSession() || getCashSession()?.status !== 'abierta') {
      setNotice('Primero debes abrir la caja para registrar pedidos.');
      return;
    }
    if (!cart.length) {
      setNotice('Agrega al menos un producto.');
      return;
    }
    const order = createOrder({ serviceType, table: serviceType === 'salon' ? table : undefined, items: cart });
    setCart([]);
    setNotice(`Pedido #${String(order.number).padStart(3, '0')} enviado correctamente a cocina.`);
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-slate-100 dark:bg-slate-950 lg:flex-row">
      <section className="flex-1 p-4 lg:p-6">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar plato o bebida..." className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold ${category === item ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{item}</button>)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <button key={product.id} onClick={() => addProduct(product.id)} className="min-h-36 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-500 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-500 dark:bg-slate-800">{product.category}</span>
              <p className="mt-4 font-bold text-slate-900 dark:text-white">{product.name}</p>
              <div className="mt-3 flex items-end justify-between"><strong className="text-lg text-blue-600">{money.format(product.price)}</strong><span className="text-xs text-slate-400">Stock {product.stock}</span></div>
            </button>
          ))}
        </div>
      </section>

      <aside className="flex w-full flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:w-[390px]">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="mb-4 flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-blue-600" /><h2 className="font-bold text-slate-900 dark:text-white">Nuevo pedido</h2></div>
          <div className="grid grid-cols-3 gap-2">{(['salon', 'delivery', 'recojo'] as ServiceType[]).map((type) => <button key={type} onClick={() => setServiceType(type)} className={`rounded-lg py-2 text-xs font-bold capitalize ${serviceType === type ? 'bg-slate-900 text-white dark:bg-blue-600' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{type}</button>)}</div>
          {serviceType === 'salon' && <select value={table} onChange={(event) => setTable(event.target.value)} className="mt-3 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">{Array.from({ length: 12 }, (_, index) => <option key={index}>Mesa {index + 1}</option>)}</select>}
        </div>
        <div className="min-h-56 flex-1 space-y-2 overflow-y-auto p-4">
          {!cart.length && <div className="py-14 text-center text-sm text-slate-400">Selecciona productos para comenzar.</div>}
          {cart.map((item) => (
            <div key={item.productId} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex justify-between gap-3"><p className="text-sm font-semibold text-slate-800 dark:text-white">{item.name}</p><strong className="text-sm dark:text-white">{money.format(item.unitPrice * item.quantity)}</strong></div>
              <div className="mt-3 flex items-center justify-between"><div className="flex items-center gap-2"><button onClick={() => changeQuantity(item.productId, -1)} className="rounded-md bg-slate-100 p-1 dark:bg-slate-800"><Minus className="h-4 w-4" /></button><span className="w-6 text-center text-sm font-bold dark:text-white">{item.quantity}</span><button onClick={() => changeQuantity(item.productId, 1)} className="rounded-md bg-slate-100 p-1 dark:bg-slate-800"><Plus className="h-4 w-4" /></button></div><button onClick={() => setCart((current) => current.filter((row) => row.productId !== item.productId))} className="text-red-500"><Trash2 className="h-4 w-4" /></button></div>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-200 p-5 dark:border-slate-800">
          {notice && <p className={`mb-3 rounded-lg p-3 text-xs font-semibold ${notice.includes('correctamente') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{notice}</p>}
          <div className="mb-4 flex items-end justify-between"><span className="text-sm font-semibold text-slate-500">Total</span><strong className="text-3xl text-slate-900 dark:text-white">{money.format(total)}</strong></div>
          <button onClick={sendOrder} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"><CheckCircle className="h-5 w-5" />Enviar a cocina</button>
        </div>
      </aside>
    </div>
  );
}
