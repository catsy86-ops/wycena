import type { VatRate, QuoteItem } from "@/types";

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

export function calcTotalNetto(items: QuoteItem[]): number {
  return round(items.reduce((sum, item) => sum + item.nettotal, 0));
}

export function calcTotalVat(items: QuoteItem[]): number {
  return round(items.reduce((sum, item) => sum + item.vatAmount, 0));
}

export function calcTotalBrutto(items: QuoteItem[]): number {
  return round(items.reduce((sum, item) => sum + item.bruttoTotal, 0));
}

export function calcGlobalDiscount(totalBrutto: number, discountPercent: number): number {
  if (discountPercent <= 0) return 0;
  return round(totalBrutto * (discountPercent / 100));
}

export function calcFinalBrutto(totalBrutto: number, globalDiscountPercent: number): number {
  if (globalDiscountPercent <= 0) return totalBrutto;
  return round(totalBrutto * (1 - globalDiscountPercent / 100));
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