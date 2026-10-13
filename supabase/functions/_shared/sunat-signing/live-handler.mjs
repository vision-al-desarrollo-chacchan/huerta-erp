/** Estados durables: no se repite ningún envío cuyo resultado sea incierto. */
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body, status = 200) => Response.json(body, { status, headers: { ...cors, 'Cache-Control': 'no-store' } });
const publicResult = doc => ({ id: doc.id, estado: doc.estado, codigoSunat: doc.codigo_sunat, mensaje: doc.mensaje_sunat });
export function createLiveHandler({ enabled, authenticate, repository, prepare, send }) {
  return async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return reply({ error: 'Método no admitido.' }, 405);
    let identity;
    try { identity = await authenticate(req.headers.get('Authorization') ?? ''); } catch { /* mensaje público */ }
    if (!identity) return reply({ error: 'Sesión inválida.' }, 401);
    let body;
    try {
      const text = await req.text(); if (text.length > 2000) throw new Error();
      body = JSON.parse(text);
      if (!body || Object.keys(body).some(k => !['documentId','action'].includes(k)) || !/^[0-9a-f-]{36}$/i.test(body.documentId) || (body.action && body.action !== 'consultar')) throw new Error();
    } catch { return reply({ error: 'Documento inválido.' }, 400); }
    let doc;
    try { doc = await repository.authorize(identity, body.documentId); } catch { return reply({ error: 'Sin acceso al documento.' }, 403); }
    if (body.action === 'consultar') {
      if (['aceptado','observado','rechazado','anulado'].includes(doc.estado) || !doc.transmision_iniciada_at) return reply(publicResult(doc));
      if (!enabled) return reply({ error: 'Consulta de producción pendiente de habilitar.' }, 503);
      try {
        const result=await repository.consult(doc);
        if(result.cdr)await repository.storeCdr(doc,result.cdr);
        return reply(publicResult(await repository.finish(doc,result)));
      } catch { return reply({error:'No se pudo confirmar el CDR. No reenviar el documento.'},502); }
    }
    if (['aceptado', 'observado', 'rechazado', 'anulado', 'enviando', 'incierto'].includes(doc.estado) || doc.transmision_iniciada_at) return reply({ ...publicResult(doc), duplicatePrevented: true });
    if (!enabled) return reply({ error: 'Emisión real pendiente de validación con una empresa habilitada. No se envió ningún comprobante.' }, 503);
    let claimed;
    try { claimed = await repository.claim(doc); } catch { return reply({ error: 'No se pudo reservar el envío.' }, 409); }
    if (!claimed) return reply({ duplicatePrevented: true, estado: 'enviando' }, 202);
    let transmissionStarted = false;
    try {
      const prepared = await prepare(claimed);
      await repository.storeXml(claimed, prepared.xml);
      if (prepared.summaryXml) await repository.storeSummary(claimed, prepared.summaryXml);
      // Se persiste ANTES de abrir la conexión: una caída nunca habilita un reenvío.
      await repository.markTransmission(claimed);
      transmissionStarted = true;
      const result = await send(prepared);
      if (result.cdr) await repository.storeCdr(claimed, result.cdr);
      const saved = await repository.finish(claimed, result);
      return reply(publicResult(saved));
    } catch {
      try {
        const result = { status: transmissionStarted ? 'incierto' : 'error', message: transmissionStarted ? 'SUNAT no confirmó el resultado. No reenviar; se requiere consultar el CDR.' : 'No se pudo preparar el documento. Revisa configuración, certificado, datos del pedido y montos.' };
        return reply(publicResult(await repository.finish(claimed, result)), 502);
      } catch { return reply({ error: 'Resultado sin confirmar. No repitas el envío.' }, 503); }
    }
  };
}
