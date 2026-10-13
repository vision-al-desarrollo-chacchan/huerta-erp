import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { sealSol, openSol } from './sol-vault.mjs';
import { createLiveHandler } from './live-handler.mjs';
import { sendSignedInvoice, consultInvoiceCdr } from './live-transport.mjs';
import { buildBetaFixture } from './beta-client.mjs';
import { zipSync, strToU8 } from 'fflate';
const company='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
test('SOL cifrado: contexto por empresa/RUC, clave distinta y ciphertext alterado rechazados',async()=>{
 const input={empresaId:company,ruc:'20123456789',keyBase64:randomBytes(32).toString('base64'),username:'USUARIO',password:'secreto<&>'};
 const envelope=await sealSol(input);assert.ok(!envelope.includes(input.password));assert.ok(!envelope.includes(input.username));
 const opened=await openSol({...input,envelope});assert.equal(opened.password,input.password);
 assert.notEqual(envelope,await sealSol(input));
 await assert.rejects(openSol({...input,envelope,empresaId:id}));
 await assert.rejects(openSol({...input,envelope,ruc:'20999999999'}));
 await assert.rejects(openSol({...input,envelope,keyBase64:randomBytes(32).toString('base64')}));
 const changed=JSON.parse(envelope);changed.ciphertext=(changed.ciphertext[0]==='A'?'B':'A')+changed.ciphertext.slice(1);
 await assert.rejects(openSol({...input,envelope:JSON.stringify(changed)}));
});
function harness({enabled=true,authorized=true,identity=true,prepareFails=false,timeout=false,storageFails=false}={}) {
 let doc={id,estado:'pendiente',intentos:0};let calls=0,marked=false;
 const repository={
  authorize:async()=>{if(!authorized)throw new Error();return {...doc};},
  claim:async()=>{if(doc.estado!=='pendiente'&&doc.estado!=='error')return null;doc={...doc,estado:'enviando',intentos:doc.intentos+1};return {...doc};},
  storeXml:async()=>{if(storageFails)throw new Error();},
  markTransmission:async()=>{marked=true;doc.transmision_iniciada_at='now';},
  storeCdr:async()=>{},
  finish:async(_doc,result)=>{doc={...doc,estado:result.status};return {...doc};},
 };
 const handler=createLiveHandler({enabled,authenticate:async()=>identity?{userId:'user'}:null,repository,prepare:async()=>{if(prepareFails)throw new Error();return {xml:'signed'};},send:async()=>{assert.ok(marked);calls++;if(timeout)throw new Error();return {status:'aceptado',code:'0',message:'Aceptado',cdr:new Uint8Array([1])};}});
 const request=()=>handler(new Request('https://local.test',{method:'POST',body:JSON.stringify({documentId:id})}));
 return {request,calls:()=>calls,doc:()=>doc};
}
test('sesión, empresa y bloqueo producción impiden enviar',async()=>{
 for(const options of [{identity:false},{authorized:false},{enabled:false}]){const h=harness(options);const r=await h.request();assert.ok(r.status>=400);assert.equal(h.calls(),0);}
});
test('concurrencia y repetición posterior realizan un solo envío',async()=>{
 const h=harness();await Promise.all([h.request(),h.request()]);await h.request();assert.equal(h.calls(),1);assert.equal(h.doc().estado,'aceptado');
});
test('timeout queda incierto y no permite repetir',async()=>{
 const h=harness({timeout:true});assert.equal((await h.request()).status,502);await h.request();assert.equal(h.calls(),1);assert.equal(h.doc().estado,'incierto');
});
test('fallos de preparación o XML no realizan envío',async()=>{
 for(const options of [{prepareFails:true},{storageFails:true}]){const h=harness(options);await h.request();assert.equal(h.calls(),0);assert.equal(h.doc().estado,'error');}
});
const cdr=()=>{
 const xml='<ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"><cac:DocumentResponse><cac:Response><cbc:ReferenceID>F001-1</cbc:ReferenceID><cbc:ResponseCode>0</cbc:ResponseCode><cbc:Description>Aceptado</cbc:Description></cac:Response></cac:DocumentResponse></ApplicationResponse>';
 const base64=Buffer.from(zipSync({'R-test.xml':strToU8(xml)})).toString('base64');
 return `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><r:sendBillResponse xmlns:r="http://service.sunat.gob.pe"><applicationResponse>${base64}</applicationResponse></r:sendBillResponse></s:Body></s:Envelope>`;
};
test('factura firmada construye ZIP/SOAP y lee CDR; producción bloqueada sin autorización',async()=>{
 const fixture=await buildBetaFixture();const input={xml:fixture.xml,ruc:'20123456789',series:'F001',number:1,credentials:{ruc:'20123456789',username:'MODDATOS',password:'MODDATOS'},environment:'beta'};
 let called=0;const fetchMock=async(url,options)=>{called++;assert.ok(url.includes('e-beta'));assert.equal(options.redirect,'error');assert.ok(options.body.includes('20123456789MODDATOS'));assert.ok(options.body.includes('20123456789-01-F001-1.zip'));return new Response(cdr());};
 assert.equal((await sendSignedInvoice(input,fetchMock)).status,'aceptado');
 await assert.rejects(sendSignedInvoice({...input,environment:'production'},fetchMock));assert.equal(called,1);
 await assert.rejects(sendSignedInvoice({...input,series:'B001'},fetchMock));
 await assert.rejects(sendSignedInvoice({...input,credentials:{...input.credentials,ruc:'20999999999'}},fetchMock));
});
test('consulta CDR usa getStatusCdr sin reenviar y valida documento esperado',async()=>{
 const input={ruc:'20123456789',series:'F001',number:1,credentials:{ruc:'20123456789',username:'MODDATOS',password:'MODDATOS'},authorized:true};
 const content=cdr().match(/<applicationResponse>(.*?)<\/applicationResponse>/)[1];
 const response=value=>new Response(`<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><r:getStatusCdrResponse xmlns:r="http://service.sunat.gob.pe"><statusCdr><content>${value}</content></statusCdr></r:getStatusCdrResponse></s:Body></s:Envelope>`);
 const mock=async(url,options)=>{assert.ok(url.endsWith('billConsultService'));assert.ok(options.body.includes('getStatusCdr'));assert.ok(!options.body.includes('sendBill'));return response(content);};
 assert.equal((await consultInvoiceCdr(input,mock)).status,'aceptado');
 assert.equal((await consultInvoiceCdr(input,async()=>response(''))).status,'incierto');
 await assert.rejects(consultInvoiceCdr({...input,number:2},mock));
 await assert.rejects(consultInvoiceCdr({...input,authorized:false},mock));
});
