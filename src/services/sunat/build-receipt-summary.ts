import { calculateTaxedTotals } from './tax-calculation.ts';
import { validateSunatDraft } from './validate-document.ts';
import type { SunatUblDraft } from './build-ubl-draft.ts';
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' })[char]!);

/** Un resumen de una boleta por envío. Solo operaciones gravadas al 18%. */
export function buildReceiptSummary(draft: SunatUblDraft, summaryId: string, issueDate: string): string {
  const errors=validateSunatDraft(draft);
  if(draft.documentType!=='03'||!/^RC-\d{8}-[1-9]\d{0,4}$/.test(summaryId)||!/^\d{4}-\d{2}-\d{2}$/.test(issueDate)||!draft.issuerName.trim())errors.push('Resumen diario inválido.');
  if(errors.length)throw new Error(errors.join(' '));
  const totals=calculateTaxedTotals(draft.items.map(item=>({description:item.description,quantity:item.quantity,unitPriceWithTax:item.unitPrice})));
  const money=(cents:number)=>(cents/100).toFixed(2);
  return `<?xml version="1.0" encoding="UTF-8"?>
<SummaryDocuments xmlns="urn:sunat:names:specification:ubl:peru:schema:xsd:SummaryDocuments-1" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:sac="urn:sunat:names:specification:ubl:peru:schema:xsd:SunatAggregateComponents-1">
<ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent/></ext:UBLExtension></ext:UBLExtensions>
<cbc:UBLVersionID>2.0</cbc:UBLVersionID><cbc:CustomizationID>1.1</cbc:CustomizationID>
<cbc:ID>${summaryId}</cbc:ID><cbc:ReferenceDate>${draft.issueDate}</cbc:ReferenceDate><cbc:IssueDate>${issueDate}</cbc:IssueDate>
<cac:AccountingSupplierParty><cbc:CustomerAssignedAccountID>${draft.issuerRuc}</cbc:CustomerAssignedAccountID><cbc:AdditionalAccountID>6</cbc:AdditionalAccountID><cac:Party><cac:PartyLegalEntity><cbc:RegistrationName>${escape(draft.issuerName)}</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>
<sac:SummaryDocumentsLine><cbc:LineID>1</cbc:LineID><cbc:DocumentTypeCode>03</cbc:DocumentTypeCode><cbc:ID>${draft.series}-${draft.number}</cbc:ID>
${draft.receiverDocumentType==='0'?'':`<cac:AccountingCustomerParty><cbc:CustomerAssignedAccountID>${draft.receiverDocumentNumber}</cbc:CustomerAssignedAccountID><cbc:AdditionalAccountID>${draft.receiverDocumentType}</cbc:AdditionalAccountID></cac:AccountingCustomerParty>`}
<cac:Status><cbc:ConditionCode>1</cbc:ConditionCode></cac:Status>
<sac:TotalAmount currencyID="PEN">${money(totals.grossCents)}</sac:TotalAmount>
<sac:BillingPayment><cbc:PaidAmount currencyID="PEN">${money(totals.taxableCents)}</cbc:PaidAmount><cbc:InstructionID>01</cbc:InstructionID></sac:BillingPayment>
<cac:TaxTotal><cbc:TaxAmount currencyID="PEN">${money(totals.taxCents)}</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxAmount currencyID="PEN">${money(totals.taxCents)}</cbc:TaxAmount><cac:TaxCategory><cbc:Percent>18.00</cbc:Percent><cac:TaxScheme><cbc:ID>1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>
</sac:SummaryDocumentsLine></SummaryDocuments>`;
}
