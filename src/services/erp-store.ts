import { supabase } from '../lib/supabase';
import { getBusinessContext } from './restaurant-store';

export type Client = { id: string; tipo_documento: string; numero_documento: string | null; nombre: string; telefono: string | null; email: string | null; direccion: string | null; activo: boolean; created_at: string };
export type Supplier = { id: string; ruc: string | null; razon_social: string; contacto: string | null; telefono: string | null; email: string | null; direccion: string | null; condicion_pago: string; activo: boolean; created_at: string };
export type Employee = { id: string; dni: string | null; nombres: string; apellidos: string; cargo: string; area: string; telefono: string | null; email: string | null; fecha_ingreso: string; sueldo: number; estado: 'activo' | 'inactivo'; created_at: string };
export type ErpDocument = { id: string; nombre: string; categoria: string; descripcion: string | null; url: string | null; vence_at: string | null; created_at: string };
export type Task = { id: string; titulo: string; descripcion: string | null; fecha: string; hora: string | null; prioridad: 'baja' | 'media' | 'alta'; estado: 'pendiente' | 'completada'; responsable: string | null; created_at: string };
export type QuoteItem = { producto_id: string | null; descripcion: string; cantidad: number; precio: number };
export type Quote = { id: string; numero: number; cliente_id: string | null; cliente_nombre: string; estado: 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'vencida'; total: number; vence_at: string | null; observaciones: string | null; created_at: string; erp_cotizacion_items: QuoteItem[] };
export type AccountingEntry = { id: string; fecha: string; tipo: 'ingreso' | 'egreso'; categoria: string; descripcion: string; monto: number; metodo_pago: string | null; referencia: string | null; created_at: string };
export type Member = { empresa_id: string; user_id: string; rol: 'propietario' | 'administrador' | 'cajero' | 'mozo' | 'cocina'; activo: boolean; nombre: string | null };
export type Invitation = { id: string; email: string; rol: string; token: string; estado: 'pendiente' | 'usada' | 'revocada'; created_at: string };
export type CompanySettings = { empresaId: string; branchId: string; nombre: string; nombreComercial: string; ruc: string; telefono: string; direccion: string; sucursal: string; sucursalDireccion: string; moneda: string; igv: number; serieBoleta: string; serieFactura: string };

async function companyId() { return (await getBusinessContext()).empresaId; }

async function list<T>(table: string, order = 'created_at'): Promise<T[]> {
  const empresaId = await companyId();
  const { data, error } = await supabase.from(table).select('*').eq('empresa_id', empresaId).order(order, { ascending: false });
  if (error) throw error;
  return (data ?? []) as T[];
}

async function insert<T>(table: string, values: Record<string, unknown>): Promise<T> {
  const empresaId = await companyId();
  const { data, error } = await supabase.from(table).insert({ ...values, empresa_id: empresaId }).select().single();
  if (error) throw error;
  return data as T;
}

export const getClients = () => list<Client>('erp_clientes');
export const createClient = (values: Omit<Client, 'id' | 'activo' | 'created_at'>) => insert<Client>('erp_clientes', values);
export const getSuppliers = () => list<Supplier>('erp_proveedores');
export const createSupplier = (values: Omit<Supplier, 'id' | 'activo' | 'created_at'>) => insert<Supplier>('erp_proveedores', values);
export const getEmployees = () => list<Employee>('erp_empleados');
export const createEmployee = (values: Omit<Employee, 'id' | 'estado' | 'created_at'>) => insert<Employee>('erp_empleados', values);
export const getDocuments = () => list<ErpDocument>('erp_documentos');
export const createDocument = (values: Omit<ErpDocument, 'id' | 'created_at'>) => insert<ErpDocument>('erp_documentos', values);
export const getTasks = () => list<Task>('erp_tareas', 'fecha');
export const createTask = (values: Omit<Task, 'id' | 'estado' | 'created_at'>) => insert<Task>('erp_tareas', values);

export async function getQuotes(): Promise<Quote[]> {
  const empresaId = await companyId();
  const { data, error } = await supabase.from('erp_cotizaciones').select('id,numero,cliente_id,cliente_nombre,estado,total,vence_at,observaciones,created_at,erp_cotizacion_items(producto_id,descripcion,cantidad,precio)').eq('empresa_id', empresaId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row => ({ ...row, numero: Number(row.numero), total: Number(row.total), erp_cotizacion_items: (row.erp_cotizacion_items ?? []).map(item => ({ ...item, cantidad: Number(item.cantidad), precio: Number(item.precio) })) })) as Quote[];
}

export async function createQuote(values: { clienteId?: string; clienteNombre: string; venceAt?: string; observaciones?: string; items: QuoteItem[] }) {
  const { empresaId, sucursalId } = await getBusinessContext();
  const total = values.items.reduce((sum, item) => sum + item.cantidad * item.precio, 0);
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('erp_cotizaciones').insert({ empresa_id: empresaId, sucursal_id: sucursalId, cliente_id: values.clienteId || null, cliente_nombre: values.clienteNombre, vence_at: values.venceAt || null, observaciones: values.observaciones || null, total, creado_por: userData.user?.id }).select('id').single();
  if (error) throw error;
  const { error: itemError } = await supabase.from('erp_cotizacion_items').insert(values.items.map(item => ({ ...item, cotizacion_id: data.id })));
  if (itemError) throw itemError;
  return data.id as string;
}

