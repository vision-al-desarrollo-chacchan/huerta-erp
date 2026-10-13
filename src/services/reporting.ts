import { supabase } from '../lib/supabase';
import { getBusinessContext } from './restaurant-store';
export type PeriodSummary = { sales: number; count: number; otherIncome: number; expenses: number; methods: Record<string, number>; products: { key: string; name: string; quantity: number; amount: number }[] };
export type SaleSummary = { id: string; numero: number; tipo_servicio: string; metodo_pago: string | null; total: number; updated_at: string };
export type LedgerRow = { id: string; date: string; type: 'ingreso' | 'egreso'; category: string; description: string; amount: number; method: string; source: string };
export type DashboardSummary = { sales: number; paidCount: number; activeCount: number; cashOpen: boolean; lowStockCount: number; recent: { id: string; number: number; serviceType: string; table: string | null; status: string; total: number }[]; ranking: { name: string; quantity: number }[]; lowStock: { id: string; name: string; stock: number }[]; cashSessionSales: { openedAt: string; total: number; isOpen: boolean }[] };
export const emptyPeriod: PeriodSummary = { sales: 0, count: 0, otherIncome: 0, expenses: 0, methods: {}, products: [] };
export const emptyDashboard: DashboardSummary = { sales: 0, paidCount: 0, activeCount: 0, cashOpen: false, lowStockCount: 0, recent: [], ranking: [], lowStock: [], cashSessionSales: [] };
export function limaToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
export function shiftDate(date: string, days: number) { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0,10); }
async function report<T>(name: string, from: string, to: string, page?: number): Promise<T> {
 const { empresaId, sucursalId } = await getBusinessContext();
 const { data, error } = await supabase.rpc(name, { p_empresa_id: empresaId, p_sucursal_id: sucursalId, p_desde: from, p_hasta: to, ...(page !== undefined ? { p_pagina: page } : {}) });
 if (error) throw error;
 return data as T;
}
export const getPeriodSummary = (from: string, to: string) => report<PeriodSummary>('erp_resumen_periodo',from,to);
export const getSalePage = (from: string, to: string, page = 0) => report<SaleSummary[]>('erp_ventas_pagina',from,to,page);
export const getSalesCsv = (from: string, to: string) => report<string>('erp_ventas_exportar',from,to);
export const getLedgerPage = (from: string, to: string, page = 0) => report<LedgerRow[]>('erp_contabilidad_pagina',from,to,page);
export async function getDashboardSummary(): Promise<DashboardSummary> {
 const { empresaId, sucursalId } = await getBusinessContext();
 const { data, error } = await supabase.rpc('erp_dashboard_resumen',{p_empresa_id:empresaId,p_sucursal_id:sucursalId});
 if(error)throw error;return data as DashboardSummary;
}
