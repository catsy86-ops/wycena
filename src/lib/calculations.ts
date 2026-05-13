import type { VatRate, QuoteItem, QuoteAdditionalCost, ProgressiveDiscount } from "@/types";

export function calcItemNetto(price: number, quantity: number, discountPercent: number): number {
  const raw = price * quantity;
  if (discountPercent <= 0) return round(raw);
  return round(raw * (1 - discountPercent / 100));
}

export function calcItemVat(netto: number, vatRate: VatRate): number {
  return round(netto * (vatRate / 100));
}

export function calcItemBrutto(netto: number, vatAmount: number): number {
  return round(netto + vatAmount);
}

export function calcQuoteItem(item: QuoteItem): QuoteItem {
  const nettotal = calcItemNetto(item.priceNettoPerUnit, item.quantity, item.discountPercent);
  const vatAmount = calcItemVat(nettotal, item.vatRate);
  const bruttoTotal = calcItemBrutto(nettotal, vatAmount);
  return { ...item, nettotal, vatAmount, bruttoTotal };
}

export function calcAdditionalCost(cost: QuoteAdditionalCost): QuoteAdditionalCost {
  const nettotal = cost.amount;
  const vatAmount = calcItemVat(nettotal, cost.vatRate);
  const bruttoTotal = calcItemBrutto(nettotal, vatAmount);
  return { ...cost, amount: nettotal };
}

export function calcTotalNetto(items: QuoteItem[]): number {
  return round(items.reduce((sum, item) => sum + item.nettotal, 0));
}

export function calcTotalVat(items: QuoteItem[]): number {
  return round(items.reduce((sum, item) => sum + item.vatAmount, 0));
}

export function calcTotalBrutto(items: QuoteItem[]): number {
  return round(items.reduce((sum, item) => sum + item.bruttoTotal, 0));
}

export function calcAdditionalCostsTotal(additionalCosts: QuoteAdditionalCost[]): { netto: number; vat: number; brutto: number } {
  const netto = additionalCosts.reduce((sum, c) => sum + c.amount, 0);
  const vat = additionalCosts.reduce((sum, c) => sum + calcItemVat(c.amount, c.vatRate), 0);
  const brutto = netto + vat;
  return { netto: round(netto), vat: round(vat), brutto: round(brutto) };
}

export function calcGlobalDiscount(totalBrutto: number, discountPercent: number): number {
  if (discountPercent <= 0) return 0;
  return round(totalBrutto * (discountPercent / 100));
}

export function calcFinalBrutto(totalBrutto: number, globalDiscountPercent: number): number {
  if (globalDiscountPercent <= 0) return totalBrutto;
  return round(totalBrutto * (1 - globalDiscountPercent / 100));
}

export function calcProgressiveDiscount(quantity: number, discounts: ProgressiveDiscount[]): number {
  const applicable = discounts
    .filter((d) => quantity >= d.minQuantity)
    .sort((a, b) => b.minQuantity - a.minQuantity);
  return applicable.length > 0 ? applicable[0].discountPercent : 0;
}

export function calcMargin(
  salePrice: number,
  purchasePrice: number,
  additionalCosts: number = 0
): { marginPercent: number; profitAmount: number } {
  const totalCost = purchasePrice + additionalCosts;
  if (totalCost === 0) return { marginPercent: 0, profitAmount: 0 };
  const profitAmount = round(salePrice - totalCost);
  const marginPercent = round((profitAmount / salePrice) * 100);
  return { marginPercent, profitAmount };
}

export function calcCategoryTotals(items: QuoteItem[]): Record<string, { netto: number; brutto: number }> {
  const totals: Record<string, { netto: number; brutto: number }> = {};
  items.forEach((item) => {
    const category = item.serviceId ? "uslugi" : "materialy";
    if (!totals[category]) {
      totals[category] = { netto: 0, brutto: 0 };
    }
    totals[category].netto += item.nettotal;
    totals[category].brutto += item.bruttoTotal;
  });
  Object.keys(totals).forEach((key) => {
    totals[key].netto = round(totals[key].netto);
    totals[key].brutto = round(totals[key].brutto);
  });
  return totals;
}

export function calcTimeEntryCost(startTime: Date, endTime: Date, hourlyRate: number): { durationMinutes: number; totalCost: number } {
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));
  const totalCost = round((durationMinutes / 60) * hourlyRate);
  return { durationMinutes, totalCost };
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value}%`;
}

export function generateQuoteNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `WYC/${year}/${month}/${random}`;
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `FV/${year}/${month}/${random}`;
}
