/** Orquestación inyectable para verificar permisos, exclusión y persistencia sin producción. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body, status = 200) => Response.json(body, { status, headers: cors });
const publicJob = job => ({ id: job.id, empresaId: job.empresa_id, ambiente: 'beta', datosFicticios: true, documentType: job.document_type ?? '01', estado: job.estado, codigo: job.codigo_sunat, mensaje: job.mensaje_sunat, observaciones: job.observaciones ?? [] });
export function createBetaHandler({ enabled, authenticate, repository, buildFixture, sendFixture, consultReceipt }) {
  return async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return reply({ error: 'Método no admitido.' }, 405);
    if (!enabled) return reply({ error: 'Pruebas SUNAT beta deshabilitadas.' }, 503);
    let identity;
    try { identity = await authenticate(req.headers.get('Authorization') ?? ''); } catch { return reply({ error: 'Sesión inválida.' }, 401); }
    if (!identity) return reply({ error: 'Sesión inválida.' }, 401);
    let body;
    try {
      const raw = await req.text();
      if (raw.length > 4096) throw new Error();
      body = JSON.parse(raw);
      if (!body || Object.keys(body).some(k => !['empresaId', 'idempotencyKey', 'documentType'].includes(k)) || !UUID.test(body.empresaId) || !UUID.test(body.idempotencyKey) || !['01', '03'].includes(body.documentType ?? '01')) throw new Error();
    } catch { return reply({ error: 'Solicitud inválida. Enviar empresaId e idempotencyKey UUID.' }, 400); }
    let job;
    try { job = await repository.reserve(identity, body.empresaId, body.idempotencyKey, body.documentType ?? '01'); }
    catch { return reply({ error: 'No se pudo reservar la prueba. Comprueba permisos y espera un minuto entre pruebas nuevas.' }, 403); }
    if ((job.document_type ?? '01') !== (body.documentType ?? '01')) return reply({ error: 'La clave pertenece a otro tipo de comprobante.' }, 409);
    if (job.document_type === '03' && job.ticket && ['enviando', 'incierto'].includes(job.estado)) {
      try {
        const result = await consultReceipt(job);
        const cdrPath = `${job.empresa_id}/${job.id}/cdr.zip`;
        if (result.cdr) await repository.store(cdrPath, result.cdr, 'application/zip');
        const saved = await repository.finish(job, { estado: result.status, codigo_sunat: result.code ?? null, mensaje_sunat: result.message, observaciones: result.notes ?? [], ...(result.cdr ? { cdr_path: cdrPath } : {}) });
        return reply(publicJob(saved));
      } catch { return reply({ ...publicJob(job), mensaje: 'No se confirmó la consulta del ticket. Actualiza el resultado; no reenviar.' }, 202); }
    }
    let claimed;
    try { claimed = await repository.claim(job); }
    catch { return reply({ error: 'No se pudo iniciar la prueba.' }, 503); }
    if (!claimed) return reply({ ...publicJob(job), duplicatePrevented: true }, job.estado === 'enviando' || job.estado === 'pendiente' ? 202 : 200);
    job = claimed;
    let startedSending = false;
    let stage = 'firma';
    try {
      const fixture = await buildFixture(job.document_type ?? '01', job);
      stage = 'almacenamiento XML';
      const xmlPath = `${job.empresa_id}/${job.id}/documento.xml`;
      await repository.store(xmlPath, new TextEncoder().encode(fixture.xml), 'application/xml');
      stage = 'envío';
      startedSending = true;
      const result = await sendFixture(fixture);
      if (result.ticket) {
        const saved = await repository.finish(job, { estado: 'enviando', ticket: result.ticket, summary_id: fixture.summaryId, xml_path: xmlPath, mensaje_sunat: result.message });
        return reply(publicJob(saved), 202);
      }
      stage = 'respuesta CDR';
      let cdrPath = null;
      if (result.cdr) {
        cdrPath = `${job.empresa_id}/${job.id}/cdr.zip`;
        await repository.store(cdrPath, result.cdr, 'application/zip');
      }
      stage = 'guardado de resultado';
      const saved = await repository.finish(job, { estado: result.status, codigo_sunat: result.code, mensaje_sunat: result.message, observaciones: result.notes, xml_path: xmlPath, cdr_path: cdrPath });
      return reply(publicJob(saved));
    } catch {
      // Tras comenzar el envío no se sabe si SUNAT lo recibió: nunca reintentar automáticamente.
      const estado = startedSending ? 'incierto' : 'error';
      try {
        const saved = await repository.finish(job, { estado, mensaje_sunat: startedSending ? 'No se confirmó el resultado del envío beta. Revisar antes de repetir.' : `No se pudo preparar la prueba beta. Etapa: ${stage}.` });
        return reply(publicJob(saved), 502);
      } catch { return reply({ id: job.id, estado: 'incierto', error: 'No se pudo confirmar ni guardar el resultado. No repetir automáticamente.' }, 503); }
    }
  };
}
