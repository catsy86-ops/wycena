import type { VatRate, QuoteItem, QuoteAdditionalCost, ProgressiveDiscount, PricingModelConfig } from "@/types";
import { DEFAULT_PRICING_MODEL } from "@/types";

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

export interface AdvancedPricingResult {
  baseNetto: number;
  baseVat: number;
  baseBrutto: number;
  laborAdjustment: number;
  materialWasteCost: number;
  equipmentCost: number;
  travelCost: number;
  permitCost: number;
  overheadCost: number;
  riskMarginAmount: number;
  complexityAdjustment: number;
  urgencyAdjustment: number;
  inflationAdjustment: number;
  insuranceCost: number;
  warrantyReserve: number;
  profitMarginAmount: number;
  subtotalBeforeDiscount: number;
  volumeDiscountAmount: number;
  finalNetto: number;
  finalVat: number;
  finalBrutto: number;
  marginPercent: number;
  breakdown: Record<string, number>;
}

export function calcAdvancedPricing(
  items: QuoteItem[],
  additionalCosts: QuoteAdditionalCost[],
  globalDiscountPercent: number,
  model: PricingModelConfig = DEFAULT_PRICING_MODEL
): AdvancedPricingResult {
  const baseNetto = calcTotalNetto(items);
  const baseVat = calcTotalVat(items);
  const baseBrutto = calcTotalBrutto(items);
  const additionalCostsNetto = additionalCosts.reduce((s, c) => s + c.amount, 0);

  const laborItems = items.filter((i) => !i.serviceId || true);
  const laborBase = laborItems.reduce((s, i) => s + i.nettotal, 0);
  const laborAdjustment = round(laborBase * (model.laborCostMultiplier - 1));

  const materialItems = items.filter((i) => i.serviceId);
  const materialBase = materialItems.reduce((s, i) => s + i.nettotal, 0);
  const materialWasteCost = round(materialBase * (model.materialWastePercent / 100));

  const equipmentCost = round((baseNetto + additionalCostsNetto) * (model.equipmentCostPercent / 100));

  const travelCost = round(model.travelCostPerKm * model.estimatedDistanceKm);

  const permitCost = model.permitCosts;

  const subtotalForOverhead = baseNetto + additionalCostsNetto + laborAdjustment + materialWasteCost + equipmentCost + travelCost + permitCost;
  const overheadCost = round(subtotalForOverhead * (model.overheadPercent / 100));

  const subtotalForRisk = subtotalForOverhead + overheadCost;
  const riskMarginAmount = round(subtotalForRisk * (model.riskMargin / 100));

  const complexityAdjustment = round(subtotalForRisk * (model.complexityFactor - 1));

  const subtotalBeforeUrgency = subtotalForRisk + riskMarginAmount + complexityAdjustment;
  const urgencyAdjustment = round(subtotalBeforeUrgency * (model.urgencyMultiplier - 1));

  const subtotalBeforeInflation = subtotalBeforeUrgency + urgencyAdjustment;
  const inflationAdjustmentAmount = round(subtotalBeforeInflation * (model.inflationAdjustment / 100));

  const subtotalBeforeInsurance = subtotalBeforeInflation + inflationAdjustmentAmount;
  const insuranceCost = round(subtotalBeforeInsurance * (model.insuranceCostPercent / 100));

  const subtotalBeforeWarranty = subtotalBeforeInsurance + insuranceCost;
  const warrantyReserve = round(subtotalBeforeWarranty * (model.warrantyReservePercent / 100));

  const subtotalBeforeProfit = subtotalBeforeWarranty + warrantyReserve;
  const profitMarginAmount = round(subtotalBeforeProfit * (model.profitMarginPercent / 100));

  const subtotalBeforeDiscount = subtotalBeforeProfit + profitMarginAmount;

  const volumeDiscountPercent = calcProgressiveDiscount(items.reduce((s, i) => s + i.quantity, 0), model.volumeDiscounts);
  const volumeDiscountAmount = round(subtotalBeforeDiscount * (volumeDiscountPercent / 100));

  let finalNetto = subtotalBeforeDiscount - volumeDiscountAmount;

  const globalDiscountAmount = round(finalNetto * (globalDiscountPercent / 100));
  finalNetto = round(finalNetto - globalDiscountAmount);

  const minMarginAmount = round(finalNetto * (model.minimumMarginPercent / 100));
  if (profitMarginAmount < minMarginAmount && model.minimumMarginPercent > 0) {
    finalNetto = round(finalNetto + (minMarginAmount - profitMarginAmount));
  }

  const finalVat = calcItemVat(finalNetto, 23);
  const finalBrutto = calcItemBrutto(finalNetto, finalVat);

  const totalCost = baseNetto + additionalCostsNetto;
  const marginPercent = totalCost > 0 ? round(((finalNetto - totalCost) / finalNetto) * 100) : 0;

  const breakdown: Record<string, number> = {
    "Pozycje bazowe (netto)": baseNetto,
    "Koszty dodatkowe (netto)": additionalCostsNetto,
    "Mnożnik robocizny": laborAdjustment,
    "Straty materiałowe": materialWasteCost,
    "Koszt sprzętu": equipmentCost,
    "Dojazdy": travelCost,
    "Pozwolenia/uzgodnienia": permitCost,
    "Koszty pośrednie": overheadCost,
    "Margines ryzyka": riskMarginAmount,
    "Złożoność projektu": complexityAdjustment,
    "Pilność zlecenia": urgencyAdjustment,
    "Waloryzacja (inflacja)": inflationAdjustmentAmount,
    "Ubezpieczenie": insuranceCost,
    "Rezerwa gwarancyjna": warrantyReserve,
    "Marża zysku": profitMarginAmount,
    "Rabat ilościowy": -volumeDiscountAmount,
    "Rabat globalny": -globalDiscountAmount,
  };

  return {
    baseNetto,
    baseVat,
    baseBrutto,
    laborAdjustment,
    materialWasteCost,
    equipmentCost,
    travelCost,
    permitCost,
    overheadCost,
    riskMarginAmount,
    complexityAdjustment,
    urgencyAdjustment,
    inflationAdjustment: inflationAdjustmentAmount,
    insuranceCost,
    warrantyReserve,
    profitMarginAmount,
    subtotalBeforeDiscount,
    volumeDiscountAmount,
    finalNetto,
    finalVat,
    finalBrutto,
    marginPercent,
    breakdown,
  };
}
