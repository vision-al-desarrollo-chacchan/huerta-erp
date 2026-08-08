import type { CashSession, OrderStatus, RestaurantOrder, RestaurantProduct } from '../types/restaurant';

const PRODUCTS_KEY = 'huerta_restaurant_products_v1';
const ORDERS_KEY = 'huerta_restaurant_orders_v1';
const CASH_KEY = 'huerta_restaurant_cash_v1';
const EVENT_NAME = 'huerta:restaurant-data';

const seedProducts: RestaurantProduct[] = [
  { id: 'pollo-entero', name: 'Pollo a la brasa entero', category: 'Pollos', price: 68, stock: 30, active: true },
  { id: 'medio-pollo', name: '1/2 pollo a la brasa', category: 'Pollos', price: 38, stock: 30, active: true },
  { id: 'cuarto-pollo', name: '1/4 pollo a la brasa', category: 'Pollos', price: 20, stock: 50, active: true },
  { id: 'parrilla-personal', name: 'Parrilla personal', category: 'Parrillas', price: 32, stock: 25, active: true },
  { id: 'mostrito', name: 'Mostrito', category: 'Combos', price: 22, stock: 40, active: true },
  { id: 'chaufa', name: 'Arroz chaufa', category: 'Platos', price: 18, stock: 35, active: true },
  { id: 'gaseosa-litro', name: 'Gaseosa 1 litro', category: 'Bebidas', price: 10, stock: 24, active: true },
  { id: 'chicha-jarra', name: 'Jarra de chicha morada', category: 'Bebidas', price: 12, stock: 20, active: true },
];

function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function subscribeRestaurantData(listener: () => void) {
  window.addEventListener(EVENT_NAME, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(EVENT_NAME, listener);
    window.removeEventListener('storage', listener);
  };
}

export function getProducts() {
  const products = read<RestaurantProduct[]>(PRODUCTS_KEY, []);
  if (products.length) return products;
  write(PRODUCTS_KEY, seedProducts);
  return seedProducts;
}

export function saveProducts(products: RestaurantProduct[]) {
  write(PRODUCTS_KEY, products);
}

export function getOrders() {
  return read<RestaurantOrder[]>(ORDERS_KEY, []);
}

export function createOrder(order: Omit<RestaurantOrder, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'status'>) {
  const orders = getOrders();
  const now = new Date().toISOString();
  const next: RestaurantOrder = {
    ...order,
    id: crypto.randomUUID(),
    number: orders.reduce((max, item) => Math.max(max, item.number), 0) + 1,
    status: 'nuevo',
    createdAt: now,
    updatedAt: now,
  };
  write(ORDERS_KEY, [next, ...orders]);
  return next;
}

export function updateOrderStatus(id: string, status: OrderStatus, paymentMethod?: string) {
  const orders = getOrders().map((order) =>
    order.id === id
      ? { ...order, status, paymentMethod: paymentMethod ?? order.paymentMethod, updatedAt: new Date().toISOString() }
      : order,
  );
  write(ORDERS_KEY, orders);
}

export function getCashSession() {
  return read<CashSession | null>(CASH_KEY, null);
}

export function openCash(openingAmount: number) {
  const session: CashSession = {
    id: crypto.randomUUID(),
    openingAmount,
    openedAt: new Date().toISOString(),
    status: 'abierta',
  };
  write(CASH_KEY, session);
  return session;
}

export function closeCash(closingAmount: number) {
  const current = getCashSession();
  if (!current) return null;
  const session: CashSession = {
    ...current,
    closingAmount,
    closedAt: new Date().toISOString(),
    status: 'cerrada',
  };
  write(CASH_KEY, session);
  return session;
}

export function orderTotal(order: RestaurantOrder) {
  return order.items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
}
