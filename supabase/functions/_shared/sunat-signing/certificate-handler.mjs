/** Carga autenticada con cuerpo limitado y RUC obtenido exclusivamente del servidor. */
import { sealSunatCertificate } from './certificate-vault.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(body,status=200)=>Response.json(body,{status,headers:{...cors,'Cache-Control':'no-store'}});
async function read(req) {
  if(!req.body)throw new Error();
  const reader=req.body.getReader(),chunks=[];let size=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2_900_000)throw new Error();chunks.push(value);}}
  finally {await reader.cancel();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try {return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  finally {bytes.fill(0);for(const chunk of chunks)chunk.fill(0);}
}
export function createCertificateHandler({enabled,authenticate,repository,keyBase64,keyId='v1',seal=sealSunatCertificate}) {
 return async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return reply({error:'Método no admitido.'},405);
  if(!enabled)return reply({error:'Carga de certificados SUNAT deshabilitada.'},503);
  let identity;
  try {identity=await authenticate(req.headers.get('Authorization')??'');}catch{return reply({error:'Sesión inválida.'},401);}
  if(!identity)return reply({error:'Sesión inválida.'},401);
  let body;
  try {
   body=await read(req);
   if(!body||Object.keys(body).some(k=>!['empresaId','pfxBase64','password','fileName'].includes(k))||!UUID.test(body.empresaId)||typeof body.fileName!=='string'||body.fileName.length>120||! /^[\p{L}\p{N} _.-]+\.(pfx|p12)$/iu.test(body.fileName)||body.fileName.includes('..'))throw new Error();
  }catch{return reply({error:'Solicitud de certificado inválida.'},400);}
  let company;
  try {company=await repository.authorize(identity,body.empresaId);if(!company?.activo||!/^\d{11}$/.test(company.ruc))throw new Error();}
  catch{return reply({error:'Se requiere administrador activo y RUC configurado en esta empresa.'},403);}
  let sealed;
  try {sealed=await seal({pfxBase64:body.pfxBase64,password:body.password,empresaId:body.empresaId,issuerRuc:company.ruc,keyBase64,keyId});}
  catch{return reply({error:'No se pudo validar o cifrar el certificado. Revisa archivo, contraseña, vigencia y RUC.'},400);}
  try {
   await repository.save(identity,body.empresaId,{ruc:company.ruc,nombre:body.fileName,envelope:sealed.envelope,keyId,metadata:sealed.metadata});
  }catch{return reply({error:'No se pudo guardar el certificado. Comprueba permisos y vuelve a consultar su estado.'},503);}
  return reply({ok:true,empresaId:body.empresaId,nombre:body.fileName,certificadoConfigurado:true,metadata:sealed.metadata});
 };
}
