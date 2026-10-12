/**
 * Validaciones iniciales para comprobantes SUNAT.
 * Módulo aislado: no modifica ventas, caja ni inventario.
 * La validación tributaria completa se realiza también en el servidor.
 */
export type SunatDocumentType = '01' | '03';
export type SunatReceiverType = '1' | '6' | '0';

export interface SunatDocumentDraft {
  issuerRuc: string;
  documentType: SunatDocumentType;
  series: string;
  number: number;
  issueDate: string;
  currency: 'PEN';
  receiverDocumentType: SunatReceiverType;
  receiverDocumentNumber: string;
  receiverName: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export function validateSunatDraft(draft: SunatDocumentDraft): string[] {
  const errors: string[] = [];
  if (!/^\d{11}$/.test(draft.issuerRuc)) errors.push('El RUC emisor debe tener 11 dígitos.');
  const expectedPrefix = draft.documentType === '01' ? 'F' : 'B';
  if (!new RegExp('^' + expectedPrefix + '[A-Z0-9]{3}$').test(draft.series)) {
    errors.push('La serie no corresponde al tipo de comprobante.');
  }
  if (!Number.isSafeInteger(draft.number) || draft.number < 1 || draft.number > 99999999) {
    errors.push('El correlativo debe ser un entero positivo.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.issueDate) ||
      Number.isNaN(Date.parse(draft.issueDate + 'T00:00:00Z')) ||
      new Date(draft.issueDate + 'T00:00:00Z').toISOString().slice(0, 10) !== draft.issueDate) {
    errors.push('La fecha debe ser válida y tener formato AAAA-MM-DD.');
  }
  if (draft.currency !== 'PEN') errors.push('La moneda debe ser PEN.');
  if (!draft.receiverName.trim()) errors.push('Falta el nombre del receptor.');
  if (draft.documentType === '01' &&
      (draft.receiverDocumentType !== '6' || !/^\d{11}$/.test(draft.receiverDocumentNumber))) {
    errors.push('La factura requiere un receptor con RUC de 11 dígitos.');
  }
  if (draft.receiverDocumentType === '1' && !/^\d{8}$/.test(draft.receiverDocumentNumber)) {
    errors.push('El DNI debe tener 8 dígitos.');
  }
  if (draft.receiverDocumentType === '6' && !/^\d{11}$/.test(draft.receiverDocumentNumber)) {
    errors.push('El RUC del receptor debe tener 11 dígitos.');
  }
  if (draft.receiverDocumentType === '0' && draft.receiverDocumentNumber.trim()) {
    errors.push('Sin documento no debe informarse número de documento.');
  }
  if (draft.documentType === '01' && draft.receiverDocumentType === '0') {
    errors.push('No se puede emitir factura a cliente sin documento.');
  }
  if (!draft.items.length) errors.push('Debe existir al menos un producto.');
  if (draft.items.length > 500) errors.push('Demasiados ítems para el generador preliminar.');
  draft.items.forEach((item, index) => {
    if (!item.description.trim()) errors.push('Falta descripción del ítem ' + (index + 1) + '.');
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      errors.push('Cantidad inválida en el ítem ' + (index + 1) + '.');
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice <= 0) {
      errors.push('Precio inválido en el ítem ' + (index + 1) + '.');
    }
  });
  return errors;
}
