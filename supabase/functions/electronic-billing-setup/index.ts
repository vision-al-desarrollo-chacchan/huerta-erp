import { createClient } from '@supabase/supabase-js';
import { sealSol, openSol } from '../_shared/sunat-signing/sol-vault.mjs';
import { backendSunatKey } from '../_shared/sunat-signing/backend-key.ts';
import { companyReadiness } from '../_shared/sunat-signing/company-readiness.mjs';
import { inspectStoredSunatCertificate } from '../_shared/sunat-signing/certificate-vault.mjs';
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
  try { const raw=await req.text(); if(raw.length>4000)throw new Error(); body=JSON.parse(raw); if(Object.keys(body).some(k=>!['empresaId','username','password','action','branchId','regime','confirmed'].includes(k))||! /^[0-9a-f-]{36}$/i.test(body.empresaId)||!['guardar_sol','estado','activar'].includes(body.action??'guardar_sol'))throw new Error(); }
  catch { return reply({error:'Solicitud inválida.'},400); }
  const {data:member,error:memberError}=await admin.from('rest_miembros').select('rol').eq('empresa_id',body.empresaId).eq('user_id',user.id).eq('activo',true).maybeSingle();
  if(memberError||!member||!['propietario','administrador'].includes(member.rol))return reply({error:'Se requiere administrador de esta empresa.'},403);
  const {data:company,error:companyError}=await admin.from('rest_empresas').select('ruc,activa,nombre,direccion').eq('id',body.empresaId).single();
  if(companyError||!company?.activa)return reply({error:'Empresa no disponible.'},403);
  if(body.action==='estado'||body.action==='activar'){
    if(! /^[0-9a-f-]{36}$/i.test(body.branchId??''))return reply({error:'Sucursal inválida.'},400);
    const {data:branch,error:branchError}=await admin.from('rest_sucursales').select('id').eq('id',body.branchId).eq('empresa_id',body.empresaId).eq('activa',true).maybeSingle();
    if(branchError||!branch)return reply({error:'La sucursal no pertenece a esta empresa.'},403);
    const [{data:certificate,error:ce},{data:sol,error:se},{data:series,error:ee},{data:review,error:re}]=await Promise.all([
      admin.from('ef_sunat_certificados').select('ruc,huella,vence_at,envelope,key_id').eq('empresa_id',body.empresaId).maybeSingle(),
      admin.from('ef_sunat_sol').select('ruc,envelope,key_id').eq('empresa_id',body.empresaId).maybeSingle(),
      admin.from('ef_series').select('tipo_documento,serie,activa,siguiente_numero').eq('empresa_id',body.empresaId).eq('sucursal_id',body.branchId),
      admin.from('ef_sunat_habilitaciones').select('ruc,certificado_huella,aprobada,revisada_at').eq('empresa_id',body.empresaId).maybeSingle(),
    ]);
    if(ce||se||ee||re)return reply({error:'No se pudo comprobar el estado de la configuración.'},503);
    const readiness=companyReadiness({company,certificate,sol,series,review,productionEnabled:Deno.env.get('SUNAT_REAL_ISSUANCE_ENABLED')==='true'});
    if(body.action==='estado')return reply({ok:true,...readiness});
    if(!['rer','rmt','general'].includes(body.regime)||body.confirmed!==true)return reply({error:'Confirma un régimen habilitado y los requisitos de emisión. Nuevo RUS no se activa para este flujo.'},400);
    if(!readiness.canActivate)return reply({error:'Completa los requisitos antes de activar la emisión.',missing:readiness.missing},409);
    try {
      const keyBase64=await backendSunatKey(admin);
      const metadata=await inspectStoredSunatCertificate({envelope:certificate!.envelope,empresaId:body.empresaId,issuerRuc:company.ruc,keyId:certificate!.key_id,keyBase64});
      if(metadata.fingerprint256!==certificate!.huella)throw new Error();
      await openSol({envelope:sol!.envelope,empresaId:body.empresaId,ruc:company.ruc,keyId:sol!.key_id,keyBase64});
      const {error}=await admin.rpc('ef_sunat_activar_empresa',{p_empresa_id:body.empresaId,p_sucursal_id:body.branchId,p_usuario_id:user.id,p_regimen:body.regime,p_confirmado:true});
      if(error)throw new Error();
      return reply({ok:true,emisionActiva:true});
    }catch{return reply({error:'No se pudo activar. Revisa certificado, SOL, series y validación fiscal.'},409);}
  }
  if(! /^\d{11}$/.test(company.ruc??''))return reply({error:'Guarda primero el RUC de la empresa.'},400);
  try {
    const envelope=await sealSol({username:body.username,password:body.password,empresaId:body.empresaId,ruc:company.ruc,keyId:'v1',keyBase64:await backendSunatKey(admin)});
    const {error}=await admin.rpc('ef_sunat_guardar_sol',{p_empresa_id:body.empresaId,p_usuario_id:user.id,p_ruc:company.ruc,p_usuario_sol:body.username,p_envelope:envelope});
    if(error)throw new Error();
    return reply({ok:true,claveSolConfigurada:true,emisionActiva:false});
  } catch { return reply({error:'No se pudieron guardar las credenciales SOL. Revisa los datos y los permisos.'},400); }
});
