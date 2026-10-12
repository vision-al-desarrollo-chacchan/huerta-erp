/** Exclusivo del backend. AES-256-GCM con clave dedicada y asociación empresa/RUC. */
import { Buffer } from 'node:buffer';
import { inspectSunatPfx, signSunatXmlWithPfx } from './pfx-signing.mjs';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const encoder = new TextEncoder();
function context({empresaId,issuerRuc,keyId}) {
  if (!UUID.test(empresaId) || !/^\d{11}$/.test(issuerRuc) || !/^[A-Za-z0-9_-]{1,40}$/.test(keyId)) throw new Error('Contexto de certificado inválido.');
  return encoder.encode(JSON.stringify({purpose:'huerta-sunat-certificate',version:1,empresaId:empresaId.toLowerCase(),issuerRuc,keyId}));
}
function decode(value, max) {
  if (typeof value!=='string' || value.length>max || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error('Datos cifrados inválidos.');
  const bytes = Buffer.from(value,'base64');
  if(bytes.toString('base64')!==value) throw new Error('Datos cifrados inválidos.');
  return bytes;
}
async function key(source, usages) {
  const bytes=decode(source,44);
  try {if(bytes.length!==32)throw new Error('Clave de cifrado debe contener 32 bytes.');return await crypto.subtle.importKey('raw',bytes,'AES-GCM',false,usages);}
  finally {bytes.fill(0);}
}
export async function sealSunatCertificate({pfxBase64,password,empresaId,issuerRuc,keyId='v1',keyBase64}) {
  const associatedData=context({empresaId,issuerRuc,keyId});
  const metadata=inspectSunatPfx({pfxBase64,password,issuerRuc});
  const cryptoKey=await key(keyBase64,['encrypt']);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const plaintext=encoder.encode(JSON.stringify({pfxBase64,password}));
  try {
    const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:associatedData,tagLength:128},cryptoKey,plaintext);
    return { envelope:JSON.stringify({version:1,algorithm:'AES-256-GCM',keyId,iv:Buffer.from(iv).toString('base64'),ciphertext:Buffer.from(ciphertext).toString('base64')}),metadata };
  } finally {plaintext.fill(0);}
}
async function openSunatCertificate({envelope,empresaId,issuerRuc,keyId='v1',keyBase64}) {
  let plaintext;
  try {
    if(typeof envelope!=='string'||envelope.length>4_000_000)throw new Error();
    const data=JSON.parse(envelope);
    if(data.version!==1||data.algorithm!=='AES-256-GCM'||data.keyId!==keyId)throw new Error();
    const iv=decode(data.iv,16),ciphertext=decode(data.ciphertext,3_800_000);
    if(iv.length!==12||ciphertext.length<16)throw new Error();
    plaintext=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:context({empresaId,issuerRuc,keyId}),tagLength:128},await key(keyBase64,['decrypt']),ciphertext));
    const payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(plaintext));
    if(Object.keys(payload).sort().join(',')!=='password,pfxBase64')throw new Error();
    return payload;
  } catch {throw new Error('No se pudo abrir el certificado cifrado de esta empresa.');}
  finally {plaintext?.fill(0);}
}
/** Nunca devuelve el contenedor descifrado ni la contraseña al cliente. */
export async function inspectStoredSunatCertificate(input) {
  const payload=await openSunatCertificate(input);
  return inspectSunatPfx({...payload,issuerRuc:input.issuerRuc});
}
export async function signSunatXmlWithStoredCertificate({xml,...input}) {
  const payload=await openSunatCertificate(input);
  return signSunatXmlWithPfx({xml,...payload,issuerRuc:input.issuerRuc});
}
