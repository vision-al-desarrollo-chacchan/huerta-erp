import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };
const allowedRoles = ['administrador','cajero','mozo','moza_cajera','cocina','supervisor'];

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  try {
    const auth = request.headers.get('Authorization');
    if (!auth) throw new Error('Sesión requerida.');
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: { user } } = await anon.auth.getUser();
    if (!user) throw new Error('Sesión inválida.');
    const body = await request.json();
    const { data: permitted } = await anon.rpc('rest_es_admin', { target_empresa: body.empresaId });
    if (!permitted) throw new Error('Solo el propietario o administrador puede gestionar cuentas.');
    const roles = [...new Set((body.roles ?? []).filter((role:string)=>allowedRoles.includes(role)))];
    let targetId = body.userId as string | undefined;

    if (body.action === 'create') {
      if (!body.name?.trim() || !/^\S+@\S+\.\S+$/.test(body.email ?? '') || (body.password?.length ?? 0) < 8 || !roles.length) throw new Error('Completa nombre, correo, contraseña y roles.');
      const { data, error } = await admin.auth.admin.createUser({ email: body.email.toLowerCase().trim(), password: body.password, email_confirm: true, user_metadata: { full_name: body.name.trim() } });
      if (error) throw error;
      targetId = data.user.id;
      const { error: memberError } = await admin.from('rest_miembros').insert({ empresa_id: body.empresaId, user_id: targetId, rol: roles[0], roles, nombre: body.name.trim(), email: body.email.toLowerCase().trim(), activo: true });
      if (memberError) { await admin.auth.admin.deleteUser(targetId); throw memberError; }
    } else {
      if (!targetId) throw new Error('Trabajador no encontrado.');
      const { data: member } = await admin.from('rest_miembros').select('rol').eq('empresa_id',body.empresaId).eq('user_id',targetId).single();
      if (member?.rol === 'propietario') throw new Error('La cuenta del propietario no se puede modificar.');
      if (body.action === 'password') { if ((body.password?.length ?? 0)<8) throw new Error('La contraseña debe tener al menos 8 caracteres.'); const { error }=await admin.auth.admin.updateUserById(targetId,{password:body.password}); if(error)throw error; }
      else if (body.action === 'active') { const { error }=await admin.from('rest_miembros').update({activo:Boolean(body.active)}).eq('empresa_id',body.empresaId).eq('user_id',targetId); if(error)throw error; }
      else if (body.action === 'roles') { if(!roles.length)throw new Error('Selecciona por lo menos un rol.'); const { error }=await admin.from('rest_miembros').update({rol:roles[0],roles}).eq('empresa_id',body.empresaId).eq('user_id',targetId); if(error)throw error; }
      else throw new Error('Acción no válida.');
    }
    await admin.from('erp_actividad_empleados').insert({ empresa_id: body.empresaId, user_id: targetId, accion: body.action, detalle: { roles: roles.length ? roles : undefined, activo: body.active }, realizada_por: user.id });
    return new Response(JSON.stringify({ ok:true, userId:targetId }), { headers });
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'No se pudo gestionar la cuenta.' }), { status:400, headers }); }
});
