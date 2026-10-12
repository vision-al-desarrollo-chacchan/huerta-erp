import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { signSunatXml, verifySunatXml } from './sign-xml.mjs';
import { buildSunatUblDraft } from '../../../../src/services/sunat/build-ubl-draft.ts';
const fixtures = JSON.parse(execFileSync('python', [fileURLToPath(new URL('./test-fixtures.py', import.meta.url))], { encoding: 'utf8' }));
const base = { issuerRuc: '20123456789', issuerName: 'EMPRESA DE PRUEBA SAC', issuerAddress: 'AV. PRUEBA 123', documentType: '03', series: 'B001', number: 1, issueDate: '2026-10-12', currency: 'PEN', receiverDocumentType: '1', receiverDocumentNumber: '12345678', receiverName: 'CLIENTE A & B', items: [{ description: 'Pollo & papas', quantity: 1, unitPrice: 11.8 }] };
const unsigned = buildSunatUblDraft(base);
const sign = (xml = unsigned, credentials = fixtures.valid) => signSunatXml({ xml, ...credentials });
let signed;
test('firma y verificación de boleta y factura', () => {
  signed = sign();
  assert.equal(verifySunatXml(signed, fixtures.valid.certificatePem), true);
  const invoice = sign(buildSunatUblDraft({ ...base, documentType: '01', series: 'F001', receiverDocumentType: '6', receiverDocumentNumber: '20654321098' }));
  assert.equal(verifySunatXml(invoice, fixtures.valid.certificatePem), true);
  assert.ok(signed.includes('URI=""'));
  assert.ok(signed.includes('rsa-sha256'));
  if (process.env.SUNAT_TEST_OUTPUT_DIR) {
    mkdirSync(process.env.SUNAT_TEST_OUTPUT_DIR, { recursive: true });
    for (const [name, data] of [['boleta.xml', signed], ['factura.xml', invoice], ['certificate.pem', fixtures.valid.certificatePem]]) writeFileSync(process.env.SUNAT_TEST_OUTPUT_DIR + '/' + name, data);
  }
});
test('rechaza alteración de importe, receptor y texto del producto', () => {
  for (const [from, to] of [['11.80', '12.80'], ['CLIENTE A &amp; B', 'CLIENTE ALTERADO'], ['Pollo &amp; papas', 'Producto alterado']]) {
    const altered = signed.replace(from, to);
    assert.notEqual(altered, signed);
    assert.throws(() => verifySunatXml(altered, fixtures.valid.certificatePem));
  }
});
test('rechaza certificado ajeno, vencido, futuro, débil y clave incorrecta', () => {
  for (const credentials of [fixtures.other, fixtures.expired, fixtures.future, fixtures.weak, { ...fixtures.valid, privateKeyPem: fixtures.other.privateKeyPem }]) assert.throws(() => sign(unsigned, credentials));
  assert.throws(() => verifySunatXml(signed, fixtures.other.certificatePem));
});
test('rechaza XML mal formado, DTD, firma previa y extensión ocupada', () => {
  for (const xml of [unsigned.replace('</Invoice>', ''), '<!DOCTYPE Invoice>' + unsigned, signed, unsigned.replace('<ext:ExtensionContent/>', '<ext:ExtensionContent>ocupado</ext:ExtensionContent>')]) assert.throws(() => sign(xml));
});
test('rechaza firma duplicada y referencia a un elemento en lugar del documento', () => {
  const signature = signed.match(/<ds:Signature\b[\s\S]*?<\/ds:Signature>/)[0];
  assert.throws(() => verifySunatXml(signed.replace('</ext:ExtensionContent>', signature + '</ext:ExtensionContent>'), fixtures.valid.certificatePem));
  assert.throws(() => verifySunatXml(signed.replace('URI=""', 'URI="#otro"'), fixtures.valid.certificatePem));
});
