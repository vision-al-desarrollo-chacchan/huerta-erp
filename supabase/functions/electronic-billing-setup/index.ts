import { createClient } from '@supabase/supabase-js';
import { sealSol } from '../_shared/sunat-signing/sol-vault.mjs';
import { backendSunatKey } from '../_shared/sunat-signing/backend-key.ts';
const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS', 'Cache-Control':'no-store' };
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: cors });
const url = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession:false } });
Deno.serve(async req => {
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  if(req.method!=='POST') return reply({error:'Método no admitido.'},405);
  const client = createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')??''}},auth:{persistSession:false}});
  const { data:{user},error:authError } = await client.auth.getUser();
  if(authError||!user) return reply({error:'Sesión inválida.'},401);
  let body;
  try { const raw=await req.text(); if(raw.length>4000)throw new Error(); body=JSON.parse(raw); if(Object.keys(body).some(k=>!['empresaId','username','password'].includes(k))||! /^[0-9a-f-]{36}$/i.test(body.empresaId))throw new Error(); }
  catch { return reply({error:'Solicitud inválida.'},400); }
  const {data:member,error:memberError}=await admin.from('rest_miembros').select('rol').eq('empresa_id',body.empresaId).eq('user_id',user.id).eq('activo',true).maybeSingle();
  if(memberError||!member||!['propietario','administrador'].includes(member.rol))return reply({error:'Se requiere administrador de esta empresa.'},403);
  const {data:company,error:companyError}=await admin.from('rest_empresas').select('ruc,activa').eq('id',body.empresaId).single();
  if(companyError||!company?.activa||! /^\d{11}$/.test(company.ruc??''))return reply({error:'Guarda primero el RUC de la empresa.'},400);
  try {
    const envelope=await sealSol({username:body.username,password:body.password,empresaId:body.empresaId,ruc:company.ruc,keyId:'v1',keyBase64:await backendSunatKey(admin)});
    const {error}=await admin.rpc('ef_sunat_guardar_sol',{p_empresa_id:body.empresaId,p_usuario_id:user.id,p_ruc:company.ruc,p_usuario_sol:body.username,p_envelope:envelope});
    if(error)throw new Error();
    return reply({ok:true,claveSolConfigurada:true,emisionActiva:false});
  } catch { return reply({error:'No se pudieron guardar las credenciales SOL. Revisa los datos y los permisos.'},400); }
});
