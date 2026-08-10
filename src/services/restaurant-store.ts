import { supabase } from '../lib/supabase';
import { getActiveOperator } from './operator-session';
import type { CashMovement, CashSession, OrderItem, OrderStatus, RestaurantOrder, RestaurantProduct, ServiceType } from '../types/restaurant';

type BusinessContext = { empresaId: string; sucursalId: string };
let cachedContext: BusinessContext | null = null;
let cachedCash: CashSession | null | undefined;

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

export async function getCurrentStaffName() {
  const operator = getActiveOperator();
  if (operator) return operator.name;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return 'Usuario';
  return user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario';
}

export async function getProducts(): Promise<RestaurantProduct[]> {
  const { empresaId } = await context();
  const { data, error } = await supabase.from('rest_productos').select('id,nombre,categoria,precio,stock,activo').eq('empresa_id', empresaId).eq('activo', true).order('categoria').order('nombre');
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.nombre, category: row.categoria, price: Number(row.precio), stock: Number(row.stock), active: row.activo }));
}

export async function createProduct(input: { name: string; category: string; price: number }) {
  const name = input.name.trim();
  const category = input.category.trim();
  if (!name || !category) throw new Error('Completa el nombre y la categoría del plato.');
  if (!Number.isFinite(input.price) || input.price <= 0) throw new Error('Ingresa un precio mayor a cero.');

  const { empresaId } = await context();
  const { data: duplicate, error: duplicateError } = await supabase
    .from('rest_productos')
    .select('id')
    .eq('empresa_id', empresaId)
    .ilike('nombre', name)
    .ilike('categoria', category)
    .limit(1)
    .maybeSingle();
  if (duplicateError) throw duplicateError;
  if (duplicate) throw new Error('Ya existe un plato con ese nombre.');

  const { data, error } = await supabase
    .from('rest_productos')
    .insert({ empresa_id: empresaId, nombre: name, categoria: category, precio: input.price, stock: 0, activo: true })
    .select('id,nombre,categoria,precio,stock,activo')
    .single();
  if (error) throw error;
  const product = { id: data.id, name: data.nombre, category: data.categoria, price: Number(data.precio), stock: Number(data.stock), active: data.activo } satisfies RestaurantProduct;
  return product;
}

type OrderRow = {
  id: string; caja_id: string | null; numero: number; tipo_servicio: ServiceType; mesa: string | null; cliente: string | null;
  estado: OrderStatus; metodo_pago: string | null; created_at: string; updated_at: string;
  rest_pedido_items: { producto_id: string | null; nombre: string; cantidad: number; precio_unitario: number; notas: string | null }[];
};

function mapOrder(row: OrderRow): RestaurantOrder {
  return {
    id: row.id, cashSessionId: row.caja_id ?? undefined, number: Number(row.numero), serviceType: row.tipo_servicio, table: row.mesa ?? undefined,
    customer: row.cliente ?? undefined, status: row.estado, paymentMethod: row.metodo_pago ?? undefined,
    createdAt: row.created_at, updatedAt: row.updated_at,
    items: (row.rest_pedido_items ?? []).map((item) => ({ productId: item.producto_id ?? '', name: item.nombre, quantity: Number(item.cantidad), unitPrice: Number(item.precio_unitario), notes: item.notas ?? undefined })),
  };
}

export async function getOrders(): Promise<RestaurantOrder[]> {
  const { empresaId, sucursalId } = await context();
  const { data, error } = await supabase.from('rest_pedidos').select('id,caja_id,numero,tipo_servicio,mesa,cliente,estado,metodo_pago,created_at,updated_at,rest_pedido_items(producto_id,nombre,cantidad,precio_unitario,notas)').eq('empresa_id', empresaId).eq('sucursal_id', sucursalId).order('created_at', { ascending: false }).limit(250);
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
    cashSessionId: cash.id,
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
  const { data, error } = await supabase.from('rest_cajas').select('id,monto_apertura,monto_cierre,monto_esperado,diferencia,observaciones,fondo_siguiente,efectivo_retirado,estado,abierta_at,cerrada_at,abierta_por_nombre,cerrada_por_nombre').eq('empresa_id', empresaId).eq('sucursal_id', sucursalId).eq('estado', 'abierta').maybeSingle();
  if (error) throw error;
  cachedCash = data ? { id: data.id, openingAmount: Number(data.monto_apertura), closingAmount: data.monto_cierre == null ? undefined : Number(data.monto_cierre), expectedAmount: data.monto_esperado == null ? undefined : Number(data.monto_esperado), difference: data.diferencia == null ? undefined : Number(data.diferencia), notes: data.observaciones ?? undefined, nextShiftFund: Number(data.fondo_siguiente ?? 0), withdrawnAmount: data.efectivo_retirado == null ? undefined : Number(data.efectivo_retirado), status: data.estado, openedAt: data.abierta_at, closedAt: data.cerrada_at ?? undefined, openedByName: data.abierta_por_nombre ?? undefined, closedByName: data.cerrada_por_nombre ?? undefined } : null;
  return cachedCash ?? null;
}

