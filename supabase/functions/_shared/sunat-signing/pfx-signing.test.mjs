import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import forge from 'node-forge';
import { inspectSunatPfx, signSunatXmlWithPfx } from './pfx-signing.mjs';
import { verifySunatXml } from './sign-xml.mjs';
import { buildSunatUblDraft } from '../../../../src/services/sunat/build-ubl-draft.ts';
const fixtures = JSON.parse(execFileSync('python', [fileURLToPath(new URL('./test-fixtures.py', import.meta.url))], { encoding: 'utf8' }));
const password = 'CLAVE-FICTICIA-UNICA';
function encode(credentials=fixtures.valid, options={}) {
  const key=credentials?.privateKeyPem ? forge.pki.privateKeyFromPem(credentials.privateKeyPem) : null;
  const cert=forge.pki.certificateFromPem(credentials.certificatePem);
  const asn=forge.pkcs12.toPkcs12Asn1(key,[cert],password,{algorithm:'aes256',count:2048,useMac:true,...options});
  return forge.util.encode64(forge.asn1.toDer(asn).getBytes());
}
const input={pfxBase64:encode(),password,issuerRuc:'20123456789'};
const xml=buildSunatUblDraft({issuerRuc:input.issuerRuc,issuerName:'EMPRESA FICTICIA',issuerAddress:'AV. PRUEBA',documentType:'01',series:'F001',number:1,issueDate:'2026-10-12',currency:'PEN',receiverDocumentType:'6',receiverDocumentNumber:'20654321098',receiverName:'CLIENTE FICTICIO',items:[{description:'Prueba',quantity:1,unitPrice:11.8}]});
test('PFX cifrado: inspección pública y firma verificada',()=>{
 const info=inspectSunatPfx(input);assert.equal(info.issuerRuc,input.issuerRuc);assert.equal(info.keyBits,2048);assert.ok(!JSON.stringify(info).includes(password));assert.ok(!JSON.stringify(info).includes('PRIVATE KEY'));
 const signed=signSunatXmlWithPfx({xml,...input});assert.equal(verifySunatXml(signed,fixtures.valid.certificatePem),true);
});
test('contraseña equivocada y archivo corrupto se rechazan sin filtrar secretos',()=>{
 for(const candidate of [{...input,password:'CLAVE-ERRONEA'},{...input,pfxBase64:input.pfxBase64.slice(0,-8)+'AAAAAAAA'}]){assert.throws(()=>inspectSunatPfx(candidate),error=>!error.message.includes(candidate.password)&&!error.message.includes(candidate.pfxBase64));}
});
test('rechaza RUC distinto y XML de otro emisor',()=>{
 assert.throws(()=>inspectSunatPfx({...input,issuerRuc:'20999999999'}));
 assert.throws(()=>signSunatXmlWithPfx({...input,xml:xml.replaceAll('20123456789','20999999999')}));
});
test('rechaza certificado vencido, futuro o RSA débil',()=>{
 for(const name of ['expired','future','weak'])assert.throws(()=>inspectSunatPfx({...input,pfxBase64:encode(fixtures[name])}));
});
test('rechaza PFX sin clave, clave sin certificado coincidente y contenedor sin MAC',()=>{
 assert.throws(()=>inspectSunatPfx({...input,pfxBase64:encode({certificatePem:fixtures.valid.certificatePem})}));
 assert.throws(()=>inspectSunatPfx({...input,pfxBase64:encode({...fixtures.valid,certificatePem:fixtures.other.certificatePem})}));
 assert.throws(()=>inspectSunatPfx({...input,pfxBase64:encode(fixtures.valid,{useMac:false})}));
});
test('rechaza base64 inválido, tamaño excesivo y contraseña no textual',()=>{
 for(const candidate of [{...input,pfxBase64:'invalid'},{...input,pfxBase64:'A'.repeat(2_800_004)},{...input,password:null}])assert.throws(()=>inspectSunatPfx(candidate));
});
