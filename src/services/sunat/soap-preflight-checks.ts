import { buildSunatSendBillSoap, getSunatEndpoint, validateSunatZipPayload } from './soap-preflight';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('SUNAT SOAP: ' + message);
}
function rejects(callback: () => unknown, message: string): void {
  let failed = false;
  try { callback(); } catch { failed = true; }
  assert(failed, message);
}

/** Comprobaciones locales sin conexión ni credenciales. */
export function runSunatSoapPreflightChecks(): void {
  const payload = {
    fileName: '20123456789-03-B001-1.zip',
    contentFileBase64: 'UEsDBA==',
  };
  validateSunatZipPayload(payload);
  const soap = buildSunatSendBillSoap(payload);
  assert(soap.includes('<ser:sendBill>'), 'Operación sendBill');
  assert(soap.includes('<fileName>20123456789-03-B001-1.zip</fileName>'), 'Archivo CPE');
  assert(soap.includes('<contentFile>UEsDBA==</contentFile>'), 'Contenido base64');
  assert(getSunatEndpoint('beta').includes('e-beta.sunat.gob.pe'), 'Entorno beta');
  rejects(() => getSunatEndpoint('production'), 'Bloqueo de producción');
  rejects(() => validateSunatZipPayload({ ...payload, fileName: '../invalido.zip' }), 'Ruta inválida');
  rejects(() => validateSunatZipPayload({ ...payload, contentFileBase64: '<xml>' }), 'Base64 inválido');
}
