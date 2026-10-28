/** Backend beta únicamente: datos ficticios, TLS, sin endpoint configurable ni reintentos. */
import { buildReceiptSummary } from '../../../../src/services/sunat/build-receipt-summary.ts';
import { sendSignedReceiptSummary, consultReceiptTicket } from './live-transport.mjs';
import { randomBytes } from 'node:crypto';
import { Buffer } from 'node:buffer';
import forge from 'node-forge';
import { zipSync, unzipSync, strToU8 } from 'fflate';
import { DOMParser } from '@xmldom/xmldom';
import { buildSunatUblDraft } from '../../../../src/services/sunat/build-ubl-draft.ts';
import { signSunatXml } from './sign-xml.mjs';
import { buildSunatSendBillSoap, getSunatEndpoint } from '../../../../src/services/sunat/soap-preflight.ts';
import { attachSunatSecurityHeader } from '../sunat-wsse.ts';
const CBC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';
const CAC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';
const SOAP = 'http://schemas.xmlsoap.org/soap/envelope/';
const MAX = 5_000_000;
const nodes = (p, ns, name) => Array.from(p.childNodes).filter(n => n.nodeType === 1 && n.namespaceURI === ns && n.localName === name);
const one = a => { if (a.length !== 1) throw new Error('Respuesta SUNAT inválida.'); return a[0]; };
function parse(xml) {
  if (Buffer.byteLength(xml) > MAX || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Respuesta XML fuera de rango.');
  return new DOMParser({ onError: () => { throw new Error('Respuesta XML mal formada.'); } }).parseFromString(xml, 'application/xml');
}
export async function buildBetaFixture(documentType = '01', job = {}) {
  if (!['01', '03'].includes(documentType)) throw new Error('Tipo beta inválido.');
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const pem = (label, value) => `-----BEGIN ${label}-----\n${Buffer.from(value).toString('base64').match(/.{1,64}/g).join('\n')}\n-----END ${label}-----`;
  const keys = { publicKey: pem('PUBLIC KEY', await crypto.subtle.exportKey('spki', pair.publicKey)), privateKey: pem('PRIVATE KEY', await crypto.subtle.exportKey('pkcs8', pair.privateKey)) };
  const cert = forge.pki.createCertificate();
  cert.publicKey = forge.pki.publicKeyFromPem(keys.publicKey);
  cert.serialNumber = '01' + randomBytes(16).toString('hex');
  cert.validity.notBefore = new Date(Date.now() - 60_000);
  cert.validity.notAfter = new Date(Date.now() + 86_400_000);
  const identity = [{ name: 'commonName', value: 'SOLO PRUEBAS HUERTA' }, { name: 'serialNumber', value: '20123456789' }];
  cert.setSubject(identity); cert.setIssuer(identity); cert.sign(forge.pki.privateKeyFromPem(keys.privateKey), forge.md.sha256.create());
  const certificatePem = forge.pki.certificateToPem(cert);
  const draft = { issuerRuc: '20123456789', issuerName: 'EMPRESA DE PRUEBA SAC', issuerAddress: 'AV. PRUEBA 123', documentType, series: documentType === '03' ? 'B001' : 'F001', number: 1, issueDate: new Date().toISOString().slice(0, 10), currency: 'PEN', receiverDocumentType: documentType === '03' ? '1' : '6', receiverDocumentNumber: documentType === '03' ? '12345678' : '20654321098', receiverName: 'CLIENTE FICTICIO', paymentMode: 'Contado', items: [{ description: 'PRODUCTO FICTICIO', quantity: 1, unitPrice: 11.8 }] };
  if (documentType === '03') {
    const date = new Date(new Date(job.created_at ?? Date.now()).getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    draft.issueDate = date;
    const summaryId = job.summary_id ?? `RC-${date.replaceAll('-', '')}-${1 + parseInt((job.id ?? '00000001').slice(0, 8), 16) % 99999}`;
    const xml = signSunatXml({ xml: buildReceiptSummary(draft, summaryId, date), certificatePem, privateKeyPem: keys.privateKey });
    return { xml, summaryId, documentType };
  }
  const xml = signSunatXml({ xml: buildSunatUblDraft(draft), certificatePem, privateKeyPem: keys.privateKey });
  const fileName = '20123456789-01-F001-1.zip';
  const zip = zipSync({ '20123456789-01-F001-1.xml': strToU8(xml) });
  return { xml, certificatePem, fileName, zip };
}
export function parseBetaResponse(xml, expectedId = 'F001-1') {
  const root = parse(xml).documentElement;
  if (root.namespaceURI !== SOAP || root.localName !== 'Envelope') throw new Error('Respuesta no corresponde a SOAP 1.1.');
  const body = one(nodes(root, SOAP, 'Body'));
  const fault = nodes(body, SOAP, 'Fault');
  if (fault.length) {
    const f = one(fault);
    const text = name => one(Array.from(f.childNodes).filter(n => n.nodeType === 1 && n.localName === name)).textContent;
    return { status: 'rechazado', code: text('faultcode').slice(0, 100), message: text('faultstring').slice(0, 2000), notes: [], cdr: null };
  }
  const reply = one(nodes(body, 'http://service.sunat.gob.pe', 'sendBillResponse'));
  const response = one(Array.from(reply.childNodes).filter(n => n.nodeType === 1 && n.localName === 'applicationResponse'));
  const base64 = response.textContent.replace(/\s/g, '');
  if (!base64 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) throw new Error('CDR base64 inválido.');
  const cdr = new Uint8Array(Buffer.from(base64, 'base64'));
  if (cdr.length > MAX) throw new Error('CDR fuera de rango.');
  let entries = 0, total = 0;
  const files = unzipSync(cdr, { filter: entry => {
    entries++; total += entry.originalSize;
    if (entries > 10 || total > MAX || entry.name.includes('..') || entry.name.startsWith('/') || entry.name.includes('\\')) throw new Error('ZIP CDR no admitido.');
    return !entry.name.endsWith('/');
  } });
  const names = Object.keys(files);
  if (names.length !== 1 || !names[0].endsWith('.xml')) throw new Error('ZIP CDR sin XML único.');
  const application = parse(new TextDecoder('utf-8', { fatal: true }).decode(files[names[0]])).documentElement;
  if (application.namespaceURI !== 'urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2' || application.localName !== 'ApplicationResponse') throw new Error('CDR no corresponde a ApplicationResponse.');
  const result = one(nodes(one(nodes(application, CAC, 'DocumentResponse')), CAC, 'Response'));
  if (one(nodes(result, CBC, 'ReferenceID')).textContent !== expectedId) throw new Error('CDR de otro documento.');
  const code = one(nodes(result, CBC, 'ResponseCode')).textContent;
  if (!/^\d{1,5}$/.test(code)) throw new Error('Código CDR inválido.');
  const notes = nodes(application, CBC, 'Note').map(n => n.textContent.slice(0, 2000));
  return { status: code === '0' ? (notes.length ? 'observado' : 'aceptado') : 'rechazado', code, message: one(nodes(result, CBC, 'Description')).textContent.slice(0, 2000), notes, cdr };
}
const betaCredentials = { ruc: '20123456789', username: 'MODDATOS', password: 'MODDATOS' };
export async function consultBetaReceipt(job, fetchImpl = fetch) {
  return consultReceiptTicket({ ticket: job.ticket, summaryId: job.summary_id, credentials: betaCredentials, environment: 'beta' }, fetchImpl);
}
export async function sendBetaFixture(fixture, fetchImpl = fetch) {
  if (fixture.documentType === '03') return sendSignedReceiptSummary({ xml: fixture.xml, ruc: betaCredentials.ruc, summaryId: fixture.summaryId, credentials: betaCredentials, environment: 'beta' }, fetchImpl);
  if (fixture.fileName !== '20123456789-01-F001-1.zip') throw new Error('Solo se admite la factura ficticia.');
  const soap = attachSunatSecurityHeader(buildSunatSendBillSoap({ fileName: fixture.fileName, contentFileBase64: Buffer.from(fixture.zip).toString('base64') }), { ruc: '20123456789', username: 'MODDATOS', password: 'MODDATOS' });
  const response = await fetchImpl(getSunatEndpoint('beta'), { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: 'urn:sendBill' }, body: soap });
  if (!response.body) throw new Error('Respuesta SUNAT vacía.');
  const reader = response.body.getReader(); const chunks = []; let total = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; total += value.length; if (total > MAX) throw new Error('Respuesta SUNAT fuera de rango.'); chunks.push(value); } }
  finally { await reader.cancel(); }
  const data = Buffer.concat(chunks).toString('utf8');
  const result = parseBetaResponse(data);
  if (!response.ok && result.cdr) throw new Error('HTTP SUNAT no exitoso.');
  return result;
}
