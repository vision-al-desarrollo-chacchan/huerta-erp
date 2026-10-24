import { renderPrintTest } from '../lib/print-test';
import { supabase } from '../lib/supabase';
import { getBusinessContext } from './restaurant-store';
import type { RestaurantOrder } from '../types/restaurant';

export type PrinterArea = 'cocina' | 'caja' | 'bar';
export type PrintStatus = 'pendiente' | 'imprimiendo' | 'impreso' | 'fallido' | 'incierto' | 'cancelado';
export type PrinterConfig = { id?: string; area: PrinterArea; printerName: string; widthMm: 58 | 80; copies: number; autoPrint: boolean; active: boolean };
export type LocalPrintJob = { id: string; key: string; area: PrinterArea; printerName: string; content: string; status: PrintStatus; attempts: number; error?: string; createdAt: string; printedAt?: string };
type ServerJob = { id: string; idempotency_key: string; area: PrinterArea; payload: { printerName: string; content: string; widthMm: number; copies: number }; estado: PrintStatus; intentos: number; ultimo_error?: string; created_at: string; impreso_at?: string; lease_token: string };
const BRIDGE_URL = 'ws://127.0.0.1:18181';
let cache: LocalPrintJob[] = [];
let scope = '';
let running: Promise<void> | undefined;
let generation = 0;
supabase.auth.onAuthStateChange(() => { generation++; scope = ''; cache = []; window.dispatchEvent(new Event('huerta-print-queue-updated')); });
export function getLocalPrintQueue() { return [...cache]; }
async function context() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Inicia sesión para imprimir.');
  const { empresaId, sucursalId } = await getBusinessContext();
  return { empresaId, sucursalId, key: `${user.id}:${empresaId}:${sucursalId}` };
}
export async function refreshPrintQueue() {
  const started = generation;
  const ctx = await context();
  const { data, error } = await supabase.from('print_jobs').select('*').eq('empresa_id', ctx.empresaId).eq('sucursal_id', ctx.sucursalId)
    .order('created_at', { ascending: false }).limit(300);
  if (error) throw error;
  if (started !== generation) return;
  scope = ctx.key;
  cache = ((data ?? []) as ServerJob[]).map(j => ({ id: j.id, key: j.idempotency_key, area: j.area, printerName: j.payload.printerName,
    content: j.payload.content, status: j.estado, attempts: j.intentos, error: j.ultimo_error, createdAt: j.created_at, printedAt: j.impreso_at }));
  window.dispatchEvent(new Event('huerta-print-queue-updated'));
}
export async function getPrinterConfigurations(): Promise<PrinterConfig[]> {
  const { empresaId, sucursalId } = await context();
  const { data, error } = await supabase.from('print_configuraciones').select('*').eq('empresa_id', empresaId).eq('sucursal_id', sucursalId).order('area');
  if (error) throw error;
  const byArea = new Map((data ?? []).map(row => [row.area, row]));
  return (['cocina', 'caja', 'bar'] as PrinterArea[]).map(area => {
    const row = byArea.get(area);
    return { id: row?.id, area, printerName: row?.nombre_impresora ?? '', widthMm: row?.ancho_mm === 58 ? 58 : 80,
      copies: Number(row?.copias ?? 1), autoPrint: row?.auto_imprimir ?? area === 'cocina', active: row?.activa ?? true };
  });
}
export async function savePrinterConfigurations(configs: PrinterConfig[]) {
  const { empresaId, sucursalId } = await context();
  if (configs.some(c => !['cocina', 'caja', 'bar'].includes(c.area) || ![58, 80].includes(c.widthMm) ||
    !Number.isInteger(c.copies) || c.copies < 1 || c.copies > 5 || c.printerName.length > 200)) throw new Error('Configuración de impresora inválida.');
  const rows = configs.map(c => ({ ...(c.id ? { id: c.id } : {}), empresa_id: empresaId, sucursal_id: sucursalId, area: c.area,
    nombre_impresora: c.printerName.trim(), ancho_mm: c.widthMm, copias: c.copies, auto_imprimir: c.autoPrint, activa: c.active, updated_at: new Date().toISOString() }));
  const { error } = await supabase.from('print_configuraciones').upsert(rows, { onConflict: 'empresa_id,sucursal_id,area' });
  if (error) throw error;
}
// The database transaction already created the jobs. The client only wakes the consumer.
export async function enqueueOrderPrint(_order: RestaurantOrder, _area: PrinterArea = 'cocina', _batchKey = 'v1') {
  void _order; void _area; void _batchKey;
  await refreshPrintQueue();
  if (navigator.onLine) await processPrintQueue();
}
class BridgeError extends Error {
  uncertain: boolean;
  constructor(message: string, uncertain: boolean) { super(message); this.uncertain = uncertain; }
}
async function sendToBridge(job: ServerJob) {
  await new Promise<void>((resolve, reject) => {
    const socket = new WebSocket(BRIDGE_URL);
    let sent = false, settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true; clearTimeout(timer); socket.close();
      if (error) reject(error); else resolve();
    };
    const timer = window.setTimeout(() => finish(new BridgeError('Sin confirmación de impresión; verifica el papel.', sent)), 5000);
    socket.onopen = () => {
      sent = true;
      socket.send(JSON.stringify({ type: 'print', jobId: job.id, printer: job.payload.printerName, content: job.payload.content,
        width: job.payload.widthMm, copies: job.payload.copies }));
    };
    socket.onmessage = e => {
      try {
        const response = JSON.parse(String(e.data)) as { ok?: boolean };
        if (response.ok === true) finish();
        else finish(new BridgeError('La ticketera no confirmó el resultado; verifica el papel.', true));
      } catch { finish(new BridgeError('Respuesta de impresión inválida; verifica el papel.', true)); }
    };
    socket.onerror = () => finish(new BridgeError(sent ? 'Se perdió la confirmación; verifica el papel.' : 'Conector de impresión desconectado.', sent));
    socket.onclose = () => finish(new BridgeError('Conector cerrado sin confirmación.', sent));
  });
}
export function processPrintQueue(jobId?: string): Promise<void> {
  if (running) return running;
  running = processJobs(jobId).finally(() => { running = undefined; });
  return running;
}
async function processJobs(jobId?: string) {
  const ctx = await context(), started = generation;
  // Separate oldest-first pending query: display limits must never discard/starve old work.
  let query = supabase.from('print_jobs').select('id').eq('empresa_id', ctx.empresaId).eq('sucursal_id', ctx.sucursalId)
    .in('estado', ['pendiente', 'fallido', 'imprimiendo']).order('created_at').limit(100);
  if (jobId) query = query.eq('id', jobId);
  const { data, error } = await query;
  if (error) throw error;
  for (const row of data ?? []) {
    if (generation !== started || (scope && scope !== ctx.key)) break;
    const { data: claimed, error: claimError } = await supabase.rpc('rest_tomar_impresion', { p_job_id: row.id });
    if (claimError) throw claimError;
    const job = claimed as ServerJob | null;
    if (!job?.id) continue;
    if (generation !== started) break; // Claimed job expires to uncertain; never send using a changed session.
    let status: PrintStatus = 'impreso', message: string | null = null;
    try { await sendToBridge(job); }
    catch (e) { status = e instanceof BridgeError && !e.uncertain ? 'fallido' : 'incierto'; message = e instanceof Error ? e.message : 'Resultado incierto'; }
    const { error: finishError } = await supabase.rpc('rest_finalizar_impresion', { p_job_id: job.id, p_lease_token: job.lease_token, p_estado: status, p_error: message });
    // Never retry an acknowledged/ambiguous physical print because persisting its result failed.
    if (finishError) throw new Error('No se pudo guardar la confirmación. Verifica el papel antes de reimprimir.');
  }
  await refreshPrintQueue();
}
export async function authorizeReprint(jobId: string, reason: string) {
  const { error } = await supabase.rpc('rest_reimprimir', { p_job_id: jobId, p_motivo: reason });
  if (error) throw error;
  await processPrintQueue();
}
export function printBrowserTest(config: PrinterConfig) {
  const popup = window.open('', '_blank', 'width=420,height=650');
  if (!popup) throw new Error('Permite ventanas emergentes para realizar la prueba.');
  renderPrintTest(popup.document, config);
  popup.focus(); window.setTimeout(() => { popup.print(); popup.close(); }, 250);
}
window.addEventListener('online', () => { void processPrintQueue().catch(() => { /* Server jobs remain durable; UI refresh displays status. */ }); });
