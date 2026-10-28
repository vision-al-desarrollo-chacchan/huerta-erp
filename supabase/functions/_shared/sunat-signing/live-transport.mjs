/** Transporte de factura. No habilita producción ni modifica documentos. */
import { Buffer } from 'node:buffer';
import { zipSync, strToU8 } from 'fflate';
import { buildSunatSendBillSoap, getSunatEndpoint } from '../../../../src/services/sunat/soap-preflight.ts';
import { attachSunatSecurityHeader, buildSunatSecurityHeader } from '../sunat-wsse.ts';
import { parseBetaResponse } from './beta-client.mjs';
import { DOMParser } from '@xmldom/xmldom';

async function readResponse(response) {
  if (!response.body) throw new Error('Respuesta SUNAT vacía.');
  const reader = response.body.getReader(); const chunks = []; let total = 0;
  try {
    while (true) { const { value, done } = await reader.read(); if (done) break; total += value.length; if (total > 5_000_000) throw new Error('Respuesta SUNAT fuera de rango.'); chunks.push(value); }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString('utf8');
}

async function summaryCall(method, payload, credentials, environment, authorized, fetchImpl) {
  const body=`<?xml version="1.0"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe">${buildSunatSecurityHeader(credentials)}<soapenv:Body><ser:${method}>${payload}</ser:${method}></soapenv:Body></soapenv:Envelope>`;
  const response=await fetchImpl(getSunatEndpoint(environment,authorized),{method:'POST',redirect:'error',signal:AbortSignal.timeout(30_000),headers:{'Content-Type':'text/xml; charset=utf-8',SOAPAction:`urn:${method}`},body});
  const xml=await readResponse(response);
  if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('Resumen SUNAT no confirmado.');
  const document=new DOMParser({onError:()=>{throw new Error('XML inválido.');}}).parseFromString(xml,'application/xml');
  const faults=Array.from(document.getElementsByTagNameNS('http://schemas.xmlsoap.org/soap/envelope/','Fault'));
  if (faults.length === 1) {
    const children=Array.from(faults[0].childNodes).filter(n=>n.nodeType===1);
    const codes=children.filter(n=>n.localName==='faultcode');
    const messages=children.filter(n=>n.localName==='faultstring');
    const match=codes.length===1 ? /^(?:[\w-]+:)?Client\.(\d{4})$/.exec(codes[0].textContent.trim()) : null;
    if(match && messages.length===1) {
      const error=new Error('SUNAT rechazó el resumen.');
      error.sunatRejection={status:'rechazado',code:match[1],message:messages[0].textContent.slice(0,2000),notes:[],cdr:null};
      throw error;
    }
    throw new Error('SOAP Fault sin rechazo confirmado.');
  }
  if(!response.ok)throw new Error('Resumen SUNAT no confirmado.');
  const replies=Array.from(document.getElementsByTagNameNS('http://service.sunat.gob.pe',method+'Response'));
  if(replies.length!==1)throw new Error('Respuesta SUNAT de resumen inválida.');
  return replies[0];
}

export async function sendSignedReceiptSummary({ xml, ruc, summaryId, credentials, environment, authorized=false }, fetchImpl=fetch) {
  if(!/^\d{11}$/.test(ruc)||!/^RC-\d{8}-[1-9]\d{0,4}$/.test(summaryId)||credentials.ruc!==ruc||typeof xml!=='string'||Buffer.byteLength(xml)>2_000_000||!xml.includes('<ds:Signature'))throw new Error('Resumen firmado inválido.');
  const name=`${ruc}-${summaryId}`;
  const payload=`<fileName>${name}.zip</fileName><contentFile>${Buffer.from(zipSync({[name+'.xml']:strToU8(xml)})).toString('base64')}</contentFile>`;
  let reply;
  try { reply=await summaryCall('sendSummary',payload,credentials,environment,authorized,fetchImpl); }
  catch(error) { if(error.sunatRejection)return error.sunatRejection; throw error; }
  const tickets=Array.from(reply.getElementsByTagName('*')).filter(node=>node.localName==='ticket');
  if(tickets.length!==1||!/^\d{1,128}$/.test(tickets[0].textContent))throw new Error('Ticket SUNAT inválido.');
  return {status:'enviando',ticket:tickets[0].textContent,message:'Resumen de boleta recibido por SUNAT. Consulta el ticket para obtener el CDR.'};
}

export async function consultReceiptTicket({ ticket, summaryId, credentials, environment, authorized=false }, fetchImpl=fetch) {
  if(!/^\d{1,128}$/.test(ticket)||!/^RC-\d{8}-[1-9]\d{0,4}$/.test(summaryId))throw new Error('Ticket o resumen inválido.');
  const reply=await summaryCall('getStatus',`<ticket>${ticket}</ticket>`,credentials,environment,authorized,fetchImpl);
  const nodes=Array.from(reply.getElementsByTagName('*'));
  const codes=nodes.filter(node=>node.localName==='statusCode');
  if(codes.length!==1)throw new Error('Estado del ticket inválido.');
  if(codes[0].textContent==='98')return {status:'enviando',ticket,message:'SUNAT sigue procesando el resumen. Consulta nuevamente; no reenviar.'};
  const contents=nodes.filter(node=>node.localName==='content');
  if(!['0','99'].includes(codes[0].textContent)||contents.length!==1)throw new Error('CDR del resumen sin confirmar.');
  const content=contents[0].textContent.replace(/\s/g,'');
  if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content))throw new Error('CDR inválido.');
  return {...parseBetaResponse(`<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><r:sendBillResponse xmlns:r="http://service.sunat.gob.pe"><applicationResponse>${content}</applicationResponse></r:sendBillResponse></s:Body></s:Envelope>`,summaryId),ticket};
}

