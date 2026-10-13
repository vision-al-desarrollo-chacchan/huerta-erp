import { createClient } from '@supabase/supabase-js';
import { createCertificateHandler } from '../_shared/sunat-signing/certificate-handler.mjs';
import { sealSunatCertificate } from '../_shared/sunat-signing/certificate-vault.mjs';
import { backendSunatKey } from '../_shared/sunat-signing/backend-key.ts';
const url=Deno.env.get('SUPABASE_URL')??'';
const anon=Deno.env.get('SUPABASE_ANON_KEY')??'';
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
const keyBase64=Deno.env.get('SUNAT_CERTIFICATE_KEY_BASE64')??'';
const keyId=Deno.env.get('SUNAT_CERTIFICATE_KEY_ID')??'v1';
const enabled=Deno.env.get('SUNAT_CERTIFICATE_UPLOAD_ENABLED')!=='false'&&!!url&&!!anon&&!!serviceKey;
const admin=enabled?createClient(url,serviceKey,{auth:{persistSession:false}}):null;
Deno.serve(createCertificateHandler({
 enabled,keyBase64,keyId,
 async seal(input: {pfxBase64:string;password:string;empresaId:string;issuerRuc:string;keyId?:string;keyBase64:string}){return sealSunatCertificate({...input,keyBase64:keyBase64||await backendSunatKey(admin!)});},
 async authenticate(authorization:string){
  if(!authorization.startsWith('Bearer '))return null;
  const client=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
  const {data:{user},error}=await client.auth.getUser();
  return error||!user?null:{userId:user.id};
 },
 repository:{
  async authorize(identity:{userId:string},empresaId:string){
   const {data:member,error}=await admin!.from('rest_miembros').select('rol').eq('empresa_id',empresaId).eq('user_id',identity.userId).eq('activo',true).maybeSingle();
   if(error||!member||!['propietario','administrador'].includes(member.rol))throw new Error('Sin permiso.');
   const {data:company,error:companyError}=await admin!.from('rest_empresas').select('ruc,activa').eq('id',empresaId).single();
   if(companyError||!company)throw new Error('Empresa inválida.');
   return {ruc:company.ruc,activo:company.activa};
  },
  async save(identity:{userId:string},empresaId:string,data:{ruc:string;nombre:string;envelope:string;keyId:string;metadata:{validTo:string;fingerprint256:string}}){
   const {error}=await admin!.rpc('ef_sunat_guardar_certificado',{
    p_empresa_id:empresaId,p_usuario_id:identity.userId,p_ruc:data.ruc,p_nombre:data.nombre,p_envelope:data.envelope,p_key_id:data.keyId,p_vence_at:data.metadata.validTo,p_huella:data.metadata.fingerprint256,
   });
   if(error)throw new Error('Guardado fallido.');
  },
 },
}));
