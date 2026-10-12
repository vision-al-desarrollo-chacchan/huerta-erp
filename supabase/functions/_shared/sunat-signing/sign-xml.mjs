/** Servidor únicamente. No realiza envíos ni persiste certificados o claves. */
import { createPrivateKey, X509Certificate, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { SignedXml } from 'xml-crypto';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const UBL = 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2';
const EXT = 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2';
const CAC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';
const CBC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';
const DS = 'http://www.w3.org/2000/09/xmldsig#';
const C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
const SHA256 = 'http://www.w3.org/2001/04/xmlenc#sha256';
const RSA_SHA256 = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
const SIGNATURE_ID = 'SignatureHuerta';
const children = (node, ns, name) => Array.from(node.childNodes).filter(n => n.nodeType === 1 && n.namespaceURI === ns && n.localName === name);
const one = (nodes) => { if (nodes.length !== 1) throw new Error('Estructura XML SUNAT inválida.'); return nodes[0]; };
function parse(xml) {
  if (typeof xml !== 'string' || Buffer.byteLength(xml) > 5_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('XML no admitido.');
  const document = new DOMParser({ onError: () => { throw new Error('XML mal formado.'); } }).parseFromString(xml, 'application/xml');
  if (!document.documentElement || document.documentElement.namespaceURI !== UBL || document.documentElement.localName !== 'Invoice') throw new Error('Se requiere Invoice UBL.');
  return document;
}
function issuer(document) {
  const root = document.documentElement;
  const party = one(children(one(children(root, CAC, 'AccountingSupplierParty')), CAC, 'Party'));
  const id = one(children(one(children(party, CAC, 'PartyIdentification')), CBC, 'ID'));
  if (id.getAttribute('schemeID') !== '6' || !/^\d{11}$/.test(id.textContent)) throw new Error('RUC emisor inválido.');
  return { ruc: id.textContent, name: one(children(one(children(party, CAC, 'PartyLegalEntity')), CBC, 'RegistrationName')).textContent };
}
function certificate(pem, ruc) {
  let cert;
  try { cert = new X509Certificate(pem); } catch { throw new Error('Certificado inválido.'); }
  const now = Date.now();
  if (now < Date.parse(cert.validFrom) || now > Date.parse(cert.validTo)) throw new Error('Certificado fuera de vigencia.');
  if (cert.publicKey.asymmetricKeyType !== 'rsa' || cert.publicKey.asymmetricKeyDetails.modulusLength < 2048) throw new Error('Se requiere certificado RSA de al menos 2048 bits.');
  // No aceptar un RUC que aparezca solamente en un nombre comercial arbitrario.
  const identities = cert.subject.split('\n').filter(line => /^(serialNumber|UID)=/.test(line));
  if (!identities.some(line => new RegExp('(?:^|[^0-9])' + ruc + '(?:[^0-9]|$)').test(line.split('=').slice(1).join('=')))) throw new Error('El certificado no identifica el RUC emisor.');
  return cert;
}
function extension(document) {
  return one(children(one(children(one(children(document.documentElement, EXT, 'UBLExtensions')), EXT, 'UBLExtension')), EXT, 'ExtensionContent'));
}
/** PEM ya descifrado únicamente en memoria. PFX/P12 debe convertirse en el backend seguro. */
export function signSunatXml({ xml, certificatePem, privateKeyPem }) {
  const document = parse(xml);
  const identity = issuer(document);
  const cert = certificate(certificatePem, identity.ruc);
  let key;
  try { key = createPrivateKey(privateKeyPem); } catch { throw new Error('Clave privada inválida.'); }
  if (!cert.checkPrivateKey(key)) throw new Error('La clave privada no corresponde al certificado.');
  const content = extension(document);
  if (Array.from(content.childNodes).some(n => n.nodeType === 1 || n.textContent.trim()) || document.getElementsByTagNameNS(DS, 'Signature').length || children(document.documentElement, CAC, 'Signature').length) throw new Error('El documento ya contiene una firma o extensión.');
  const root = document.documentElement;
  const signature = document.createElementNS(CAC, 'cac:Signature');
  const add = (parent, ns, tag, text) => { const node = document.createElementNS(ns, tag); if (text !== undefined) node.textContent = text; parent.appendChild(node); return node; };
  add(signature, CBC, 'cbc:ID', SIGNATURE_ID);
  const party = add(signature, CAC, 'cac:SignatoryParty');
  add(add(party, CAC, 'cac:PartyIdentification'), CBC, 'cbc:ID', identity.ruc);
  add(add(party, CAC, 'cac:PartyName'), CBC, 'cbc:Name', identity.name);
  add(add(add(signature, CAC, 'cac:DigitalSignatureAttachment'), CAC, 'cac:ExternalReference'), CBC, 'cbc:URI', '#' + SIGNATURE_ID);
  root.insertBefore(signature, one(children(root, CAC, 'AccountingSupplierParty')));
  const signer = new SignedXml({ privateKey: key, publicCert: certificatePem, signatureAlgorithm: RSA_SHA256, canonicalizationAlgorithm: C14N });
  signer.addReference({ xpath: "/*[local-name()='Invoice']", transforms: [DS + 'enveloped-signature', C14N], digestAlgorithm: SHA256, isEmptyUri: true });
  signer.computeSignature(new XMLSerializer().serializeToString(document), { prefix: 'ds', attrs: { Id: SIGNATURE_ID }, location: { reference: "//*[local-name()='ExtensionContent']", action: 'append' } });
  const signedXml = signer.getSignedXml();
  verifySunatXml(signedXml, certificatePem);
  return signedXml;
}
/** La confianza se fija al certificado externo; no se confía en KeyInfo del XML. */
export function verifySunatXml(xml, trustedCertificatePem) {
  const document = parse(xml);
  const identity = issuer(document);
  const cert = certificate(trustedCertificatePem, identity.ruc);
  const signature = one(Array.from(document.getElementsByTagNameNS(DS, 'Signature')));
  if (signature.parentNode !== extension(document) || signature.getAttribute('Id') !== SIGNATURE_ID) throw new Error('Ubicación de firma inválida.');
  const metadata = one(children(document.documentElement, CAC, 'Signature'));
  const uri = one(Array.from(metadata.getElementsByTagNameNS(CBC, 'URI')));
  if (uri.textContent !== '#' + SIGNATURE_ID) throw new Error('Referencia UBL de firma inválida.');
  const info = one(children(signature, DS, 'SignedInfo'));
  const reference = one(children(info, DS, 'Reference'));
  const transforms = children(one(children(reference, DS, 'Transforms')), DS, 'Transform').map(n => n.getAttribute('Algorithm'));
  if (reference.getAttribute('URI') !== '' || one(children(info, DS, 'CanonicalizationMethod')).getAttribute('Algorithm') !== C14N || one(children(info, DS, 'SignatureMethod')).getAttribute('Algorithm') !== RSA_SHA256 || one(children(reference, DS, 'DigestMethod')).getAttribute('Algorithm') !== SHA256 || transforms.join('|') !== [DS + 'enveloped-signature', C14N].join('|')) throw new Error('Perfil XMLDSig no admitido.');
  const embedded = one(Array.from(signature.getElementsByTagNameNS(DS, 'X509Certificate')));
  let embeddedCert;
  try { embeddedCert = new X509Certificate(Buffer.from(embedded.textContent.replace(/\s/g, ''), 'base64')); } catch { throw new Error('Certificado XML inválido.'); }
  if (cert.raw.length !== embeddedCert.raw.length || !timingSafeEqual(cert.raw, embeddedCert.raw)) throw new Error('Certificado XML no corresponde al certificado confiable.');
  const verifier = new SignedXml({ publicCert: trustedCertificatePem, getCertFromKeyInfo: () => null });
  verifier.loadSignature(signature);
  if (!verifier.checkSignature(xml) || verifier.getSignedReferences().length !== 1) throw new Error('Firma digital inválida.');
  return true;
}
