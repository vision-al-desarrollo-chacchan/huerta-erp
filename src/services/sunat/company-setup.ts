import { supabase } from '../../lib/supabase';
import { getBusinessContext } from '../restaurant-store';

export type FiscalCompany = { ruc: string; legalName: string; address: string };

export function validateFiscalCompany(company: FiscalCompany): string[] {
  const errors: string[] = [];
  if (!/^\d{11}$/.test(company.ruc.trim())) errors.push('Ingresa un RUC de 11 dígitos.');
  if (!company.legalName.trim()) errors.push('Ingresa la razón social.');
  if (!company.address.trim()) errors.push('Ingresa la dirección fiscal.');
  return errors;
}

export async function getFiscalCompany() {
  const { empresaId } = await getBusinessContext();
  const { data, error } = await supabase.from('rest_empresas').select('ruc,nombre,direccion').eq('id', empresaId).single();
  if (error) throw error;
  const { data: admin, error: adminError } = await supabase.rpc('rest_es_admin', { target_empresa: empresaId });
  if (adminError) throw adminError;
  return { company: { ruc: data.ruc ?? '', legalName: data.nombre, address: data.direccion ?? '' } as FiscalCompany, canEdit: Boolean(admin) };
}

export async function saveFiscalCompany(company: FiscalCompany) {
  const errors = validateFiscalCompany(company);
  if (errors.length) throw new Error(errors.join(' '));
  const { empresaId } = await getBusinessContext();
  const { data: config, error: configError } = await supabase.from('ef_configuraciones').select('activo,certificado_configurado').eq('empresa_id', empresaId).maybeSingle();
  if (configError) throw configError;
  const { data: current, error: currentError } = await supabase.from('rest_empresas').select('ruc').eq('id', empresaId).single();
  if (currentError) throw currentError;
  if ((config?.activo || config?.certificado_configurado) && current.ruc !== company.ruc.trim()) {
    throw new Error('No cambies el RUC con un certificado configurado o emisión activa. Se requiere revisar primero la configuración fiscal.');
  }
  // La política rest_empresas_admin_update aplica la autorización en el servidor.
  const { data, error } = await supabase.from('rest_empresas').update({ ruc: company.ruc.trim(), nombre: company.legalName.trim(), direccion: company.address.trim() }).eq('id', empresaId).select('id').single();
  if (error || !data) throw new Error('No se pudieron guardar los datos fiscales. Se requiere administrador de la empresa.');
}

export async function uploadFiscalCertificate(file: File, password: string) {
  if (!/\.(pfx|p12)$/i.test(file.name) || !file.size || file.size > 2_000_000) throw new Error('Selecciona un certificado PFX/P12 de hasta 2 MB.');
  const { empresaId } = await getBusinessContext();
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    let raw = '';
    for (const byte of bytes) raw += String.fromCharCode(byte);
    const { data, error } = await supabase.functions.invoke('electronic-billing-certificate', {
      body: { empresaId, fileName: file.name, pfxBase64: btoa(raw), password },
    });
    if (error) {
      // Devuelve únicamente el mensaje público del handler, nunca el cuerpo enviado.
      let message = 'No se pudo cargar el certificado. La carga debe estar habilitada por el administrador del sistema.';
      if (error.context instanceof Response) {
        const response = await error.context.json().catch(() => null);
        if (typeof response?.error === 'string') message = response.error;
      }
      throw new Error(message);
    }
    if (data?.ok !== true) throw new Error('No se confirmó el guardado del certificado. Consulta su estado antes de repetir.');
  } finally { bytes.fill(0); }
}

export async function saveFiscalSol(username: string, password: string) {
  if (!/^[A-Za-z0-9]{1,30}$/.test(username) || !password || password.length > 1024) throw new Error('Ingresa un usuario SOL válido y su clave.');
  const { empresaId } = await getBusinessContext();
  const { data, error } = await supabase.functions.invoke('electronic-billing-setup', { body: { empresaId, username, password } });
  if (error || data?.ok !== true) throw new Error('No se pudieron guardar las credenciales SOL. Comprueba el RUC, la sesión y los permisos.');
}
