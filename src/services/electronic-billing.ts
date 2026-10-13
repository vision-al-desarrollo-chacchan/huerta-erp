import { supabase } from '../lib/supabase';
import { getBusinessContext } from './restaurant-store';

export type BillingProvider = 'sunat' | 'nubefact' | 'pse';
export type BillingEnvironment = 'pruebas' | 'produccion';
export type BillingDocumentType = 'boleta' | 'factura' | 'nota_credito' | 'nota_debito';

export type BillingConfig = {
  id?: string;
  provider: BillingProvider;
  environment: BillingEnvironment;
  testUrl: string;
  productionUrl: string;
  solUser: string;
  certificateName: string;
  certificateExpiresAt: string;
  tokenConfigured: boolean;
  solPasswordConfigured: boolean;
  certificateConfigured: boolean;
  active: boolean;
};

export type BillingSeries = {
  id?: string;
  documentType: BillingDocumentType;
  series: string;
  nextNumber: number;
  active: boolean;
};

export type BillingDocument = {
  id: string;
  orderId?: string;
  documentType: BillingDocumentType | 'anulacion';
  series: string;
  number: number;
  status: 'pendiente' | 'enviando' | 'aceptado' | 'observado' | 'rechazado' | 'anulado' | 'error' | 'incierto';
  total: number;
  receiverName?: string;
  sunatCode?: string;
  sunatMessage?: string;
  attempts: number;
  xmlPath?: string;
  pdfPath?: string;
  cdrPath?: string;
  createdAt: string;
};

const SUNAT_TEST = 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService';
const SUNAT_PRODUCTION = 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService';

export async function getBillingConfiguration(): Promise<BillingConfig> {
  const { empresaId } = await getBusinessContext();
  const { data, error } = await supabase.from('ef_configuraciones').select('id,proveedor,ambiente,ruta_pruebas,ruta_produccion,usuario_sol,certificado_nombre,certificado_vence_at,token_configurado,clave_sol_configurada,certificado_configurado,activo').eq('empresa_id', empresaId).maybeSingle();
  if (error) throw error;
  return {
    id: data?.id,
    provider: data?.proveedor ?? 'sunat',
    environment: data?.ambiente ?? 'pruebas',
    testUrl: data?.ruta_pruebas ?? SUNAT_TEST,
    productionUrl: data?.ruta_produccion ?? SUNAT_PRODUCTION,
    solUser: data?.usuario_sol ?? '',
    certificateName: data?.certificado_nombre ?? '',
    certificateExpiresAt: data?.certificado_vence_at ?? '',
    tokenConfigured: Boolean(data?.token_configurado),
    solPasswordConfigured: Boolean(data?.clave_sol_configurada),
    certificateConfigured: Boolean(data?.certificado_configurado),
    active: Boolean(data?.activo),
  };
}

export async function saveBillingConfiguration(config: BillingConfig, secrets?: { token?: string; solPassword?: string; certificateBase64?: string }) {
  const { empresaId } = await getBusinessContext();
  const { data: session } = await supabase.auth.getSession();
  if (secrets?.token || secrets?.solPassword || secrets?.certificateBase64) {
    const { error } = await supabase.functions.invoke('electronic-billing-secrets', {
      body: { empresaId, token: secrets.token, solPassword: secrets.solPassword, certificateBase64: secrets.certificateBase64 },
      headers: session.session?.access_token ? { Authorization: `Bearer ${session.session.access_token}` } : undefined,
    });
    if (error) throw new Error(`No se pudieron proteger las credenciales: ${error.message}`);
  }
  const { error } = await supabase.from('ef_configuraciones').upsert({
    empresa_id: empresaId,
    proveedor: config.provider,
    ambiente: config.environment,
    ruta_pruebas: config.testUrl || null,
    ruta_produccion: config.productionUrl || null,
    usuario_sol: config.solUser || null,
    certificado_nombre: config.certificateName || null,
    certificado_vence_at: config.certificateExpiresAt || null,
    activo: config.active,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'empresa_id' });
  if (error) throw error;
}

