/** Credenciales SOL: clave dedicada y contexto autenticado por empresa/RUC. */
import { Buffer } from 'node:buffer';
const encoder = new TextEncoder();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function context({ empresaId, ruc, keyId = 'v1' }) {
  if (!UUID.test(empresaId) || !/^\d{11}$/.test(ruc) || keyId !== 'v1') throw new Error('Contexto SOL inválido.');
  return encoder.encode(JSON.stringify({ purpose: 'huerta-sunat-sol', version: 1, empresaId: empresaId.toLowerCase(), ruc, keyId }));
}
async function key(value, usage) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new Error('Clave dedicada inválida.');
  const bytes = Buffer.from(value, 'base64');
  try { if (bytes.length !== 32) throw new Error(); return await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, [usage]); }
  finally { bytes.fill(0); }
}
export async function sealSol({ username, password, keyBase64, ...identity }) {
  if (typeof username !== 'string' || !/^[A-Za-z0-9]{1,30}$/.test(username) || typeof password !== 'string' || !password || password.length > 1024) throw new Error('Usuario o clave SOL inválidos.');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const raw = encoder.encode(JSON.stringify({ username, password }));
  try {
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: context(identity) }, await key(keyBase64, 'encrypt'), raw);
    return JSON.stringify({ version: 1, iv: Buffer.from(iv).toString('base64'), ciphertext: Buffer.from(encrypted).toString('base64') });
  } finally { raw.fill(0); }
}
export async function openSol({ envelope, keyBase64, ...identity }) {
  let raw;
  try {
    if (typeof envelope !== 'string' || envelope.length > 5000) throw new Error();
    const data = JSON.parse(envelope);
    const iv = Buffer.from(data.iv, 'base64');
    if (data.version !== 1 || iv.length !== 12) throw new Error();
    raw = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: context(identity) }, await key(keyBase64, 'decrypt'), Buffer.from(data.ciphertext, 'base64')));
    const result = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
    if (typeof result.username !== 'string' || typeof result.password !== 'string') throw new Error();
    return { ruc: identity.ruc, username: result.username, password: result.password };
  } catch { throw new Error('No se pudieron abrir las credenciales SOL de esta empresa.'); }
  finally { raw?.fill(0); }
}
