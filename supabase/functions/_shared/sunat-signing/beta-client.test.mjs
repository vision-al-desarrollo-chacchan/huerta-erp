import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { zipSync,strToU8 } from 'fflate';
import { parseBetaResponse, buildBetaFixture, sendBetaFixture } from './beta-client.mjs';
import { verifySunatXml } from './sign-xml.mjs';
const CBC='urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',CAC='urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';
function response({code='0',id='F001-1',notes='',extra=false}={}) {
 const cdr=`<ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2" xmlns:cbc="${CBC}" xmlns:cac="${CAC}">${notes}<cac:DocumentResponse><cac:Response><cbc:ReferenceID>${id}</cbc:ReferenceID><cbc:ResponseCode>${code}</cbc:ResponseCode><cbc:Description>Prueba</cbc:Description></cac:Response></cac:DocumentResponse></ApplicationResponse>`;
 const files={'cdr/':new Uint8Array(),'cdr/R-prueba.xml':strToU8(cdr)};if(extra)files['other.xml']=strToU8(cdr);
 return `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><ser:sendBillResponse xmlns:ser="http://service.sunat.gob.pe"><applicationResponse>${Buffer.from(zipSync(files)).toString('base64')}</applicationResponse></ser:sendBillResponse></soap:Body></soap:Envelope>`;
}
test('genera factura ficticia firmada sin exponer la clave privada',()=>{const f=buildBetaFixture();assert.equal(verifySunatXml(f.xml,f.certificatePem),true);assert.ok(!JSON.stringify(f).includes('PRIVATE KEY'));});
test('lee aceptación, observaciones y rechazo del CDR',()=>{assert.equal(parseBetaResponse(response()).status,'aceptado');assert.equal(parseBetaResponse(response({code:'2001'})).status,'rechazado');assert.equal(parseBetaResponse(response({notes:'<cbc:Note>Prueba</cbc:Note>'})).status,'observado');});
test('rechaza CDR ajeno, ZIP ambiguo y DTD',()=>{assert.throws(()=>parseBetaResponse(response({id:'F001-2'})));assert.throws(()=>parseBetaResponse(response({extra:true})));assert.throws(()=>parseBetaResponse('<!DOCTYPE x>'+response()));});
test('SOAP Fault se registra como rechazo beta',()=>{const xml='<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><s:Fault><faultcode>3030</faultcode><faultstring>Prueba</faultstring></s:Fault></s:Body></s:Envelope>';assert.equal(parseBetaResponse(xml).code,'3030');});
test('transporte fija beta, credenciales ficticias y bloqueo de redirecciones',async()=>{const f=buildBetaFixture();let calls=0;const result=await sendBetaFixture(f,async(url,options)=>{calls++;assert.equal(url,'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService');assert.equal(options.redirect,'error');assert.ok(options.body.includes('20123456789MODDATOS'));assert.ok(options.signal);return new Response(response());});assert.equal(calls,1);assert.equal(result.status,'aceptado');});
