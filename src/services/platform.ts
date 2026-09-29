import { supabase } from '../lib/supabase';

export type PlatformCompany = {
  id: string; nombre: string; activa: boolean; created_at: string;
  plan: string; vence_el: string | null; usuarios: number;
  propietarios: { email: string; nombre: string | null }[];
  puede_entrar: boolean;
};

export async function isSuperadmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('platform_is_superadmin');
  // Compatibility while the frontend and migration are deployed separately.
  if (error?.code === 'PGRST202') return false;
  if (error) throw error;
  return data === true;
}

export async function listPlatformCompanies(): Promise<PlatformCompany[]> {
  const { data, error } = await supabase.rpc('platform_list_companies');
  if (error) throw error;
  return data ?? [];
}

export async function createPlatformCompany(nombre: string, email: string) {
  const { error } = await supabase.rpc('platform_create_company', { p_nombre: nombre.trim(), p_owner_email: email.trim() });
  if (error) throw error;
}

export async function savePlatformPlan(id: string, plan: string, date: string) {
  const { error } = await supabase.rpc('platform_save_plan', { p_empresa_id: id, p_plan: plan.trim(), p_vence_el: date || null });
  if (error) throw error;
}

export async function setPlatformCompanyActive(id: string, active: boolean) {
  const { error } = await supabase.rpc('platform_set_company_active', { p_empresa_id: id, p_activa: active });
  if (error) throw error;
}

export async function deletePlatformCompany(id: string, confirmation: string) {
  const { error } = await supabase.rpc('platform_delete_company', { p_empresa_id: id, p_confirmation: confirmation });
  if (error) throw error;
}

export type CompanyAccess = 'active' | 'suspended' | 'pending';
export async function getCompanyAccess(): Promise<CompanyAccess> {
  const { data, error } = await supabase.rpc('platform_company_access');
  if (error) throw error;
  if (data !== 'active' && data !== 'suspended' && data !== 'pending') throw new Error('No se pudo verificar el acceso a la empresa.');
  return data;
}

export function platformError(error: unknown) {
  return error && typeof error === 'object' && 'message' in error ? String(error.message) : 'No se pudo completar la operación. Intenta nuevamente.';
}
