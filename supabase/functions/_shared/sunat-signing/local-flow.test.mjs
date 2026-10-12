/** Integración local: PostgreSQL PGlite real; Auth, Storage HTTP y SUNAT simulados. Sin red externa. */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { PGlite } from '@electric-sql/pglite';
import forge from 'node-forge';
import { zipSync, unzipSync, strToU8 } from 'fflate';
import { createCertificateHandler } from './certificate-handler.mjs';
import { createBetaHandler } from './beta-handler.mjs';
import { signSunatXmlWithStoredCertificate } from './certificate-vault.mjs';
import { verifySunatXml } from './sign-xml.mjs';
import { sendBetaFixture } from './beta-client.mjs';
import { buildSunatUblDraft } from '../../../../src/services/sunat/build-ubl-draft.ts';
const company='11111111-1111-4111-8111-111111111111';
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const staff='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const other='22222222-2222-4222-8222-222222222222';
const keyBase64=randomBytes(32).toString('base64');
const certificate=JSON.parse(execFileSync('python',[fileURLToPath(new URL('./test-fixtures.py',import.meta.url))],{encoding:'utf8'})).valid;
const password='LOCAL-FLOW-FICTITIOUS-PASSWORD';
const asn=forge.pkcs12.toPkcs12Asn1(forge.pki.privateKeyFromPem(certificate.privateKeyPem),[forge.pki.certificateFromPem(certificate.certificatePem)],password,{algorithm:'aes256',count:2048,useMac:true});
const pfxBase64=forge.util.encode64(forge.asn1.toDer(asn).getBytes());
const db=new PGlite();after(()=>db.close());
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table rest_empresas(id uuid primary key,ruc text,activa boolean default true);
create table rest_miembros(empresa_id uuid,user_id uuid,activo boolean,rol text);
create table ef_configuraciones(empresa_id uuid primary key,certificado_configurado boolean default false,certificado_nombre text,certificado_vence_at date,updated_at timestamptz,activo boolean default false);
create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,payload bytea,content_type text,unique(bucket_id,name));alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
grant usage on schema public,auth,storage to authenticated,anon,service_role;
grant select on rest_empresas,rest_miembros,storage.objects to authenticated;
grant select on rest_empresas,rest_miembros to service_role;
grant select,insert,update on ef_configuraciones to service_role;
grant all on storage.objects to service_role;
insert into auth.users values('${owner}'),('${staff}');
insert into rest_empresas values('${company}','20123456789',true),('${other}','20999999999',true);
insert into rest_miembros values('${company}','${owner}',true,'propietario'),('${company}','${staff}',true,'mozo');`);
for(const name of ['20261012170000_sunat_beta_pruebas.sql','20261012175041_sunat_certificate_vault.sql'])await db.exec(readFileSync(new URL('../../../migrations/'+name,import.meta.url),'utf8'));
const asRole=(role,user,fn)=>db.transaction(async tx=>{await tx.exec('set local role '+role);if(user)await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);return fn(tx);});
const service=fn=>asRole('service_role',null,fn);
const authenticate=async authorization=>authorization==='Bearer local-owner'?{userId:owner}:authorization==='Bearer local-staff'?{userId:staff}:null;
const request=(path,body,token='local-owner')=>new Request('https://local.invalid/'+path,{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(body)});
const upload=createCertificateHandler({enabled:true,keyBase64,authenticate,repository:{
 authorize:async(identity,id)=>service(async tx=>{const {rows}=await tx.query("select e.ruc,e.activa as activo from rest_empresas e join rest_miembros m on m.empresa_id=e.id where e.id=$1 and m.user_id=$2 and m.activo and m.rol in ('propietario','administrador')",[id,identity.userId]);if(rows.length!==1)throw new Error('denied');return rows[0];}),
 save:async(identity,id,data)=>service(tx=>tx.query('select ef_sunat_guardar_certificado($1,$2,$3,$4,$5,$6,$7,$8)',[id,identity.userId,data.ruc,data.nombre,data.envelope,data.keyId,data.metadata.validTo,data.metadata.fingerprint256])),
}});
const draft={issuerRuc:'20123456789',issuerName:'EMPRESA DE PRUEBA SAC',issuerAddress:'AV. PRUEBA',documentType:'01',series:'F001',number:1,issueDate:'2026-10-12',currency:'PEN',receiverDocumentType:'6',receiverDocumentNumber:'20654321098',receiverName:'CLIENTE FICTICIO',items:[{description:'PRODUCTO FICTICIO',quantity:1,unitPrice:11.8}]};
let networkCalls=0;
let transportMode='accepted';
let signedXml;
function soapResponse(){
 const cdr='<ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"><cac:DocumentResponse><cac:Response><cbc:ReferenceID>F001-1</cbc:ReferenceID><cbc:ResponseCode>0</cbc:ResponseCode><cbc:Description>ACEPTACION SIMULADA LOCAL</cbc:Description></cac:Response></cac:DocumentResponse></ApplicationResponse>';
 return '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><ser:sendBillResponse xmlns:ser="http://service.sunat.gob.pe"><applicationResponse>'+Buffer.from(zipSync({'R-prueba.xml':strToU8(cdr)})).toString('base64')+'</applicationResponse></ser:sendBillResponse></s:Body></s:Envelope>';
}
const beta=createBetaHandler({enabled:true,authenticate,repository:{
 reserve:async(identity,id,key)=>asRole('authenticated',identity.userId,async tx=>(await tx.query('select (ef_sunat_beta_reservar($1,$2)).*',[id,key])).rows[0]),
 claim:async job=>service(async tx=>(await tx.query("update ef_sunat_beta_pruebas set estado='enviando',started_at=now() where id=$1 and empresa_id=$2 and estado='pendiente' returning *",[job.id,job.empresa_id])).rows[0]??null),
 store:async(path,data,contentType)=>service(tx=>tx.query('insert into storage.objects(bucket_id,name,payload,content_type) values ($1,$2,$3,$4)',['sunat-beta-pruebas',path,data,contentType])),
 finish:async(job,patch)=>service(async tx=>{const current=(await tx.query('select * from ef_sunat_beta_pruebas where id=$1',[job.id])).rows[0];const merged={...current,...patch};const {rows}=await tx.query("update ef_sunat_beta_pruebas set estado=$1,codigo_sunat=$2,mensaje_sunat=$3,observaciones=$4,xml_path=$5,cdr_path=$6,finished_at=now() where id=$7 and empresa_id=$8 and estado='enviando' returning *",[merged.estado,merged.codigo_sunat,merged.mensaje_sunat,JSON.stringify(merged.observaciones),merged.xml_path,merged.cdr_path,job.id,job.empresa_id]);if(rows.length!==1)throw new Error('not saved');return rows[0];}),
},buildFixture:async()=>{
 const cert=(await service(tx=>tx.query('select * from ef_sunat_certificados where empresa_id=$1',[company]))).rows[0];
 const xml=await signSunatXmlWithStoredCertificate({xml:buildSunatUblDraft(draft),envelope:cert.envelope,empresaId:company,issuerRuc:cert.ruc,keyId:cert.key_id,keyBase64});
 verifySunatXml(xml,certificate.certificatePem);signedXml=xml;
 return {xml,fileName:'20123456789-01-F001-1.zip',zip:zipSync({'20123456789-01-F001-1.xml':strToU8(xml)})};
},sendFixture:fixture=>sendBetaFixture(fixture,async(url,options)=>{
 networkCalls++;assert.equal(url,'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService');assert.equal(options.redirect,'error');
 if(transportMode==='timeout')throw new Error('SIMULATED timeout');
 return new Response(soapResponse());
})});
const uploadBody={empresaId:company,fileName:'local.p12',pfxBase64,password};
const jobBody={empresaId:company,idempotencyKey:'33333333-3333-4333-8333-333333333333'};

test('carga incorrecta no deja certificado ni activa emisión',async()=>{
 assert.equal((await upload(request('certificate',{...uploadBody,password:'incorrecta'}))).status,400);
 assert.equal((await service(tx=>tx.query('select * from ef_sunat_certificados'))).rows.length,0);
});
test('flujo completo: carga cifrada, reserva SQL, firma, SOAP/CDR y persistencia',async()=>{
 const response=await upload(request('certificate',uploadBody));assert.equal(response.status,200);const text=await response.text();assert.ok(!text.includes(password));assert.ok(!text.includes(pfxBase64));
 const cert=(await service(tx=>tx.query('select * from ef_sunat_certificados where empresa_id=$1',[company]))).rows[0];assert.ok(!cert.envelope.includes(password));assert.ok(!cert.envelope.includes(pfxBase64));
 const {rows:[cfg]}=await service(tx=>tx.query('select * from ef_configuraciones'));assert.equal(cfg.activo,false);
 const replies=await Promise.all([beta(request('beta',jobBody)),beta(request('beta',jobBody))]);assert.ok(replies.every(r=>[200,202].includes(r.status)));assert.equal(networkCalls,1);
 const job=(await service(tx=>tx.query('select * from ef_sunat_beta_pruebas'))).rows[0];assert.equal(job.estado,'aceptado');assert.equal(job.codigo_sunat,'0');
 const artifacts=(await service(tx=>tx.query('select * from storage.objects'))).rows;assert.equal(artifacts.length,2);assert.ok(artifacts.every(a=>a.name.startsWith(company+'/'+job.id+'/')));
 const xmlArtifact=artifacts.find(a=>a.name.endsWith('documento.xml'));assert.equal(new TextDecoder().decode(xmlArtifact.payload),signedXml);
 const cdrArtifact=artifacts.find(a=>a.name.endsWith('cdr.zip'));assert.ok(Object.keys(unzipSync(cdrArtifact.payload)).includes('R-prueba.xml'));
 const repeated=await beta(request('beta',jobBody));assert.equal((await repeated.json()).duplicatePrevented,true);assert.equal(networkCalls,1);
 if(process.env.SUNAT_LOCAL_FLOW_OUTPUT){
  mkdirSync(process.env.SUNAT_LOCAL_FLOW_OUTPUT,{recursive:true});
  writeFileSync(process.env.SUNAT_LOCAL_FLOW_OUTPUT+'/factura.xml',signedXml);
  writeFileSync(process.env.SUNAT_LOCAL_FLOW_OUTPUT+'/certificate.pem',certificate.certificatePem);
 }
});
test('personal y otra empresa no pueden cargar certificado ni iniciar prueba',async()=>{
 assert.equal((await upload(request('certificate',uploadBody,'local-staff'))).status,403);
 assert.equal((await beta(request('beta',jobBody,'local-staff'))).status,403);
 assert.equal((await upload(request('certificate',{...uploadBody,empresaId:other}))).status,403);
 assert.equal((await beta(request('beta',{...jobBody,empresaId:other}))).status,403);
 assert.equal(networkCalls,1);
 const hidden=await asRole('authenticated',staff,tx=>tx.query('select * from storage.objects'));assert.equal(hidden.rows.length,0);
});
test('timeout de una nueva prueba queda incierto y repetición no reenvía',async()=>{
 // Adelantar solo el dato temporal del ensayo local para superar el límite de un minuto.
 await service(tx=>tx.query("update ef_sunat_beta_pruebas set created_at=now()-interval '2 minutes'"));transportMode='timeout';
 const second={...jobBody,idempotencyKey:'44444444-4444-4444-8444-444444444444'};
 const reply=await beta(request('beta',second));assert.equal(reply.status,502);assert.equal((await reply.json()).estado,'incierto');assert.equal(networkCalls,2);
 assert.equal((await (await beta(request('beta',second))).json()).duplicatePrevented,true);assert.equal(networkCalls,2);
});
