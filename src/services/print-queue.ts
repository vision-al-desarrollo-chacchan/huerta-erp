import { supabase } from '../lib/supabase';
import { getBusinessContext } from './restaurant-store';
import type { RestaurantOrder } from '../types/restaurant';

export type PrinterArea = 'cocina' | 'caja' | 'bar';
export type PrintStatus = 'pendiente' | 'imprimiendo' | 'impreso' | 'fallido';
export type PrinterConfig = { id?: string; area: PrinterArea; printerName: string; widthMm: 58 | 80; copies: number; autoPrint: boolean; active: boolean };
export type LocalPrintJob = { id: string; key: string; area: PrinterArea; printerName: string; content: string; status: PrintStatus; attempts: number; error?: string; createdAt: string; printedAt?: string };

const STORAGE_KEY = 'huerta-print-queue-v1';
const BRIDGE_URL = 'ws://127.0.0.1:18181';

function load(): LocalPrintJob[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as LocalPrintJob[]; } catch { return []; } }
function persist(jobs: LocalPrintJob[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(-300))); window.dispatchEvent(new Event('huerta-print-queue-updated')); }
export function getLocalPrintQueue() { return load().sort((a,b) => b.createdAt.localeCompare(a.createdAt)); }

export async function getPrinterConfigurations(): Promise<PrinterConfig[]> {
  const { empresaId, sucursalId } = await getBusinessContext();
  const { data, error } = await supabase.from('print_configuraciones').select('*').eq('empresa_id', empresaId).eq('sucursal_id', sucursalId).order('area');
  if (error) throw error;
  const byArea = new Map((data ?? []).map(row => [row.area, row]));
  return (['cocina','caja','bar'] as PrinterArea[]).map(area => { const row=byArea.get(area); return { id: row?.id, area, printerName: row?.nombre_impresora ?? '', widthMm: row?.ancho_mm === 58 ? 58 : 80, copies: Number(row?.copias ?? 1), autoPrint: row?.auto_imprimir ?? area === 'cocina', active: row?.activa ?? true }; });
}

export async function savePrinterConfigurations(configs: PrinterConfig[]) {
  const { empresaId, sucursalId } = await getBusinessContext();
  const rows=configs.map(c=>({...c.id?{id:c.id}:{},empresa_id:empresaId,sucursal_id:sucursalId,area:c.area,nombre_impresora:c.printerName.trim(),ancho_mm:c.widthMm,copias:c.copies,auto_imprimir:c.autoPrint,activa:c.active,updated_at:new Date().toISOString()}));
  const {error}=await supabase.from('print_configuraciones').upsert(rows,{onConflict:'empresa_id,sucursal_id,area'}); if(error)throw error;
}

function orderContent(order: RestaurantOrder, area: PrinterArea, isAddition = false) {
  const items=order.items.map(i=>`${i.quantity} x ${i.name}${i.notes?`\n   Nota: ${i.notes}`:''}`).join('\n');
  return `CHICKEN HUERTA\n${area.toUpperCase()} - ${isAddition ? 'ADICIÓN' : 'COMANDA'} #${order.number}\n${new Date(order.createdAt).toLocaleString('es-PE')}\nServicio: ${order.serviceType}${order.table?` - ${order.table}`:''}\n--------------------------------\n${items}\n--------------------------------\n`;
}

export async function enqueueOrderPrint(order: RestaurantOrder, area: PrinterArea = 'cocina', batchKey = 'v1') {
  const configs=await getPrinterConfigurations(); const config=configs.find(c=>c.area===area);
  if(!config?.active || !config.autoPrint) return;
  const key=`order:${order.id}:${area}:${batchKey}`; const current=load(); if(current.some(j=>j.key===key))return;
  const job:LocalPrintJob={id:crypto.randomUUID(),key,area,printerName:config.printerName,content:orderContent(order,area,batchKey!=='v1'),status:'pendiente',attempts:0,createdAt:new Date().toISOString()};
  persist([...current,job]);
  const {empresaId,sucursalId}=await getBusinessContext();
  await supabase.from('print_jobs').upsert({empresa_id:empresaId,sucursal_id:sucursalId,pedido_id:order.id,area,idempotency_key:key,payload:{printerName:config.printerName,widthMm:config.widthMm,copies:config.copies,content:job.content},estado:'pendiente'},{onConflict:'empresa_id,idempotency_key'});
  if(navigator.onLine) void processPrintQueue();
}

async function sendToBridge(job: LocalPrintJob) {
  await new Promise<void>((resolve,reject)=>{ const socket=new WebSocket(BRIDGE_URL); const timer=window.setTimeout(()=>{socket.close();reject(new Error('No se encontró el conector local de impresión.'));},3000); socket.onopen=()=>socket.send(JSON.stringify({type:'print',jobId:job.id,printer:job.printerName,content:job.content,width:80})); socket.onmessage=e=>{clearTimeout(timer);const response=JSON.parse(String(e.data)) as {ok?:boolean;error?:string};socket.close();if(response.ok)resolve();else reject(new Error(response.error||'La ticketera rechazó el trabajo.'));}; socket.onerror=()=>{clearTimeout(timer);reject(new Error('Ticketera desconectada o conector local cerrado.'));}; });
}

export async function processPrintQueue(jobId?: string) {
  const jobs=load(); const candidates=jobs.filter(j=>(!jobId||j.id===jobId)&&(j.status==='pendiente'||j.status==='fallido'));
  for(const candidate of candidates){ const index=jobs.findIndex(j=>j.id===candidate.id); jobs[index]={...candidate,status:'imprimiendo',attempts:candidate.attempts+1,error:undefined};persist(jobs);
    try{await sendToBridge(jobs[index]);jobs[index]={...jobs[index],status:'impreso',printedAt:new Date().toISOString()};await supabase.from('print_jobs').update({estado:'impreso',intentos:jobs[index].attempts,ultimo_error:null,impreso_at:jobs[index].printedAt,updated_at:new Date().toISOString()}).eq('idempotency_key',candidate.key);}
    catch(e){jobs[index]={...jobs[index],status:'fallido',error:e instanceof Error?e.message:'Error de impresión'};await supabase.from('print_jobs').update({estado:'fallido',intentos:jobs[index].attempts,ultimo_error:jobs[index].error,updated_at:new Date().toISOString()}).eq('idempotency_key',candidate.key);} persist(jobs);
  }
}

export function printBrowserTest(config: PrinterConfig) {
  const popup=window.open('','_blank','width=420,height=650'); if(!popup)throw new Error('Permite ventanas emergentes para realizar la prueba.');
  popup.document.body.innerHTML=`<main><h1>HUERTA ERP</h1><h2>PRUEBA ${config.area.toUpperCase()}</h2><p>${new Date().toLocaleString('es-PE')}</p><hr><p>Ticketera: ${config.printerName||'Sin nombre'}</p><p>Ancho: ${config.widthMm} mm</p><hr><strong>IMPRESIÓN CORRECTA</strong></main><style>@page{size:${config.widthMm}mm auto;margin:4mm}body{font-family:Arial;text-align:center;margin:0}main{width:${config.widthMm-8}mm}h1{font-size:20px}h2{font-size:15px}hr{border:0;border-top:1px dashed}</style>`;
  popup.focus();window.setTimeout(()=>{popup.print();popup.close();},250);
}

window.addEventListener('online',()=>void processPrintQueue());