export async function setQuoteStatus(id: string, estado: Quote['estado']) {
  const empresaId = await companyId();
  const { error } = await supabase.from('erp_cotizaciones').update({ estado }).eq('id', id).eq('empresa_id', empresaId);
  if (error) throw error;
}

export async function getAccountingEntries(): Promise<AccountingEntry[]> {
  const rows = await list<AccountingEntry>('erp_movimientos_contables', 'fecha');
  return rows.map(row => ({ ...row, monto: Number(row.monto) }));
}

export async function createAccountingEntry(values: Omit<AccountingEntry, 'id' | 'created_at'>) {
  const { data } = await supabase.auth.getUser();
  return insert<AccountingEntry>('erp_movimientos_contables', { ...values, registrado_por: data.user?.id });
}

export async function getMembers(): Promise<Member[]> { const empresaId=await companyId(); const {data,error}=await supabase.from('rest_miembros').select('empresa_id,user_id,rol,activo,nombre').eq('empresa_id',empresaId).order('nombre'); if(error)throw error; return (data??[]) as Member[]; }
export async function setMember(id:string,values:{rol?:Member['rol'];activo?:boolean}){const empresaId=await companyId();const {error}=await supabase.from('rest_miembros').update(values).eq('empresa_id',empresaId).eq('user_id',id);if(error)throw error;}
export async function getInvitations():Promise<Invitation[]>{const empresaId=await companyId();const {data,error}=await supabase.from('erp_invitaciones').select('id,email,rol,token,estado,created_at').eq('empresa_id',empresaId).order('created_at',{ascending:false});if(error)throw error;return(data??[]) as Invitation[];}
export async function createInvitation(email:string,rol:string):Promise<Invitation>{const empresaId=await companyId();const {data,error}=await supabase.rpc('erp_crear_invitacion',{p_empresa_id:empresaId,p_email:email,p_rol:rol});if(error)throw error;return data as Invitation;}
export async function acceptInvitation(token:string){const {data,error}=await supabase.rpc('erp_aceptar_invitacion',{p_token:token});if(error)throw error;return data as string;}

export async function getCompanySettings():Promise<CompanySettings>{const {empresaId,sucursalId}=await getBusinessContext();const [{data:e,error:ee},{data:s,error:se},{data:c,error:ce}]=await Promise.all([supabase.from('rest_empresas').select('nombre,nombre_comercial,ruc,telefono,direccion').eq('id',empresaId).single(),supabase.from('rest_sucursales').select('nombre,direccion').eq('id',sucursalId).single(),supabase.from('erp_configuracion').select('moneda,igv,serie_boleta,serie_factura').eq('empresa_id',empresaId).maybeSingle()]);if(ee)throw ee;if(se)throw se;if(ce)throw ce;return{empresaId,branchId:sucursalId,nombre:e.nombre,nombreComercial:e.nombre_comercial??'',ruc:e.ruc??'',telefono:e.telefono??'',direccion:e.direccion??'',sucursal:s.nombre,sucursalDireccion:s.direccion??'',moneda:c?.moneda??'PEN',igv:Number(c?.igv??18),serieBoleta:c?.serie_boleta??'B001',serieFactura:c?.serie_factura??'F001'};}
export async function saveCompanySettings(v:CompanySettings){const [{error:e},{error:s},{error:c}]=await Promise.all([supabase.from('rest_empresas').update({nombre:v.nombre,nombre_comercial:v.nombreComercial||null,ruc:v.ruc||null,telefono:v.telefono||null,direccion:v.direccion||null}).eq('id',v.empresaId),supabase.from('rest_sucursales').update({nombre:v.sucursal,direccion:v.sucursalDireccion||null}).eq('id',v.branchId),supabase.from('erp_configuracion').upsert({empresa_id:v.empresaId,moneda:v.moneda,igv:v.igv,serie_boleta:v.serieBoleta,serie_factura:v.serieFactura,updated_at:new Date().toISOString()})]);if(e)throw e;if(s)throw s;if(c)throw c;}

export async function setTaskStatus(id: string, estado: Task['estado']) {
  const empresaId = await companyId();
  const { error } = await supabase.from('erp_tareas').update({ estado }).eq('id', id).eq('empresa_id', empresaId);
  if (error) throw error;
}

export async function archiveRecord(table: 'erp_clientes' | 'erp_proveedores', id: string) {
  const empresaId = await companyId();
  const { error } = await supabase.from(table).update({ activo: false }).eq('id', id).eq('empresa_id', empresaId);
  if (error) throw error;
}

export async function setEmployeeStatus(id: string, estado: Employee['estado']) {
  const empresaId = await companyId();
  const { error } = await supabase.from('erp_empleados').update({ estado }).eq('id', id).eq('empresa_id', empresaId);
  if (error) throw error;
}
