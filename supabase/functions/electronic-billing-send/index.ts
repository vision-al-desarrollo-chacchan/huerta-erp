import { createClient } from '@supabase/supabase-js';
import { createLiveHandler } from '../_shared/sunat-signing/live-handler.mjs';
import { sendSignedInvoice, consultInvoiceCdr, sendSignedReceiptSummary, consultReceiptTicket } from '../_shared/sunat-signing/live-transport.mjs';
import { signSunatXmlWithStoredCertificate } from '../_shared/sunat-signing/certificate-vault.mjs';
import { openSol } from '../_shared/sunat-signing/sol-vault.mjs';
import { backendSunatKey } from '../_shared/sunat-signing/backend-key.ts';
import { buildSunatUblDraft, type SunatUblDraft } from '../../../src/services/sunat/build-ubl-draft.ts';
import { buildReceiptSummary } from '../../../src/services/sunat/build-receipt-summary.ts';
const url = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
// Primera emisión real necesita piloto con empresa habilitada y validación tributaria.
const enabled = Deno.env.get('SUNAT_REAL_ISSUANCE_ENABLED') === 'true';
type Doc = { id:string;empresa_id:string;sucursal_id:string;pedido_id:string;tipo_documento:string;estado:string;serie:string;numero:number;total:number;receptor_documento:string;receptor_nombre:string;created_at:string;intentos:number;emisor_ruc?:string;cdr_path?:string;resumen_id?:string;ticket_sunat?:string };
type Prepared = {xml:string;ruc:string;credentials:{ruc:string;username:string;password:string};environment:string;authorized:boolean;series?:string;number?:number;summaryXml?:string;summaryId?:string};
const path = (doc:Doc,name:string) => `${doc.empresa_id}/${doc.id}/${name}`;
async function update(doc:Doc,patch:Record<string,unknown>){
 const {data,error}=await admin.from('ef_documentos').update({...patch,updated_at:new Date().toISOString()}).eq('id',doc.id).select('*').single();
 if(error)throw new Error('Guardado fiscal fallido.');return data;
}
Deno.serve(createLiveHandler({
 enabled,
 async authenticate(authorization:string){
  if(!authorization.startsWith('Bearer '))return null;
  const client=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
  const {data:{user},error}=await client.auth.getUser();return error||!user?null:{userId:user.id};
 },
 repository:{
  async authorize(identity:{userId:string},documentId:string){
   const {data:doc,error}=await admin.from('ef_documentos').select('*').eq('id',documentId).single();if(error||!doc)throw new Error();
   const {data:member,error:memberError}=await admin.from('rest_miembros').select('rol').eq('empresa_id',doc.empresa_id).eq('user_id',identity.userId).eq('activo',true).maybeSingle();
   if(memberError||!member||!['propietario','administrador','cajero','moza_cajera','supervisor'].includes(member.rol))throw new Error();return doc;
  },
  async claim(doc:Doc){
   const {data,error}=await admin.from('ef_documentos').update({estado:'enviando',intentos:doc.intentos+1,ultimo_intento_at:new Date().toISOString()}).eq('id',doc.id).in('estado',['pendiente','error']).is('transmision_iniciada_at',null).eq('intentos',doc.intentos).select('*').maybeSingle();
   if(error)throw new Error();return data;
  },
  async storeXml(doc:Doc,xml:string){
   const {error}=await admin.storage.from('sunat-comprobantes').upload(path(doc,'documento.xml'),new TextEncoder().encode(xml),{contentType:'application/xml',upsert:true});if(error)throw new Error();
   await update(doc,{xml_path:path(doc,'documento.xml')});
  },
  async markTransmission(doc:Doc){await update(doc,{transmision_iniciada_at:new Date().toISOString()});},
  async storeSummary(doc:Doc,xml:string){
   const {error}=await admin.storage.from('sunat-comprobantes').upload(path(doc,'resumen.xml'),new TextEncoder().encode(xml),{contentType:'application/xml',upsert:true});if(error)throw new Error();
   await update(doc,{resumen_xml_path:path(doc,'resumen.xml')});
  },
  async storeCdr(doc:Doc,cdr:Uint8Array){
   if(doc.cdr_path)return;
   const {error}=await admin.storage.from('sunat-comprobantes').upload(path(doc,'cdr.zip'),cdr,{contentType:'application/zip',upsert:true});if(error)throw new Error();
   await update(doc,{cdr_path:path(doc,'cdr.zip')});
  },
  async finish(doc:Doc,result:{status:string;code?:string;message:string;ticket?:string}){
   return await update(doc,{estado:result.status,codigo_sunat:result.code??null,mensaje_sunat:result.message,proximo_reintento_at:null,...(result.ticket?{ticket_sunat:result.ticket}:{})});
  },
  async consult(doc:Doc){
   if(!['factura','boleta'].includes(doc.tipo_documento)||!doc.emisor_ruc)throw new Error();
   const {data:sol,error}=await admin.from('ef_sunat_sol').select('ruc,envelope,key_id').eq('empresa_id',doc.empresa_id).single();
   if(error||sol.ruc!==doc.emisor_ruc)throw new Error();
   const credentials=await openSol({envelope:sol.envelope,empresaId:doc.empresa_id,ruc:sol.ruc,keyId:sol.key_id,keyBase64:await backendSunatKey(admin)});
   if(doc.tipo_documento==='boleta')return consultReceiptTicket({ticket:doc.ticket_sunat,summaryId:doc.resumen_id,credentials,environment:'production',authorized:enabled});
   return consultInvoiceCdr({ruc:doc.emisor_ruc,series:doc.serie,number:Number(doc.numero),credentials,authorized:enabled});
  },
 },
 async prepare(doc:Doc){
  if(!['factura','boleta'].includes(doc.tipo_documento))throw new Error('Tipo de documento no implementado.');
  const [{data:company,error:ce},{data:cfg,error:fe},{data:certificate,error:ke},{data:sol,error:se},{data:order,error:oe},{data:items,error:ie}] = await Promise.all([
   admin.from('rest_empresas').select('ruc,nombre,direccion,activa').eq('id',doc.empresa_id).single(),
   admin.from('ef_configuraciones').select('activo,ambiente,proveedor').eq('empresa_id',doc.empresa_id).single(),
   admin.from('ef_sunat_certificados').select('ruc,envelope,key_id').eq('empresa_id',doc.empresa_id).single(),
   admin.from('ef_sunat_sol').select('ruc,envelope,key_id').eq('empresa_id',doc.empresa_id).single(),
   admin.from('rest_pedidos').select('empresa_id,sucursal_id,estado,total').eq('id',doc.pedido_id).single(),
   admin.from('rest_pedido_items').select('nombre,cantidad,precio_unitario').eq('pedido_id',doc.pedido_id),
  ]);
  if(ce||fe||ke||se||oe||ie||!company?.activa||!cfg?.activo||cfg.proveedor!=='sunat'||cfg.ambiente!=='produccion'||certificate?.ruc!==company.ruc||sol?.ruc!==company.ruc||order?.empresa_id!==doc.empresa_id||order?.sucursal_id!==doc.sucursal_id||order?.estado==='anulado'||!items?.length)throw new Error('Configuración incompleta.');
  const total=items.reduce((sum,item)=>sum+Math.round(Number(item.cantidad)*Number(item.precio_unitario)*100),0);
  if(total!==Math.round(Number(doc.total)*100)||total!==Math.round(Number(order.total)*100))throw new Error('Los montos no coinciden.');
  const receiver=doc.receptor_documento??'';
  const receiverType=doc.tipo_documento==='factura'||/^\d{11}$/.test(receiver)?'6':/^\d{8}$/.test(receiver)?'1':'0';
  if(doc.tipo_documento==='boleta'&&receiverType==='0'&&Number(doc.total)>700)throw new Error('Falta identificación del cliente.');
  const draft:SunatUblDraft={issuerRuc:company.ruc,issuerName:company.nombre,issuerAddress:company.direccion,documentType:doc.tipo_documento==='factura'?'01':'03',series:doc.serie,number:Number(doc.numero),issueDate:new Date(new Date(doc.created_at).getTime()-5*60*60*1000).toISOString().slice(0,10),currency:'PEN',receiverDocumentType:receiverType,receiverDocumentNumber:receiver,receiverName:doc.receptor_nombre||'PUBLICO GENERAL',paymentMode:'Contado',items:items.map(item=>({description:item.nombre,quantity:Number(item.cantidad),unitPrice:Number(item.precio_unitario)}))};
  const today=new Date(Date.now()-5*60*60*1000).toISOString().slice(0,10);
  const age=(Date.parse(today)-Date.parse(draft.issueDate))/86400000;
  if(age<0||age>(doc.tipo_documento==='factura'?3:7))throw new Error('Documento fuera del plazo de envío admitido.');
  const keyBase64=await backendSunatKey(admin);
  const xml=await signSunatXmlWithStoredCertificate({xml:buildSunatUblDraft(draft),envelope:certificate.envelope,empresaId:doc.empresa_id,issuerRuc:company.ruc,keyId:certificate.key_id,keyBase64});
  const credentials=await openSol({envelope:sol.envelope,empresaId:doc.empresa_id,ruc:company.ruc,keyId:sol.key_id,keyBase64});
  await update(doc,{borrador_snapshot:draft,emisor_ruc:company.ruc,ambiente_envio:'produccion'});
  if(doc.tipo_documento==='boleta'){
   const issueDate=new Date(Date.now()-5*60*60*1000).toISOString().slice(0,10);
   const {data:summaryId,error}=await admin.rpc('ef_sunat_reservar_resumen',{p_documento_id:doc.id,p_fecha:issueDate});if(error||typeof summaryId!=='string')throw new Error();
   const summaryXml=await signSunatXmlWithStoredCertificate({xml:buildReceiptSummary(draft,summaryId,issueDate),envelope:certificate.envelope,empresaId:doc.empresa_id,issuerRuc:company.ruc,keyId:certificate.key_id,keyBase64});
   return {xml,summaryXml,summaryId,ruc:company.ruc,credentials,environment:'production',authorized:true};
  }
  return {xml,ruc:company.ruc,series:doc.serie,number:Number(doc.numero),credentials,environment:'production',authorized:true};
 },
 send: async (prepared:Prepared) => prepared.summaryXml ? sendSignedReceiptSummary({...prepared,xml:prepared.summaryXml,summaryId:prepared.summaryId!}) : sendSignedInvoice({...prepared,series:prepared.series!,number:prepared.number!}),
}));
