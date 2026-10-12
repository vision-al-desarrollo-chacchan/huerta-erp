/**
 * Utilidad exclusiva del servidor para construir UsernameToken de SUNAT.
 * Nunca importar este archivo desde el frontend ni registrar el XML en logs.
 * Las credenciales deben descifrarse únicamente en el backend autorizado.
 */
export interface SolCredentials {
  ruc: string;
  username: string;
  password: string;
}
const xmlEscape = (value: string): string => value.replace(/[&<>"']/g, ch =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch]!
);

/**
 * SUNAT SEE utiliza un UsernameToken cuyo Username concatena RUC + usuario SOL.
 * No modifica el archivo ZIP ni realiza envíos.
 */
export function buildSunatSecurityHeader(credentials: SolCredentials): string {
  if (!/^\d{11}$/.test(credentials.ruc)) throw new Error('RUC SOL inválido.');
  if (!credentials.username.trim() || !credentials.password) throw new Error('Faltan credenciales SOL.');
  if (credentials.username.length > 128 || credentials.password.length > 1024)
    throw new Error('Credenciales fuera de rango.');
  return `<soapenv:Header>
  <wsse:Security soapenv:mustUnderstand="1"
    xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
    xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <wsse:UsernameToken>
      <wsse:Username>${xmlEscape(credentials.ruc + credentials.username)}</wsse:Username>
      <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${xmlEscape(credentials.password)}</wsse:Password>
    </wsse:UsernameToken>
  </wsse:Security>
</soapenv:Header>`;
}

/** Sustituye únicamente el encabezado vacío de un SOAP construido internamente. */
export function attachSunatSecurityHeader(soap: string, credentials: SolCredentials): string {
  if (!soap.includes('<soapenv:Header/>') || soap.split('<soapenv:Header/>').length !== 2)
    throw new Error('SOAP no tiene exactamente una cabecera vacía.');
  if (!soap.includes('<ser:sendBill>')) throw new Error('SOAP no corresponde a sendBill.');
  return soap.replace('<soapenv:Header/>', buildSunatSecurityHeader(credentials));
}
