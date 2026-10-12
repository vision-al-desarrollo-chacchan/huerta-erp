/**
 * Cálculos monetarios preliminares para SUNAT.
 * Los precios ingresados incluyen IGV y solo se admiten operaciones gravadas al 18%.
 * No usar para operaciones exoneradas, inafectas, gratuitas, descuentos ni percepciones.
 */
export interface TaxedLine {
  description: string;
  quantity: number;
  unitPriceWithTax: number;
}
export interface CalculatedTaxedLine extends TaxedLine {
  grossCents: number;
  taxableCents: number;
  taxCents: number;
  unitPriceWithoutTax: number;
}
export interface TaxedTotals {
  lines: CalculatedTaxedLine[];
  grossCents: number;
  taxableCents: number;
  taxCents: number;
}
const IGV_RATE = 0.18;
const MAX_CENTS = 100_000_000_000;

export function calculateTaxedTotals(lines: TaxedLine[]): TaxedTotals {
  if (!lines.length) throw new Error('Se requiere al menos un ítem.');
  const calculated = lines.map((line, i): CalculatedTaxedLine => {
    const n = i + 1;
    if (!line.description.trim()) throw new Error(`Falta descripción en ítem ${n}.`);
    if (!Number.isFinite(line.quantity) || line.quantity <= 0)
      throw new Error(`Cantidad inválida en ítem ${n}.`);
    if (!Number.isFinite(line.unitPriceWithTax) || line.unitPriceWithTax < 0)
      throw new Error(`Precio inválido en ítem ${n}.`);
    const grossCents = Math.round(line.quantity * line.unitPriceWithTax * 100);
    if (!Number.isSafeInteger(grossCents) || grossCents > MAX_CENTS)
      throw new Error(`Importe fuera de rango en ítem ${n}.`);
    const taxableCents = Math.round(grossCents / (1 + IGV_RATE));
    const taxCents = grossCents - taxableCents;
    return {
      ...line,
      grossCents,
      taxableCents,
      taxCents,
      // Mantener precisión para cantidades fraccionarias en el precio unitario.
      unitPriceWithoutTax: taxableCents / 100 / line.quantity,
    };
  });
  const sum = (key: 'grossCents' | 'taxableCents' | 'taxCents') =>
    calculated.reduce((total, line) => total + line[key], 0);
  const grossCents = sum('grossCents');
  const taxableCents = sum('taxableCents');
  const taxCents = sum('taxCents');
  if (!Number.isSafeInteger(grossCents) || grossCents > MAX_CENTS)
    throw new Error('Total del comprobante fuera de rango.');
  return { lines: calculated, grossCents, taxableCents, taxCents };
}

export function formatSunatAmount(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Monto inválido.');
  return (cents / 100).toFixed(2);
}
