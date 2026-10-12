import { supabase } from '../../lib/supabase';
import { getBusinessContext } from '../restaurant-store';
export type SunatBetaState = 'pendiente' | 'enviando' | 'aceptado' | 'observado' | 'rechazado' | 'error' | 'incierto';
export type SunatBetaResult = { id: string; empresaId: string; estado: SunatBetaState; codigo?: string | null; mensaje?: string | null; observaciones: string[] };
export async function getSunatBetaAccess() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Inicia sesión para consultar las pruebas SUNAT.');
  const { empresaId } = await getBusinessContext();
  const { data: member, error: memberError } = await supabase.from('rest_miembros').select('rol').eq('empresa_id', empresaId).eq('user_id', user.id).eq('activo', true).maybeSingle();
  if (memberError) throw new Error('No se pudieron comprobar los permisos de pruebas SUNAT.');
  return { empresaId, userId: user.id, allowed: !!member && ['propietario', 'administrador'].includes(member.rol) };
}
export async function getSunatBetaResult(empresaId: string, idempotencyKey: string): Promise<SunatBetaResult | null> {
  const { data, error } = await supabase.from('ef_sunat_beta_pruebas').select('id,empresa_id,estado,codigo_sunat,mensaje_sunat,observaciones').eq('empresa_id', empresaId).eq('idempotency_key', idempotencyKey).maybeSingle();
  if (error) throw new Error('No se pudo consultar el resultado de la prueba SUNAT.');
  return data ? { id: data.id, empresaId: data.empresa_id, estado: data.estado, codigo: data.codigo_sunat, mensaje: data.mensaje_sunat, observaciones: Array.isArray(data.observaciones) ? data.observaciones : [] } : null;
}
export async function runSunatBetaTest(empresaId: string, idempotencyKey: string): Promise<SunatBetaResult> {
  const { data, error } = await supabase.functions.invoke('electronic-billing-beta', { body: { empresaId, idempotencyKey } });
  if (error) {
    // Una respuesta HTTP 502 puede contener un resultado incierto ya guardado.
    if (error.context instanceof Response) {
      const body = await error.context.clone().json().catch(() => null);
      if (body?.id && body.empresaId === empresaId && body.estado) return { ...body, observaciones: body.observaciones ?? [] };
      if (typeof body?.error === 'string') throw new Error(body.error);
    }
    throw new Error('No se confirmó el resultado. Usa «Actualizar resultado» antes de repetir la prueba.');
  }
  if (!data?.id || data.empresaId !== empresaId || !data.estado) throw new Error('Respuesta de prueba inválida. Consulta el resultado antes de repetir.');
  return { ...data, observaciones: data.observaciones ?? [] };
}