export async function openCash(openingAmount: number) {
  const { empresaId, sucursalId } = await context();
  const { error } = await supabase.rpc('rest_abrir_caja', { p_empresa_id: empresaId, p_sucursal_id: sucursalId, p_monto_apertura: openingAmount });
  if (error) throw error;
  cachedCash = undefined;
  return getCashSession(true);
}

export async function closeCash(closingAmount: number, nextShiftFund: number, notes?: string) {
  const cash = await getCashSession();
  if (!cash) throw new Error('No existe una caja abierta.');
  const { data, error } = await supabase.rpc('rest_cerrar_caja_con_fondo', { p_caja_id: cash.id, p_monto_contado: closingAmount, p_fondo_siguiente: nextShiftFund, p_observaciones: notes ?? null });
  if (error) throw error;
  cachedCash = null;
  const row = Array.isArray(data) ? data[0] : data;
  return { id: row.id, openingAmount: Number(row.monto_apertura), closingAmount: Number(row.monto_cierre), expectedAmount: Number(row.monto_esperado), difference: Number(row.diferencia), notes: row.observaciones ?? undefined, nextShiftFund: Number(row.fondo_siguiente), withdrawnAmount: Number(row.efectivo_retirado), status: row.estado, openedAt: row.abierta_at, closedAt: row.cerrada_at, openedByName: row.abierta_por_nombre ?? undefined, closedByName: row.cerrada_por_nombre ?? undefined } as CashSession;
}

export async function getCashMovements(): Promise<CashMovement[]> {
  const cash = await getCashSession();
  if (!cash) return [];
  const { data, error } = await supabase.from('rest_movimientos_caja').select('id,tipo,concepto,monto,metodo_pago,registrado_por_nombre,created_at').eq('caja_id', cash.id).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, type: row.tipo, concept: row.concepto, amount: Number(row.monto), paymentMethod: row.metodo_pago, registeredByName: row.registrado_por_nombre, createdAt: row.created_at }));
}

export async function registerCashMovement(input: { type: 'ingreso' | 'egreso'; concept: string; amount: number; paymentMethod?: string }) {
  const cash = await getCashSession();
  if (!cash) throw new Error('Primero debes abrir la caja.');
  const { error } = await supabase.rpc('rest_registrar_movimiento_caja', { p_caja_id: cash.id, p_tipo: input.type, p_concepto: input.concept, p_monto: input.amount, p_metodo_pago: input.paymentMethod ?? 'Efectivo' });
  if (error) throw error;
}

export type RealtimeStatus = 'connected' | 'disconnected' | 'error';

export async function subscribeProducts(listener: () => void, onStatus?: (status: RealtimeStatus) => void) {
  const { empresaId } = await context();
  let refreshTimer: number | undefined;
  const refresh = () => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(listener, 120);
  };
  const channel = supabase.channel(`rest-productos-${empresaId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rest_productos' }, refresh)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') onStatus?.('connected');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onStatus?.('error');
      else if (status === 'CLOSED') onStatus?.('disconnected');
    });
  return () => {
    window.clearTimeout(refreshTimer);
    void supabase.removeChannel(channel);
  };
}

export async function subscribeRestaurantData(listener: () => void, onStatus?: (status: RealtimeStatus) => void) {
  const { empresaId, sucursalId } = await context();
  let refreshTimer: number | undefined;
  const refresh = () => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(listener, 120);
  };
  const channel = supabase.channel(`rest-operacion-${empresaId}-${sucursalId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rest_pedidos', filter: `empresa_id=eq.${empresaId}` }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rest_pedido_items' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rest_cajas', filter: `empresa_id=eq.${empresaId}` }, () => { cachedCash = undefined; refresh(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rest_movimientos_caja', filter: `empresa_id=eq.${empresaId}` }, refresh)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') onStatus?.('connected');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onStatus?.('error');
      else if (status === 'CLOSED') onStatus?.('disconnected');
    });
  return () => { void supabase.removeChannel(channel); };
}

export function orderTotal(order: RestaurantOrder) {
  return order.items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
}
