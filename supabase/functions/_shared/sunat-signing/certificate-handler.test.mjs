import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCertificateHandler } from './certificate-handler.mjs';
const empresaId='11111111-1111-4111-8111-111111111111';
const body={empresaId,pfxBase64:'PRIVATE-FIXTURE',password:'SECRET-FIXTURE',fileName:'certificado.p12'};
const req=(data=body)=>new Request('https://local.invalid',{method:'POST',headers:{Authorization:'Bearer demo'},body:JSON.stringify(data)});
function setup(overrides={}){let saves=0,seals=0;let saved;
 const repository={authorize:async()=>({ruc:'20123456789',activo:true}),save:async(identity,company,data)=>{saves++;saved={company,data};}};
 const handler=createCertificateHandler({enabled:true,keyBase64:'demo',authenticate:async()=>({userId:'demo'}),repository,seal:async(input)=>{seals++;assert.equal(input.issuerRuc,'20123456789');return{envelope:'CIPHERTEXT-FIXTURE',metadata:{issuerRuc:input.issuerRuc,fingerprint256:'public'}};},...overrides});
 return{handler,repository,saves:()=>saves,seals:()=>seals,saved:()=>saved};}
test('deshabilitado y sin sesión no descifran ni guardan',async()=>{for(const [options,status] of [[{enabled:false},503],[{authenticate:async()=>null},401]]){const s=setup(options);assert.equal((await s.handler(req())).status,status);assert.equal(s.saves(),0);assert.equal(s.seals(),0);}});
test('permiso de empresa se comprueba antes de procesar el certificado',async()=>{const s=setup();s.repository.authorize=async()=>{throw new Error('denied');};assert.equal((await s.handler(req())).status,403);assert.equal(s.seals(),0);});
test('rechaza RUC enviado por navegador y rutas en nombre de archivo',async()=>{for(const data of [{...body,issuerRuc:'20999999999'},{...body,fileName:'../certificado.p12'},{...body,fileName:'certificado.exe'}]){const s=setup();assert.equal((await s.handler(req(data))).status,400);assert.equal(s.saves(),0);}});
test('solo persiste ciphertext y responde metadatos públicos sin secretos',async()=>{const s=setup();const response=await s.handler(req());assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');const text=await response.text();for(const secret of [body.password,body.pfxBase64,'CIPHERTEXT-FIXTURE'])assert.ok(!text.includes(secret));const saved=JSON.stringify(s.saved());assert.ok(!saved.includes(body.password));assert.ok(!saved.includes(body.pfxBase64));assert.equal(s.saves(),1);});
test('validación fallida no guarda y errores internos no se exponen',async()=>{const s=setup({seal:async()=>{throw new Error('SECRET-INTERNAL');}});const response=await s.handler(req());assert.equal(response.status,400);assert.ok(!(await response.text()).includes('SECRET-INTERNAL'));assert.equal(s.saves(),0);});
test('fallo de guardado devuelve error sin afirmar certificado configurado',async()=>{const s=setup();s.repository.save=async()=>{throw new Error('SECRET-INTERNAL');};const response=await s.handler(req());assert.equal(response.status,503);const text=await response.text();assert.ok(!text.includes('SECRET-INTERNAL'));assert.ok(!text.includes('certificadoConfigurado'));});
