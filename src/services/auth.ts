import { supabase } from "../lib/supabase";
import { clearActiveOperator, setActiveOperator, type ActiveOperator } from './operator-session';
import { operatorRolesHome } from './operator-permissions';

export async function login(email: string, password: string) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function prepareLoggedInAccess() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesión no encontrada.');
  const { data, error } = await supabase.from('rest_miembros').select('user_id,nombre,rol,roles,activo').eq('user_id', user.id).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) { clearActiveOperator(); return '/dashboard'; }
  if (!data.activo) { await supabase.auth.signOut(); throw new Error('Tu acceso fue desactivado. Comunícate con el administrador.'); }
  const memberRoles = (data.roles?.length ? data.roles : [data.rol]) as string[];
  if (memberRoles.includes('propietario') || memberRoles.includes('administrador')) { clearActiveOperator(); return '/dashboard'; }
  const roles = memberRoles.filter((role): role is ActiveOperator['role'] => ['cajero','mozo','moza_cajera','cocina','supervisor'].includes(role));
  if (!roles.length) throw new Error('Tu cuenta no tiene un rol operativo válido.');
  const role = roles.includes('moza_cajera') ? 'moza_cajera' : roles[0];
  setActiveOperator({ employeeId: user.id, name: data.nombre || user.email || 'Trabajador', role, roles });
  return operatorRolesHome(roles);
}

export async function register(email: string, password: string, fullName: string) {
  return await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
}

export async function logout() {
  sessionStorage.removeItem('huerta-active-operator');
  return await supabase.auth.signOut();
}

export async function getUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}


export async function verifyCurrentPassword(password: string) {
  const { data } = await supabase.auth.getSession();
  const email = data.session?.user.email;
  if (!email) return { error: new Error('No se encontró el correo del administrador.') };
  const result = await supabase.auth.signInWithPassword({ email, password });
  return { error: result.error };
}
