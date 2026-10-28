import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { zipSync, strToU8 } from 'fflate';
import { buildReceiptSummary } from '../../../../src/services/sunat/build-receipt-summary.ts';
import { signSunatXml, verifySunatXml } from './sign-xml.mjs';
import { sendSignedReceiptSummary, consultReceiptTicket } from './live-transport.mjs';
const fixture=JSON.parse(execFileSync('python',[fileURLToPath(new URL('./test-fixtures.py',import.meta.url))],{encoding:'utf8'})).valid;
const draft={issuerRuc:'20123456789',issuerName:'EMPRESA FICTICIA',issuerAddress:'AV. PRUEBA',documentType:'03',series:'B001',number:1,issueDate:'2026-10-13',currency:'PEN',receiverDocumentType:'1',receiverDocumentNumber:'12345678',receiverName:'CLIENTE FICTICIO',items:[{description:'Producto ficticio',quantity:1,unitPrice:11.8}]};
const summaryId='RC-20261013-1';
let xml;
test('resumen diario de boleta firmado y alteraciones rechazadas',()=>{
 xml=signSunatXml({xml:buildReceiptSummary(draft,summaryId,'2026-10-13'),...fixture});
 assert.equal(verifySunatXml(xml,fixture.certificatePem),true);
 assert.match(xml, /<cac:TaxCategory><cbc:Percent>18\.00<\/cbc:Percent><cac:TaxScheme>/);
 assert.throws(()=>verifySunatXml(xml.replace('11.80','12.80'),fixture.certificatePem));
 assert.throws(()=>buildReceiptSummary({...draft,documentType:'01',series:'F001'},summaryId,'2026-10-13'));
 assert.throws(()=>buildReceiptSummary(draft,'RC-20261013-0','2026-10-13'));
 if(process.env.SUNAT_SUMMARY_OUTPUT){writeFileSync(process.env.SUNAT_SUMMARY_OUTPUT,xml);}
});
const response=(method,body)=>new Response(`<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><r:${method}Response xmlns:r="http://service.sunat.gob.pe">${body}</r:${method}Response></s:Body></s:Envelope>`);
const credentials={ruc:'20123456789',username:'MODDATOS',password:'MODDATOS'};
test('envío resumen devuelve ticket sin afirmar aceptación; producción requiere autorización',async()=>{
 const input={xml,ruc:credentials.ruc,summaryId,credentials,environment:'beta'};
 const result=await sendSignedReceiptSummary(input,async(url,options)=>{assert.ok(url.includes('e-beta'));assert.ok(options.body.includes('sendSummary'));assert.ok(!options.body.includes('sendBill'));assert.equal(options.redirect,'error');return response('sendSummary','<ticket>123456789</ticket>');});
 assert.equal(result.status,'enviando');assert.equal(result.ticket,'123456789');
 await assert.rejects(sendSignedReceiptSummary({...input,environment:'production'},async()=>{throw new Error('No debe llamar');}));
});
test('ticket en proceso y CDR de resumen aceptado/rechazado/ajeno',async()=>{
 const input={ticket:'123456789',summaryId,credentials,environment:'beta'};
 const result=await consultReceiptTicket(input,async(_url,options)=>{assert.ok(options.body.includes('getStatus'));assert.ok(!options.body.includes('sendSummary'));return response('getStatus','<status><statusCode>98</statusCode></status>');});
 assert.equal(result.status,'enviando');
 const cdr=(id,code)=>Buffer.from(zipSync({'R-resumen.xml':strToU8(`<ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"><cac:DocumentResponse><cac:Response><cbc:ReferenceID>${id}</cbc:ReferenceID><cbc:ResponseCode>${code}</cbc:ResponseCode><cbc:Description>Prueba ficticia</cbc:Description></cac:Response></cac:DocumentResponse></ApplicationResponse>`)})).toString('base64');
 for(const code of ['0','2001'])assert.equal((await consultReceiptTicket(input,async()=>response('getStatus',`<status><statusCode>0</statusCode><content>${cdr(summaryId,code)}</content></status>`))).status,code==='0'?'aceptado':'rechazado');
 await assert.rejects(consultReceiptTicket(input,async()=>response('getStatus',`<status><statusCode>0</statusCode><content>${cdr('RC-20261013-2','0')}</content></status>`)));
});

test('rechazo explícito 2992 se conserva como rechazo sin ticket; fallo servidor permanece incierto',async()=>{
 const input={xml,ruc:credentials.ruc,summaryId,credentials,environment:'beta'};
 const fault=(code,status=200)=>new Response(`<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><s:Fault><faultcode>${code}</faultcode><faultstring>Tasa faltante</faultstring></s:Fault></s:Body></s:Envelope>`,{status});
 for(const status of [200,500]){
  const result=await sendSignedReceiptSummary(input,async()=>fault('soap-env:Client.2992',status));
  assert.equal(result.status,'rechazado');assert.equal(result.code,'2992');assert.equal(result.ticket,undefined);
 }
 await assert.rejects(sendSignedReceiptSummary(input,async()=>fault('s:Server.0100',500)));
 await assert.rejects(sendSignedReceiptSummary(input,async()=>{throw new Error('timeout');}));
});
