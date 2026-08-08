import { supabase } from '../lib/supabase';
import type { CashSession, OrderItem, OrderStatus, RestaurantOrder, RestaurantProduct, ServiceType } from '../types/restaurant';

type BusinessContext = { empresaId: string; sucursalId: string };
let cachedContext: BusinessContext | null = null;
let cachedCash: CashSession | null | undefined;
let cachedProducts: RestaurantProduct[] | null = null;

async function context(): Promise<BusinessContext> {
  if (cachedContext) return cachedContext;
  const { data, error } = await supabase.rpc('rest_crear_empresa_inicial', { nombre_empresa: 'Chicken Huerta' });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.empresa_id || !row?.sucursal_id) throw new Error('No se pudo cargar la empresa y sucursal.');
  cachedContext = { empresaId: row.empresa_id, sucursalId: row.sucursal_id };
  return cachedContext;
}

export async function getBusinessContext() {
  return context();
}

export async function getProducts(): Promise<RestaurantProduct[]> {
  if (cachedProducts) return cachedProducts;
  const { empresaId } = await context();
  const { data, error } = await supabase.from('rest_productos').select('id,nombre,categoria,precio,stock,activo').eq('empresa_id', empresaId).eq('activo', true).order('categoria').order('nombre');
  if (error) throw error;
  cachedProducts = (data ?? []).map((row) => ({ id: row.id, name: row.nombre, category: row.categoria, price: Number(row.precio), stock: Number(row.stock), active: row.activo }));
  return cachedProducts;
}

type OrderRow = {
  id: string; numero: number; tipo_servicio: ServiceType; mesa: string | null; cliente: string | null;
  estado: OrderStatus; metodo_pago: string | null; created_at: string; updated_at: string;
  rest_pedido_items: { producto_id: string | null; nombre: string; cantidad: number; precio_unitario: number; notas: string | null }[];
};

function mapOrder(row: OrderRow): RestaurantOrder {
  return {
    id: row.id, number: Number(row.numero), serviceType: row.tipo_servicio, table: row.mesa ?? undefined,
    customer: row.cliente ?? undefined, status: row.estado, paymentMethod: row.metodo_pago ?? undefined,
    createdAt: row.created_at, updatedAt: row.updated_at,
    items: (row.rest_pedido_items ?? []).map((item) => ({ productId: item.producto_id ?? '', name: item.nombre, quantity: Number(item.cantidad), unitPrice: Number(item.precio_unitario), notes: item.notas ?? undefined })),
  };
}

export async function getOrders(): Promise<RestaurantOrder[]> {
  const { empresaId, sucursalId } = await context();
  const { data, error } = await supabase.from('rest_pedidos').select('id,numero,tipo_servicio,mesa,cliente,estado,metodo_pago,created_at,updated_at,rest_pedido_items(producto_id,nombre,cantidad,precio_unitario,notas)').eq('empresa_id', empresaId).eq('sucursal_id', sucursalId).order('created_at', { ascending: false }).limit(250);
  if (error) throw error;
  return ((data ?? []) as OrderRow[]).map(mapOrder);
}

export async function createOrder(order: { serviceType: ServiceType; table?: string; customer?: string; items: OrderItem[] }) {
  const { empresaId, sucursalId } = await context();
  const cash = await getCashSession();
  if (!cash || cash.status !== 'abierta') throw new Error('Primero debes abrir la caja.');
  const { data, error } = await supabase.rpc('rest_crear_pedido', {
    p_empresa_id: empresaId, p_sucursal_id: sucursalId, p_caja_id: cash.id,
    p_tipo_servicio: order.serviceType, p_mesa: order.table ?? '', p_cliente: order.customer ?? '', p_items: order.items,
  });
  if (error) throw error;
  const created = Array.isArray(data) ? data[0] : data;
  return {
    id: created.id,
    number: Number(created.numero),
    serviceType: order.serviceType,
    table: order.table,
    customer: order.customer,
    status: created.estado as OrderStatus,
    items: order.items,
    createdAt: created.created_at,
    updatedAt: created.updated_at,
  } satisfies RestaurantOrder;
}

export async function updateOrderStatus(id: string, status: OrderStatus, paymentMethod?: string) {
  const patch: { estado: OrderStatus; updated_at: string; metodo_pago?: string } = { estado: status, updated_at: new Date().toISOString() };
  if (paymentMethod) patch.metodo_pago = paymentMethod;
  const { error } = await supabase.from('rest_pedidos').update(patch).eq('id', id);
  if (error) throw error;
}

export async function getCashSession(force = false): Promise<CashSession | null> {
  if (!force && cachedCash !== undefined) return cachedCash;
  const { empresaId, sucursalId } = await context();
  const { data, error } = await supabase.from('rest_cajas').select('id,monto_apertura,monto_cierre,estado,abierta_at,cerrada_at').eq('empresa_id', empresaId).eq('sucursal_id', sucursalId).eq('estado', 'abierta').maybeSingle();
  if (error) throw error;
  cachedCash = data ? { id: data.id, openingAmount: Number(data.monto_apertura), closingAmount: data.monto_cierre == null ? undefined : Number(data.monto_cierre), status: data.estado, openedAt: data.abierta_at, closedAt: data.cerrada_at ?? undefined } : null;
  return cachedCash;
}

export async function openCash(openingAmount: number) {
  const { empresaId, sucursalId } = await context();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Sesión requerida.');
  const { error } = await supabase.from('rest_cajas').insert({ empresa_id: empresaId, sucursal_id: sucursalId, abierta_por: userData.user.id, monto_apertura: openingAmount });
  if (error) throw error;
  cachedCash = undefined;
  return getCashSession(true);
}

export async function closeCash(closingAmount: number) {
  const cash = await getCashSession();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (!cash || userError || !userData.user) throw userError ?? new Error('No existe una caja abierta.');
  const { error } = await supabase.from('rest_cajas').update({ estado: 'cerrada', monto_cierre: closingAmount, cerrada_por: userData.user.id, cerrada_at: new Date().toISOString() }).eq('id', cash.id);
  if (error) throw error;
  cachedCash = null;
}

export async function subscribeRestaurantData(listener: () => void) {
  const { empresaId } = await context();
  const channel = supabase.channel(`rest-operacion-${empresaId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'rest_pedidos', filter: `empresa_id=eq.${empresaId}` }, listener).on('postgres_changes', { event: '*', schema: 'public', table: 'rest_cajas', filter: `empresa_id=eq.${empresaId}` }, () => { cachedCash = undefined; listener(); }).subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export function orderTotal(order: RestaurantOrder) {
  return order.items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
}
