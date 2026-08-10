import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Minus, Plus, Search, ShoppingBag, Trash2, Users, X } from 'lucide-react';
import { createOrder, createProduct, getCashSession, getOrders, getProducts, subscribeProducts, subscribeRestaurantData } from '../services/restaurant-store';
import type { OrderItem, RestaurantOrder, RestaurantProduct, ServiceType } from '../types/restaurant';
import { enqueueOrderPrint } from '../services/print-queue';
import { useNotification } from '../context/notification-context';
import { userErrorMessage } from '../lib/errors';

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

export default function Ventas() {
  const [products, setProducts] = useState<RestaurantProduct[]>([]);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [serviceType, setServiceType] = useState<ServiceType>('salon');
  const [table, setTable] = useState('Mesa 1');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', category: '', price: '' });
  const [savingProduct, setSavingProduct] = useState(false);
  const [showMobileOrder, setShowMobileOrder] = useState(false);
  const { notify } = useNotification();

  useEffect(() => {
    let active = true;
    let unsubscribeProducts: (() => void) | undefined;
    let unsubscribeOrders: (() => void) | undefined;
    const loadProducts = () => getProducts()
      .then((rows) => { if (active) setProducts(rows); })
      .catch((reason: unknown) => { if (active) notify(userErrorMessage(reason, 'No se pudieron actualizar los productos.'), 'error'); });
    const loadOrders = () => getOrders()
      .then((rows) => { if (active) setOrders(rows); })
      .catch((reason: unknown) => { if (active) notify(userErrorMessage(reason, 'No se pudieron actualizar las mesas.'), 'error'); });
    Promise.all([getProducts(), getOrders()])
      .then(([productRows, orderRows]) => { if (active) { setProducts(productRows); setOrders(orderRows); } })
      .catch((reason: unknown) => { if (active) { const message = userErrorMessage(reason, 'No se pudo cargar el POS.'); setNotice(message); notify(message, 'error'); } })
      .finally(() => { if (active) setLoading(false); });
    void subscribeProducts(loadProducts)
      .then((cleanup) => { unsubscribeProducts = cleanup; })
      .catch((reason: unknown) => { if (active) notify(userErrorMessage(reason, 'No se pudo activar la actualización del catálogo.'), 'error'); });
    void subscribeRestaurantData(loadOrders)
      .then((cleanup) => { unsubscribeOrders = cleanup; })
      .catch((reason: unknown) => { if (active) notify(userErrorMessage(reason, 'No se pudo activar la actualización de mesas.'), 'error'); });
    return () => { active = false; unsubscribeProducts?.(); unsubscribeOrders?.(); };
  }, [notify]);

  const categories = useMemo(() => ['Todas', ...Array.from(new Set(products.map((item) => item.category)))], [products]);
  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('es-PE');
    return products.filter((product) => {
      const matchesCategory = category === 'Todas' || product.category === category;
      const matchesSearch = !normalizedSearch || product.name.toLocaleLowerCase('es-PE').includes(normalizedSearch);
      return product.active && matchesCategory && matchesSearch;
    });
  }, [products, category, search]);
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [cart]);
  const occupiedTables = useMemo(() => new Set(orders
    .filter((order) => order.serviceType === 'salon' && !['pagado', 'anulado'].includes(order.status) && order.table)
    .map((order) => order.table as string)), [orders]);
  const tables = Array.from({ length: 12 }, (_, index) => `Mesa ${index + 1}`);

  function addProduct(productId: string) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setCart((current) => {
      const found = current.find((item) => item.productId === productId);
      if (found) return current.map((item) => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { productId, name: product.name, quantity: 1, unitPrice: product.price }];
    });
    setNotice(`${product.name} agregado al pedido.`);
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((current) => current
      .map((item) => item.productId === productId ? { ...item, quantity: item.quantity + delta } : item)
      .filter((item) => item.quantity > 0));
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingProduct) return;
    setSavingProduct(true);
    try {
      const product = await createProduct({ name: newProduct.name, category: newProduct.category, price: Number(newProduct.price) });
      setProducts((current) => [...current, product]);
      setNewProduct({ name: '', category: '', price: '' });
      setShowProductForm(false);
      notify(`${product.name} fue agregado al menú.`, 'success');
    } catch (reason) {
      notify(userErrorMessage(reason, 'No se pudo agregar el plato.'), 'error');
    } finally {
      setSavingProduct(false);
    }
  }

  async function sendOrder() {
    if (sending) return;
    setSending(true);
    setNotice('');
    const cash = await getCashSession().catch(() => null);
    if (!cash || cash.status !== 'abierta') {
      setNotice('Primero debes abrir la caja para registrar pedidos.');
      setSending(false);
      return;
    }
    if (!cart.length) {
      setNotice('Agrega al menos un producto.');
      setSending(false);
      return;
    }
    try {
      const order = await createOrder({ serviceType, table: serviceType === 'salon' ? table : undefined, items: cart });
      void enqueueOrderPrint(order, 'cocina').catch(() => {
        // La venta queda guardada; la alerta y el reintento se muestran en el centro de impresión.
      });
      setCart([]);
      setNotice(`Pedido #${String(order.number).padStart(3, '0')} enviado correctamente a cocina.`);
      notify(`Pedido #${String(order.number).padStart(3, '0')} enviado a cocina.`, 'success');
    } catch (reason) {
      const message = userErrorMessage(reason, 'No se pudo registrar el pedido.');
      setNotice(message);
      notify(message, 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] min-w-0 flex-col overflow-x-hidden bg-slate-100 pb-24 dark:bg-slate-950 lg:flex-row lg:pb-0">
      <section className="min-w-0 flex-1 p-4 lg:p-6">
        <div className="mb-3 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar plato o bebida..." className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
          </div>
          <button onClick={() => setShowProductForm(true)} className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 sm:w-auto"><Plus className="h-5 w-5" />Agregar plato</button>
        </div>
        <div className="mb-4 flex min-w-0 gap-2 overflow-x-auto pb-2">
          {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold ${category === item ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{item}</button>)}
        </div>
        {showProductForm && <form onSubmit={saveProduct} className="mb-4 grid min-w-0 gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-900 dark:bg-slate-900 sm:grid-cols-2">
          <input required value={newProduct.name} onChange={(event) => setNewProduct((current) => ({ ...current, name: event.target.value }))} placeholder="Nombre del plato" className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-950 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          <input required value={newProduct.category} onChange={(event) => setNewProduct((current) => ({ ...current, category: event.target.value }))} list="menu-categories" placeholder="Categoría" className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-950 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          <datalist id="menu-categories">{categories.filter((item) => item !== 'Todas').map((item) => <option key={item} value={item} />)}</datalist>
          <input required min="0.01" step="0.01" type="number" value={newProduct.price} onChange={(event) => setNewProduct((current) => ({ ...current, price: event.target.value }))} placeholder="Precio S/" className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-950 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          <div className="flex min-w-0 gap-2"><button disabled={savingProduct} className="min-w-0 flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{savingProduct ? 'Guardando…' : 'Guardar plato'}</button><button type="button" onClick={() => setShowProductForm(false)} className="shrink-0 rounded-xl border border-slate-200 p-3 text-slate-500 dark:border-slate-700"><X className="h-5 w-5" /></button></div>
        </form>}
        {loading && <p className="py-10 text-center text-sm text-slate-400">Cargando productos...</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <button key={product.id} onClick={() => addProduct(product.id)} className="min-h-36 touch-manipulation rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-500 hover:shadow-lg active:scale-[0.98] active:border-blue-600 active:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:active:bg-slate-800">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-500 dark:bg-slate-800">{product.category}</span>
              <p className="mt-4 font-bold text-slate-900 dark:text-white">{product.name}</p>
              <div className="mt-3 flex items-end justify-between"><strong className="text-lg text-blue-600">{money.format(product.price)}</strong><span className="text-xs text-slate-400">Stock {product.stock}</span></div>
            </button>
          ))}
        </div>
      </section>

      {showMobileOrder && <button type="button" aria-label="Cerrar pedido" onClick={() => setShowMobileOrder(false)} className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" />}
      <aside className={`${showMobileOrder ? 'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] rounded-t-3xl shadow-2xl' : 'hidden'} w-full shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-16 lg:flex lg:h-[calc(100dvh-4rem)] lg:max-h-[calc(100dvh-4rem)] lg:w-[390px] lg:self-start lg:rounded-none lg:shadow-none`}>
        <div className="order-1 max-h-[42dvh] shrink-0 overflow-y-auto border-b border-slate-200 p-5 dark:border-slate-800 lg:max-h-[46%]">
          <div className="mb-4 flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-blue-600" /><h2 className="flex-1 font-bold text-slate-900 dark:text-white">Nuevo pedido</h2><button type="button" onClick={() => setShowMobileOrder(false)} className="rounded-lg p-2 text-slate-500 lg:hidden" aria-label="Cerrar"><X className="h-5 w-5" /></button></div>
          <div className="grid grid-cols-3 gap-2">{(['salon', 'delivery', 'recojo'] as ServiceType[]).map((type) => <button key={type} onClick={() => setServiceType(type)} className={`rounded-lg py-2 text-xs font-bold capitalize ${serviceType === type ? 'bg-slate-900 text-white dark:bg-blue-600' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{type}</button>)}</div>
          {serviceType === 'salon' && <div className="mt-4">
            <div className="mb-2 flex items-center justify-between"><strong className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">Selecciona una mesa</strong><span className="text-[10px] font-bold text-slate-400">Verde libre · Rojo ocupada</span></div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
              {tables.map((item) => {
                const occupied = occupiedTables.has(item);
                const selected = table === item;
                return <button key={item} type="button" onClick={() => setTable(item)} className={`relative rounded-xl border px-2 py-3 text-xs font-black transition ${selected ? 'border-blue-600 bg-blue-600 text-white shadow-md' : occupied ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                  <Users className="mx-auto mb-1 h-4 w-4" />{item.replace('Mesa ', 'Mesa ')}
                  {occupied && !selected && <span className="mt-1 block text-[9px] uppercase">Ocupada</span>}
                </button>;
              })}
            </div>
          </div>}
        </div>
        <div className="order-3 flex min-h-32 flex-1 flex-col overflow-hidden lg:order-2">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <strong className="text-sm text-slate-800 dark:text-white">Detalle del pedido</strong>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">{cart.reduce((sum, item) => sum + item.quantity, 0)} productos</span>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
            {!cart.length && <div className="py-8 text-center text-sm text-slate-400">Selecciona productos para comenzar.</div>}
            {cart.map((item) => (
              <div key={item.productId} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex justify-between gap-3"><p className="text-sm font-semibold text-slate-800 dark:text-white">{item.name}</p><strong className="text-sm dark:text-white">{money.format(item.unitPrice * item.quantity)}</strong></div>
                <div className="mt-3 flex items-center justify-between"><div className="flex items-center gap-2"><button onClick={() => changeQuantity(item.productId, -1)} className="rounded-md bg-slate-100 p-1 dark:bg-slate-800"><Minus className="h-4 w-4" /></button><span className="w-6 text-center text-sm font-bold dark:text-white">{item.quantity}</span><button onClick={() => changeQuantity(item.productId, 1)} className="rounded-md bg-slate-100 p-1 dark:bg-slate-800"><Plus className="h-4 w-4" /></button></div><button onClick={() => setCart((current) => current.filter((row) => row.productId !== item.productId))} className="text-red-500"><Trash2 className="h-4 w-4" /></button></div>
              </div>
            ))}
          </div>
        </div>
        <div className="order-2 shrink-0 border-t border-slate-200 bg-white p-5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900 lg:order-3 lg:sticky lg:bottom-0 lg:z-10">
          {notice && <p className={`mb-3 rounded-lg p-3 text-xs font-semibold ${notice.includes('correctamente') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{notice}</p>}
          <div className="mb-4 flex items-end justify-between"><span className="text-sm font-semibold text-slate-500">Total</span><strong className="text-3xl text-slate-900 dark:text-white">{money.format(total)}</strong></div>
          <button disabled={sending} onClick={sendOrder} className="flex w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"><CheckCircle className="h-5 w-5" />{sending ? 'Enviando…' : 'Enviar a cocina'}</button>
        </div>
      </aside>
      {!showMobileOrder && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-900 lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button type="button" onClick={() => setShowMobileOrder(true)} className="min-w-0 flex-1 rounded-xl bg-slate-100 px-4 py-3 text-left dark:bg-slate-800">
            <span className="block text-xs font-bold text-slate-500">Ver pedido · {cart.reduce((sum, item) => sum + item.quantity, 0)} productos</span>
            <strong className="text-xl text-slate-950 dark:text-white">{money.format(total)}</strong>
          </button>
          <button type="button" onClick={() => setShowMobileOrder(true)} className="rounded-xl bg-blue-600 px-5 py-4 font-black text-white">Continuar</button>
        </div>
      </div>}
    </div>
  );
}
