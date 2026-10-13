import { verifyWorkerRequest } from '../_shared/sunat-signing/worker-auth.mjs';
import { admin, enabled, createBillingHandler } from '../_shared/sunat-signing/billing-runtime.ts';
import { processQueueBatch } from '../_shared/sunat-signing/queue-worker.mjs';
// Endpoint interno: secreto dedicado de Vault, nunca credenciales de un usuario.
Deno.serve(async req => {
 if(req.method!=='POST')return new Response(null,{status:405});
 try {
  const valid=await verifyWorkerRequest(req,async()=>{
   const {data,error}=await admin.rpc('ef_sunat_worker_key');if(error||typeof data!=='string')throw new Error();return data;
  },async(nonce:string,timestamp:number)=>{
   const {data,error}=await admin.rpc('ef_sunat_consumir_nonce',{p_nonce:nonce,p_timestamp:timestamp});if(error)throw new Error();return data===true;
  });
  if(!valid)return new Response(null,{status:401});
 }catch{return new Response(null,{status:503});}
 if(!enabled)return Response.json({paused:true});
 const work = async () => {
  await processQueueBatch({
   claim:async()=>{const {data,error}=await admin.rpc('ef_sunat_tomar_trabajos');if(error)throw new Error();return data??[];},
   run:async(job:{documento_id:string;usuario_id:string;accion:string})=>{
    const handler=createBillingHandler(async()=>({userId:job.usuario_id}));
    return handler(new Request('https://internal.local',{method:'POST',body:JSON.stringify({documentId:job.documento_id,...(job.accion==='consultar'?{action:'consultar'}:{})})}));
   },
   finish:async(job:{documento_id:string;lease_token:string},state:string)=>{
    const {error}=await admin.rpc('ef_sunat_finalizar_trabajo',{p_documento_id:job.documento_id,p_lease_token:job.lease_token,p_estado:state});if(error)throw new Error();
   },
  });
 };
 EdgeRuntime.waitUntil(work().catch(() => { /* La lease durable permite recuperar una caída sin reenviar. */ }));
 return Response.json({scheduled:true}, {status:202});
});
