import { validateSunatDraft, type SunatDocumentDraft } from './validate-document';
import { calculateTaxedTotals } from './tax-calculation';

/**
 * Generador preliminar UBL 2.1 para pruebas locales.
 * NO enviar a SUNAT sin completar impuestos, firma XMLDSig y validación XSD.
 * Supuestos: precios en PEN incluyen IGV 18%, todos los ítems gravados.
 */
export type SunatUblDraft = SunatDocumentDraft & {
  issuerName: string;
  issuerAddress: string;
  receiverAddress?: string;
};

const escapeXml = (value: string): string => value.replace(/[&<>"']/g, ch =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch]!
);
const xml = (value: string | number) => escapeXml(String(value));
const money = (cents: number) => (cents / 100).toFixed(2);
const cents = (value: number) => Math.round(value * 100);
const amount = (value: string) => `<cbc:PayableAmount currencyID="PEN">${value}</cbc:PayableAmount>`;

export function buildSunatUblDraft(input: SunatUblDraft): string {
  const errors = validateSunatDraft(input);
  if (!input.issuerName.trim()) errors.push('Falta razón social del emisor.');
  if (!input.issuerAddress.trim()) errors.push('Falta dirección del emisor.');
  if (input.items.some(item => !Number.isFinite(item.quantity * item.unitPrice) ||
    item.quantity * item.unitPrice > 1000000000)) errors.push('Importe de ítem fuera de rango.');
  if (errors.length) throw new Error(errors.join(' '));

  // Redondeo por línea; no usar coma flotante para sumar totales.
  const calculated = calculateTaxedTotals(input.items.map(item => ({
    description: item.description,
    quantity: item.quantity,
    unitPriceWithTax: item.unitPrice,
  })));
  const lines = calculated.lines.map(line => ({
    ...line,
    gross: line.grossCents,
    net: line.taxableCents,
    tax: line.taxCents,
    unitPrice: line.unitPriceWithTax,
  }));
  const gross = calculated.grossCents;
  const net = calculated.taxableCents;
  const tax = calculated.taxCents;
  const documentId = `${input.series}-${input.number}`;
  const lineTag = input.documentType === '01' ? 'cac:InvoiceLine' : 'cac:InvoiceLine';
  const linesXml = lines.map((line, index) => `
    <${lineTag}>
      <cbc:ID>${index + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="NIU">${xml(line.quantity)}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="PEN">${money(line.net)}</cbc:LineExtensionAmount>
      <cac:PricingReference><cac:AlternativeConditionPrice>
        <cbc:PriceAmount currencyID="PEN">${money(cents(line.unitPrice))}</cbc:PriceAmount>
        <cbc:PriceTypeCode listName="Tipo de Precio" listAgencyName="PE:SUNAT" listID="UN/ECE 5153">01</cbc:PriceTypeCode>
      </cac:AlternativeConditionPrice></cac:PricingReference>
      <cac:TaxTotal><cbc:TaxAmount currencyID="PEN">${money(line.tax)}</cbc:TaxAmount>
        <cac:TaxSubtotal><cbc:TaxableAmount currencyID="PEN">${money(line.net)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="PEN">${money(line.tax)}</cbc:TaxAmount>
          <cac:TaxCategory><cbc:Percent>18.00</cbc:Percent>
            <cbc:TaxExemptionReasonCode>10</cbc:TaxExemptionReasonCode>
            <cac:TaxScheme><cbc:ID>1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      <cac:Item><cbc:Description>${xml(line.description)}</cbc:Description></cac:Item>
      <cac:Price><cbc:PriceAmount currencyID="PEN">${line.unitPriceWithoutTax.toFixed(6)}</cbc:PriceAmount></cac:Price>
    </${lineTag}>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent/></ext:UBLExtension></ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${xml(documentId)}</cbc:ID>
  <cbc:IssueDate>${xml(input.issueDate)}</cbc:IssueDate>
  <cbc:InvoiceTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01">${input.documentType}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty><cac:Party>
    <cac:PartyIdentification><cbc:ID schemeID="6">${xml(input.issuerRuc)}</cbc:ID></cac:PartyIdentification>
    <cac:PartyName><cbc:Name>${xml(input.issuerName)}</cbc:Name></cac:PartyName>
    <cac:PartyLegalEntity><cbc:RegistrationName>${xml(input.issuerName)}</cbc:RegistrationName>
      <cac:RegistrationAddress><cac:AddressLine><cbc:Line>${xml(input.issuerAddress)}</cbc:Line></cac:AddressLine></cac:RegistrationAddress>
    </cac:PartyLegalEntity>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cac:PartyIdentification><cbc:ID schemeID="${input.receiverDocumentType}">${xml(input.receiverDocumentNumber)}</cbc:ID></cac:PartyIdentification>
    <cac:PartyLegalEntity><cbc:RegistrationName>${xml(input.receiverName)}</cbc:RegistrationName></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingCustomerParty>
  <cac:TaxTotal><cbc:TaxAmount currencyID="PEN">${money(tax)}</cbc:TaxAmount>
    <cac:TaxSubtotal><cbc:TaxableAmount currencyID="PEN">${money(net)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="PEN">${money(tax)}</cbc:TaxAmount>
      <cac:TaxCategory><cac:TaxScheme><cbc:ID>1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="PEN">${money(net)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="PEN">${money(gross)}</cbc:TaxInclusiveAmount>
    ${amount(money(gross))}
  </cac:LegalMonetaryTotal>
  ${linesXml}
</Invoice>`;
}
