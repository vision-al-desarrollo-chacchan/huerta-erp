/**
 * Preparación segura del envío CPE. No realiza solicitudes de red.
 * El ZIP debe contener un XML firmado y validado previamente.
 * Se usa solo desde backend con credenciales SOL, nunca desde el navegador.
 */
export type SunatEnvironment = 'beta' | 'production';
export interface SunatSoapPayload {
  fileName: string;
  contentFileBase64: string;
}
const endpoints: Record<SunatEnvironment, string> = {
  beta: 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
  production: 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService',
};
const escapeXml = (s: string): string => s.replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!
);

/** Evita enviar accidentalmente documentos reales a producción. */
export function getSunatEndpoint(environment: SunatEnvironment, productionAuthorized = false): string {
  if (environment === 'production' && !productionAuthorized) {
    throw new Error('Envío a producción bloqueado: requiere autorización explícita.');
  }
  return endpoints[environment];
}

export function validateSunatZipPayload(payload: SunatSoapPayload): void {
  if (!/^\d{11}-(01|03)-[FB][A-Z0-9]{3}-\d{1,8}\.zip$/.test(payload.fileName)) {
    throw new Error('Nombre de ZIP CPE inválido.');
  }
  if (!payload.contentFileBase64 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(payload.contentFileBase64)) {
    throw new Error('Contenido ZIP base64 inválido.');
  }
}

/**
 * Cuerpo SOAP 1.1 sin cabecera de autenticación.
 * La autenticación WS-Security y el transporte TLS corresponden al backend.
 */
export function buildSunatSendBillSoap(payload: SunatSoapPayload): string {
  validateSunatZipPayload(payload);
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
 xmlns:ser="http://service.sunat.gob.pe">
 <soapenv:Header/>
 <soapenv:Body><ser:sendBill>
  <fileName>${escapeXml(payload.fileName)}</fileName>
  <contentFile>${payload.contentFileBase64}</contentFile>
 </ser:sendBill></soapenv:Body>
</soapenv:Envelope>`;
}
