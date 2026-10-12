/** Servidor únicamente. PFX/P12 y contraseña se procesan en memoria, sin red ni logs. */
import { Buffer } from 'node:buffer';
import { createPrivateKey, X509Certificate } from 'node:crypto';
import forge from 'node-forge';
import { signSunatXml } from './sign-xml.mjs';

function readPfx({ pfxBase64, password, issuerRuc }) {
  if (typeof pfxBase64 !== 'string' || pfxBase64.length > 2_800_000 || !pfxBase64 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(pfxBase64)) throw new Error('Archivo PFX/P12 inválido o fuera de rango.');
  if (typeof password !== 'string' || password.length > 1024) throw new Error('Contraseña de certificado inválida.');
  if (typeof issuerRuc !== 'string' || !/^\d{11}$/.test(issuerRuc)) throw new Error('RUC emisor inválido.');
  const bytes = Buffer.from(pfxBase64, 'base64');
  if (bytes.length > 2_000_000 || bytes.toString('base64') !== pfxBase64) throw new Error('Archivo PFX/P12 inválido o fuera de rango.');
  try {
    const asn1 = forge.asn1.fromDer(bytes.toString('binary'), { strict: true, parseAllBytes: true });
    // Exigir integridad autenticada del contenedor además de descifrar la clave.
    if (!Array.isArray(asn1.value) || asn1.value.length !== 3) throw new Error();
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, true, password);
    const encrypted = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? [];
    const plain = p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ?? [];
    const certs = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
    if (encrypted.length !== 1 || plain.length !== 0 || !encrypted[0].key || !certs.length || certs.length > 10) throw new Error();
    const privateKeyPem = forge.pki.privateKeyToPem(encrypted[0].key);
    const key = createPrivateKey(privateKeyPem);
    if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 2048) throw new Error();
    const matches = certs.filter(bag => bag.cert).map(bag => forge.pki.certificateToPem(bag.cert)).filter(pem => new X509Certificate(pem).checkPrivateKey(key));
    if (matches.length !== 1) throw new Error();
    const cert = new X509Certificate(matches[0]);
    const now = Date.now();
    if (now < Date.parse(cert.validFrom) || now > Date.parse(cert.validTo)) throw new Error();
    const identities = cert.subject.split('\n').filter(line => /^(serialNumber|UID)=/.test(line));
    if (!identities.some(line => new RegExp('(?:^|[^0-9])' + issuerRuc + '(?:[^0-9]|$)').test(line.split('=').slice(1).join('=')))) throw new Error();
    return { certificatePem: matches[0], privateKeyPem, cert };
  } catch {
    // No devolver mensajes internos de ASN.1, claves, contraseña o contenido.
    throw new Error('No se pudo validar el certificado: revisa el archivo, contraseña, vigencia y RUC.');
  } finally { bytes.fill(0); }
}
/** Devuelve solo información pública; nunca la clave privada ni la contraseña. */
export function inspectSunatPfx(input) {
  const { cert } = readPfx(input);
  return { issuerRuc: input.issuerRuc, subject: cert.subject, validFrom: new Date(cert.validFrom).toISOString(), validTo: new Date(cert.validTo).toISOString(), fingerprint256: cert.fingerprint256, algorithm: 'RSA', keyBits: cert.publicKey.asymmetricKeyDetails.modulusLength };
}
/** Firma usando el PFX/P12; la vinculación del certificado al RUC del XML se comprueba otra vez. */
export function signSunatXmlWithPfx({ xml, ...input }) {
  const { certificatePem, privateKeyPem } = readPfx(input);
  return signSunatXml({ xml, certificatePem, privateKeyPem });
}