export async function sendSignedInvoice({ xml, ruc, series, number, credentials, environment, authorized = false }, fetchImpl = fetch) {
  if (!/^\d{11}$/.test(ruc) || !/^F[A-Z0-9]{3}$/.test(series) || !Number.isSafeInteger(number) || number < 1 || number > 99999999 || credentials.ruc !== ruc) throw new Error('Identidad de factura inválida.');
  if (typeof xml !== 'string' || Buffer.byteLength(xml) > 2_000_000 || !xml.includes('<ds:Signature')) throw new Error('XML firmado inválido.');
  const name = `${ruc}-01-${series}-${number}`;
  const soap = attachSunatSecurityHeader(buildSunatSendBillSoap({ fileName: name + '.zip', contentFileBase64: Buffer.from(zipSync({ [name + '.xml']: strToU8(xml) })).toString('base64') }), credentials);
  const response = await fetchImpl(getSunatEndpoint(environment, authorized), { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: 'urn:sendBill' }, body: soap });
  const result = parseBetaResponse(await readResponse(response), `${series}-${number}`);
  if (!response.ok && result.cdr) throw new Error('Respuesta HTTP no confirmada.');
  return result;
}

export async function consultInvoiceCdr({ ruc, series, number, credentials, authorized = false }, fetchImpl = fetch) {
  if (!authorized || !/^\d{11}$/.test(ruc) || !/^F[A-Z0-9]{3}$/.test(series) || !Number.isSafeInteger(number) || number < 1 || number > 99999999 || credentials.ruc !== ruc) throw new Error('Consulta SUNAT no habilitada.');
  const soap=`<?xml version="1.0"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe">${buildSunatSecurityHeader(credentials)}<soapenv:Body><ser:getStatusCdr><rucComprobante>${ruc}</rucComprobante><tipoComprobante>01</tipoComprobante><serieComprobante>${series}</serieComprobante><numeroComprobante>${number}</numeroComprobante></ser:getStatusCdr></soapenv:Body></soapenv:Envelope>`;
  const response=await fetchImpl('https://e-factura.sunat.gob.pe/ol-it-wsconscpegem/billConsultService',{method:'POST',redirect:'error',signal:AbortSignal.timeout(30_000),headers:{'Content-Type':'text/xml; charset=utf-8',SOAPAction:'urn:getStatusCdr'},body:soap});
  const xml=await readResponse(response);
  if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('Consulta SUNAT no confirmada.');
  const root=new DOMParser({onError:()=>{throw new Error('XML inválido.');}}).parseFromString(xml,'application/xml');
  const replies=Array.from(root.getElementsByTagNameNS('http://service.sunat.gob.pe','getStatusCdrResponse'));
  if(replies.length!==1)throw new Error('Respuesta de consulta inválida.');
  const contents=Array.from(replies[0].getElementsByTagName('*')).filter(node=>node.localName==='content');
  if(contents.length!==1||!contents[0].textContent?.trim())return {status:'incierto',message:'SUNAT todavía no entregó un CDR. No reenviar el comprobante.'};
  const content=contents[0].textContent.replace(/\s/g,'');
  if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content))throw new Error('CDR inválido.');
  return parseBetaResponse(`<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><r:sendBillResponse xmlns:r="http://service.sunat.gob.pe"><applicationResponse>${content}</applicationResponse></r:sendBillResponse></s:Body></s:Envelope>`,`${series}-${number}`);
}