export async function getBillingSeries(): Promise<BillingSeries[]> {
  const { empresaId, sucursalId } = await getBusinessContext();
  const { data, error } = await supabase.from('ef_series').select('id,tipo_documento,serie,siguiente_numero,activa').eq('empresa_id', empresaId).eq('sucursal_id', sucursalId).order('tipo_documento');
  if (error) throw error;
  return (data ?? []).map(row => ({ id: row.id, documentType: row.tipo_documento, series: row.serie, nextNumber: Number(row.siguiente_numero), active: row.activa }));
}

export async function saveBillingSeries(series: BillingSeries[]) {
  const { empresaId, sucursalId } = await getBusinessContext();
  const rows = series.map(item => ({ ...item.id ? { id: item.id } : {}, empresa_id: empresaId, sucursal_id: sucursalId, tipo_documento: item.documentType, serie: item.series.trim().toUpperCase(), siguiente_numero: item.nextNumber, activa: item.active }));
  const { error } = await supabase.from('ef_series').upsert(rows, { onConflict: 'empresa_id,sucursal_id,tipo_documento,serie' });
  if (error) throw error;
}

export async function getBillingDocuments(page = 0): Promise<BillingDocument[]> {
  const { empresaId, sucursalId } = await getBusinessContext();
  const { data, error } = await supabase.from('ef_documentos').select('id,pedido_id,tipo_documento,serie,numero,estado,total,receptor_nombre,codigo_sunat,mensaje_sunat,intentos,xml_path,pdf_path,cdr_path,created_at').eq('empresa_id', empresaId).eq('sucursal_id', sucursalId).order('created_at', { ascending: false }).order('id', { ascending: false }).range(page * 100, page * 100 + 99);
  if (error) throw error;
  return (data ?? []).map(row => ({ id: row.id, orderId: row.pedido_id ?? undefined, documentType: row.tipo_documento, series: row.serie, number: Number(row.numero), status: row.estado, total: Number(row.total), receiverName: row.receptor_nombre ?? undefined, sunatCode: row.codigo_sunat ?? undefined, sunatMessage: row.mensaje_sunat ?? undefined, attempts: row.intentos, xmlPath: row.xml_path ?? undefined, pdfPath: row.pdf_path ?? undefined, cdrPath: row.cdr_path ?? undefined, createdAt: row.created_at }));
}

export async function retryBillingDocument(documentId: string, action?: 'consultar') {
  const { data, error } = await supabase.functions.invoke('electronic-billing-send', { body: { documentId, ...(action ? { action } : {}) } });
  if (error) {
    let message = 'No se pudo confirmar el envío. Consulta el estado antes de repetir.';
    if (error.context instanceof Response) {
      const result = await error.context.json().catch(() => null);
      if (typeof result?.error === 'string') message = result.error;
      else if (typeof result?.mensaje === 'string') message = result.mensaje;
    }
    throw new Error(message);
  }
  return data;
}

export async function getBillingArtifactUrl(path: string) {
  const { data, error } = await supabase.storage.from('sunat-comprobantes').createSignedUrl(path, 60);
  if (error || !data?.signedUrl) throw new Error('No se pudo abrir el archivo de esta empresa.');
  return data.signedUrl;
}

export async function issueOrderDocument(input: { orderId: string; type: 'boleta' | 'factura'; total: number; receiverDocument?: string; receiverName?: string }) {
  const { empresaId, sucursalId } = await getBusinessContext();
  const key = `${empresaId}:${input.orderId}:${input.type}`;
  const { data, error } = await supabase.rpc('ef_reservar_documento', { p_empresa_id: empresaId, p_sucursal_id: sucursalId, p_pedido_id: input.orderId, p_tipo_documento: input.type, p_idempotency_key: key, p_total: input.total, p_receptor_documento: input.receiverDocument ?? '', p_receptor_nombre: input.receiverName ?? '' });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  await retryBillingDocument(row.id);
  return row.id as string;
}
