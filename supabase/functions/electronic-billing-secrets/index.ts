import { createClient } from 'npm:@supabase/supabase-js@2.112.2';

const cors={ 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type' };
async function encrypt(value:string,keySource:string){const keyBytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(keySource));const key=await crypto.subtle.importKey('raw',keyBytes,'AES-GCM',false,['encrypt']);const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(value)));const joined=new Uint8Array(iv.length+encrypted.length);joined.set(iv);joined.set(encrypted,iv.length);return btoa(String.fromCharCode(...joined));}
Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});try{
 const url=Deno.env.get('SUPABASE_URL')!;const anon=Deno.env.get('SUPABASE_ANON_KEY')!;const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;const auth=req.headers.get('Authorization')??'';
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data:{user}}=await userClient.auth.getUser();if(!user)throw new Error('Sesión inválida.');
 const body=await req.json() as {empresaId:string;token?:string;solPassword?:string;certificateBase64?:string};
 const {data:member}=await userClient.from('rest_miembros').select('rol').eq('empresa_id',body.empresaId).eq('user_id',user.id).eq('activo',true).maybeSingle();if(!member||!['propietario','administrador'].includes(member.rol))throw new Error('Solo un administrador puede cambiar credenciales fiscales.');
 const admin=createClient(url,serviceKey);const patch:Record<string,unknown>={empresa_id:body.empresaId,updated_at:new Date().toISOString()};
 for(const[item,column,flag]of [[body.token,'token_cifrado','token_configurado'],[body.solPassword,'clave_sol_cifrada','clave_sol_configurada'],[body.certificateBase64,'certificado_cifrado','certificado_configurado']] as const){if(!item)continue;patch[column]=await encrypt(item,serviceKey);patch[flag]=true;}
 const{error}=await admin.from('ef_configuraciones').upsert(patch,{onConflict:'empresa_id'});if(error)throw error;return Response.json({ok:true},{headers:cors});
}catch(e){return Response.json({error:e instanceof Error?e.message:'Error interno'},{status:400,headers:cors});}});
