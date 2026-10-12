import { attachSunatSecurityHeader, buildSunatSecurityHeader } from './sunat-wsse.ts';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error('SUNAT WSSE test: ' + message);
}
function throws(fn: () => unknown): boolean {
  try { fn(); return false; } catch { return true; }
}
/** Pruebas locales sin credenciales reales, red ni llamadas a SUNAT. */
export function runSunatWsseChecks(): void {
  const credentials = { ruc: '20123456789', username: 'USUARIOPRUEBA', password: 'clave&<demo>' };
  const header = buildSunatSecurityHeader(credentials);
  assert(header.includes('<wsse:Username>20123456789USUARIOPRUEBA</wsse:Username>'), 'Usuario SOL concatenado');
  assert(header.includes('clave&amp;&lt;demo&gt;'), 'Escape XML de contraseña');
  assert(header.includes('PasswordText'), 'Tipo de contraseña');
  const envelope = '<soapenv:Envelope><soapenv:Header/><soapenv:Body><ser:sendBill></ser:sendBill></soapenv:Body></soapenv:Envelope>';
  const signed = attachSunatSecurityHeader(envelope, credentials);
  assert(signed.includes('<wsse:Security'), 'Cabecera insertada');
  assert(!signed.includes('<soapenv:Header/>'), 'Cabecera vacía reemplazada');
  assert(throws(() => buildSunatSecurityHeader({ ...credentials, ruc: '123' })), 'Rechazo RUC');
  assert(throws(() => buildSunatSecurityHeader({ ...credentials, password: '' })), 'Rechazo contraseña vacía');
  assert(throws(() => attachSunatSecurityHeader('<soapenv:Header/>', credentials)), 'Rechazo SOAP incompleto');
}

