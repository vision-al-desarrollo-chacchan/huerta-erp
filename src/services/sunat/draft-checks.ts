import { buildSunatUblDraft, type SunatUblDraft } from './build-ubl-draft';
import { calculateTaxedTotals } from './tax-calculation';

/**
 * Pruebas de regresión aisladas, sin llamadas a SUNAT ni credenciales.
 * Ejecutar runSunatDraftChecks() desde un entorno de pruebas TypeScript.
 * No sustituyen validación XSD, firma digital ni pruebas de homologación SUNAT.
 */
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('Prueba SUNAT falló: ' + message);
}
function shouldThrow(run: () => unknown, message: string) {
  let threw = false;
  try { run(); } catch { threw = true; }
  assert(threw, message);
}
const base: SunatUblDraft = {
  issuerRuc: '20123456789',
  issuerName: 'EMPRESA DE PRUEBA SAC',
  issuerAddress: 'AV. EJEMPLO 123',
  documentType: '03',
  series: 'B001',
  number: 1,
  issueDate: '2026-10-12',
  currency: 'PEN',
  receiverDocumentType: '1',
  receiverDocumentNumber: '12345678',
  receiverName: 'CLIENTE DE PRUEBA',
  items: [{ description: 'Pollo a la brasa', quantity: 1, unitPrice: 11.80 }],
};

export function runSunatDraftChecks(): void {
  const result = calculateTaxedTotals([{ description: 'Prueba', quantity: 1, unitPriceWithTax: 11.80 }]);
  assert(result.grossCents === 1180, 'Total con IGV debe ser S/11.80');
  assert(result.taxableCents === 1000, 'Base imponible debe ser S/10.00');
  assert(result.taxCents === 180, 'IGV debe ser S/1.80');
  assert(result.taxableCents + result.taxCents === result.grossCents, 'Cuadre monetario');
  const xml = buildSunatUblDraft(base);
  assert(xml.includes('<cbc:InvoiceTypeCode') && xml.includes('>03</cbc:InvoiceTypeCode>'), 'Código boleta');
  assert(xml.includes('<cbc:PayableAmount currencyID="PEN">11.80</cbc:PayableAmount>'), 'Total XML');
  assert(xml.includes('<cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount>'), 'IGV XML');
  assert(xml.includes('<cbc:ID>B001-1</cbc:ID>'), 'Serie y correlativo');
  assert(xml.includes('>0101</cbc:ProfileID>'), 'Tipo de operación venta interna');
  const factura = buildSunatUblDraft({
    ...base, documentType: '01', series: 'F001',
    receiverDocumentType: '6', receiverDocumentNumber: '20654321098',
  });
  assert(factura.includes('>01</cbc:InvoiceTypeCode>'), 'Código factura');
  shouldThrow(() => buildSunatUblDraft({ ...base, documentType: '01', series: 'B001' }), 'Serie factura');
  shouldThrow(() => buildSunatUblDraft({ ...base, issuerRuc: '123' }), 'RUC inválido');
  shouldThrow(() => buildSunatUblDraft({ ...base, items: [{ description: '', quantity: 1, unitPrice: 5 }] }), 'Descripción obligatoria');
  shouldThrow(() => buildSunatUblDraft({ ...base, items: [{ description: 'Error', quantity: 0, unitPrice: 5 }] }), 'Cantidad positiva');
  shouldThrow(() => buildSunatUblDraft({ ...base, number: 100000000 }), 'Correlativo fuera de rango');
  shouldThrow(() => buildSunatUblDraft({ ...base, items: [{ description: 'Error', quantity: 1, unitPrice: 0 }] }), 'Precio cero no permitido en borrador gravado');
  const escaped = buildSunatUblDraft({ ...base, receiverName: 'A & B <C>' });
  assert(escaped.includes('A &amp; B &lt;C&gt;'), 'Escapado XML');
}
