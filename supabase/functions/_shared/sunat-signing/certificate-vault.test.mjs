import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import forge from 'node-forge';
import { buildBetaFixture } from './beta-client.mjs';
import { sealSunatCertificate,inspectStoredSunatCertificate,signSunatXmlWithStoredCertificate } from './certificate-vault.mjs';
import { verifySunatXml } from './sign-xml.mjs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const fixture=JSON.parse(execFileSync('python',[fileURLToPath(new URL('./test-fixtures.py',import.meta.url))],{encoding:'utf8'})).valid;
const password='PASSWORD-FICTICIO-VAULT';
const asn=forge.pkcs12.toPkcs12Asn1(forge.pki.privateKeyFromPem(fixture.privateKeyPem),[forge.pki.certificateFromPem(fixture.certificatePem)],password,{algorithm:'aes256',count:2048,useMac:true});
const input={pfxBase64:forge.util.encode64(forge.asn1.toDer(asn).getBytes()),password,empresaId:'11111111-1111-4111-8111-111111111111',issuerRuc:'20123456789',keyId:'v1',keyBase64:randomBytes(32).toString('base64')};
let sealed;
test('cifra PFX y contraseña y permite firma con descifrado interno',async()=>{
 sealed=await sealSunatCertificate(input);
 assert.ok(!sealed.envelope.includes(password));assert.ok(!sealed.envelope.includes(input.pfxBase64));
 const metadata=await inspectStoredSunatCertificate({...input,envelope:sealed.envelope});assert.equal(metadata.fingerprint256,sealed.metadata.fingerprint256);
 const f=await buildBetaFixture();const signed=await signSunatXmlWithStoredCertificate({...input,envelope:sealed.envelope,xml:f.xml.replace(/<ds:Signature\b[\s\S]*?<\/ds:Signature>/,'').replace(/<cac:Signature>[\s\S]*?<\/cac:Signature>/,'')});
 assert.equal(verifySunatXml(signed,fixture.certificatePem),true);
});
test('IV aleatorio: dos cifrados del mismo certificado son distintos',async()=>{const again=await sealSunatCertificate(input);assert.notEqual(again.envelope,sealed.envelope);});
test('no permite descifrar desde otra empresa, RUC, clave o versión',async()=>{
 for(const patch of [{empresaId:'22222222-2222-4222-8222-222222222222'},{issuerRuc:'20999999999'},{keyBase64:randomBytes(32).toString('base64')},{keyId:'v2'}])await assert.rejects(inspectStoredSunatCertificate({...input,...patch,envelope:sealed.envelope}));
});
test('detecta modificación del ciphertext y rechaza sobres mal formados',async()=>{
 const data=JSON.parse(sealed.envelope);data.ciphertext=(data.ciphertext[0]==='A'?'B':'A')+data.ciphertext.slice(1);
 for(const envelope of [JSON.stringify(data),'{}','not-json'])await assert.rejects(inspectStoredSunatCertificate({...input,envelope}));
});
test('rechaza clave maestra corta y no guarda PFX inválido',async()=>{
 await assert.rejects(sealSunatCertificate({...input,keyBase64:randomBytes(16).toString('base64')}));
 await assert.rejects(sealSunatCertificate({...input,password:'incorrecta'}));
});
