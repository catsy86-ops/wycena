import type { VatRate, QuoteItem, QuoteAdditionalCost, ProgressiveDiscount, PricingModelConfig } from "@/types";
import { DEFAULT_PRICING_MODEL } from "@/types";

// ─── Podstawowe kalkulacje pozycji ───────────────────────────────────────────

export function calcItemNetto(price: number, quantity: number, discountPercent: number): number {
  const raw = price * quantity;
  const safeDiscount = Math.min(100, Math.max(0, discountPercent));
  if (safeDiscount <= 0) return round(raw);
  return round(raw * (1 - safeDiscount / 100));
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

export function calcAdditionalCostsTotal(
  additionalCosts: QuoteAdditionalCost[]
): { netto: number; vat: number; brutto: number } {
  const netto = additionalCosts.reduce((sum, c) => sum + c.amount, 0);
  const vat = additionalCosts.reduce((sum, c) => sum + calcItemVat(c.amount, c.vatRate), 0);
  return { netto: round(netto), vat: round(vat), brutto: round(netto + vat) };
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
  additionalCosts = 0
): { marginPercent: number; profitAmount: number } {
  const totalCost = purchasePrice + additionalCosts;
  if (totalCost === 0 || salePrice === 0) return { marginPercent: 0, profitAmount: 0 };
  const profitAmount = round(salePrice - totalCost);
  const marginPercent = round((profitAmount / salePrice) * 100);
  return { marginPercent, profitAmount };
}

export function calcCategoryTotals(
  items: QuoteItem[]
): Record<string, { netto: number; brutto: number }> {
  const totals: Record<string, { netto: number; brutto: number }> = {};
  items.forEach((item) => {
    const category = item.serviceId ? "uslugi" : "materialy";
    if (!totals[category]) totals[category] = { netto: 0, brutto: 0 };
    totals[category].netto += item.nettotal;
    totals[category].brutto += item.bruttoTotal;
  });
  Object.keys(totals).forEach((key) => {
    totals[key].netto = round(totals[key].netto);
    totals[key].brutto = round(totals[key].brutto);
  });
  return totals;
}

export function calcTimeEntryCost(
  startTime: Date,
  endTime: Date,
  hourlyRate: number
): { durationMinutes: number; totalCost: number } {
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));
  const totalCost = round((durationMinutes / 60) * hourlyRate);
  return { durationMinutes, totalCost };
}

// ─── Narzędzia ────────────────────────────────────────────────────────────────

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

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
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

/**
 * Generuje sekwencyjny numer wyceny na podstawie istniejących numerów.
 * Format: WYC/YYYY/MM/NNNN — NNNN to kolejny numer w danym miesiącu.
 */
export function generateSequentialQuoteNumber(existingNumbers: string[]): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `WYC/${year}/${month}/`;

  const maxSeq = existingNumbers
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => !isNaN(n))
    .reduce((max, n) => Math.max(max, n), 0);

  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

/**
 * Generuje sekwencyjny numer faktury na podstawie istniejących numerów.
 * Format: FV/YYYY/MM/NNNN
 */
export function generateSequentialInvoiceNumber(existingNumbers: string[]): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `FV/${year}/${month}/`;

  const maxSeq = existingNumbers
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => !isNaN(n))
    .reduce((max, n) => Math.max(max, n), 0);

  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

/**
 * Naprawia błąd groszowy VAT — liczy VAT od sumy netto (metoda "od sumy"),
 * a nie sumuje VAT z poszczególnych pozycji.
 * Zwraca skorygowaną kwotę VAT.
 */
export function calcVatFromSum(totalNetto: number, vatRate: VatRate): number {
  return round(totalNetto * (vatRate / 100));
}

/**
 * Clamp wartości do zakresu — zapobiega ujemnym cenom przy rabacie > 100%.
 */
export function clampDiscount(discountPercent: number): number {
  return Math.min(100, Math.max(0, discountPercent));
}

// ─── Analiza rentowności ──────────────────────────────────────────────────────

export interface ProfitabilityAnalysis {
  /** Całkowity koszt własny (materiały + robocizna bez narzutów) */
  totalCost: number;
  /** Przychód netto */
  revenue: number;
  /** Zysk brutto */
  grossProfit: number;
  /** Marża brutto % */
  grossMarginPercent: number;
  /** Próg rentowności (break-even) */
  breakEvenAmount: number;
  /** Ocena rentowności */
  rating: "excellent" | "good" | "acceptable" | "poor" | "loss";
  /** Sugestia */
  suggestion: string;
}

export function analyzeProfitability(
  revenue: number,
  costBase: number,
  overheadPercent: number
): ProfitabilityAnalysis {
  const overheadAmount = round(costBase * (overheadPercent / 100));
  const totalCost = round(costBase + overheadAmount);
  const grossProfit = round(revenue - totalCost);
  const grossMarginPercent = revenue > 0 ? round((grossProfit / revenue) * 100) : 0;
  const breakEvenAmount = round(totalCost);

  let rating: ProfitabilityAnalysis["rating"];
  let suggestion: string;

  if (grossMarginPercent >= 35) {
    rating = "excellent";
    suggestion = "Doskonała rentowność. Wycena jest bardzo korzystna.";
  } else if (grossMarginPercent >= 20) {
    rating = "good";
    suggestion = "Dobra rentowność. Wycena jest opłacalna.";
  } else if (grossMarginPercent >= 10) {
    rating = "acceptable";
    suggestion = "Akceptowalna rentowność. Rozważ zwiększenie marży.";
  } else if (grossMarginPercent >= 0) {
    rating = "poor";
    suggestion = "Niska rentowność. Zalecane zwiększenie cen lub redukcja kosztów.";
  } else {
    rating = "loss";
    suggestion = "Wycena poniżej kosztów! Konieczna korekta cen.";
  }

  return { totalCost, revenue, grossProfit, grossMarginPercent, breakEvenAmount, rating, suggestion };
}

// ─── Zaawansowany model wyceny ────────────────────────────────────────────────

export interface AdvancedPricingResult {
  // Baza
  baseNetto: number;
  baseVat: number;
  baseBrutto: number;
  additionalCostsNetto: number;
  // Korekty robocizny i materiałów
  laborAdjustment: number;
  materialWasteCost: number;
  materialMarkupAmount: number;
  // Koszty operacyjne
  equipmentCost: number;
  travelCost: number;
  permitCost: number;
  overheadCost: number;
  // Korekty ryzyka i złożoności
  riskMarginAmount: number;
  complexityAdjustment: number;
  urgencyAdjustment: number;
  // Korekty zewnętrzne
  inflationAdjustment: number;
  seasonalAdjustment: number;
  // Zabezpieczenia
  insuranceCost: number;
  warrantyReserve: number;
  // Marża
  profitMarginAmount: number;
  // Rabaty
  subtotalBeforeDiscount: number;
  volumeDiscountAmount: number;
  globalDiscountAmount: number;
  // Wynik końcowy
  finalNetto: number;
  finalVat: number;
  finalBrutto: number;
  // Analityka
  marginPercent: number;
  effectiveMarkupPercent: number;
  breakdown: Record<string, number>;
  profitability: ProfitabilityAnalysis;
  /** Czy zastosowano minimum kwotowe */
  minimumApplied: boolean;
}

/**
 * Ulepszona kalkulacja zaawansowanego modelu wyceny.
 *
 * Naprawione błędy względem poprzedniej wersji:
 * - laborItems filtrował po serviceId (błędna logika) — teraz rozróżnia usługi od materiałów
 * - materialMarkup nie był uwzględniany
 * - seasonalAdjustment nie był uwzględniany
 * - minimumQuoteAmount nie był stosowany do finalBrutto
 * - marginPercent był liczony od kosztu bazowego bez kosztów dodatkowych
 * - VAT był zawsze 23% — teraz używa ważonej stawki VAT z pozycji
 */
export function calcAdvancedPricing(
  items: QuoteItem[],
  additionalCosts: QuoteAdditionalCost[],
  globalDiscountPercent: number,
  model: PricingModelConfig = DEFAULT_PRICING_MODEL
): AdvancedPricingResult {
  // ── 1. Baza ──────────────────────────────────────────────────────────────
  const baseNetto = calcTotalNetto(items);
  const baseVat = calcTotalVat(items);
  const baseBrutto = calcTotalBrutto(items);
  const additionalCostsNetto = round(additionalCosts.reduce((s, c) => s + c.amount, 0));

  // ── 2. Robocizna vs materiały ─────────────────────────────────────────────
  // Pozycje z serviceId = usługi/robocizna; bez serviceId = materiały
  const laborItems = items.filter((i) => i.serviceId !== undefined);
  const materialItems = items.filter((i) => i.serviceId === undefined);

  const laborBase = round(laborItems.reduce((s, i) => s + i.nettotal, 0));
  const materialBase = round(materialItems.reduce((s, i) => s + i.nettotal, 0));

  // Mnożnik robocizny (np. 1.2 = +20% na robociznę)
  const laborAdjustment = round(laborBase * (model.laborCostMultiplier - 1));

  // Straty materiałowe (np. 5% odpadów)
  const materialWasteCost = round(materialBase * (model.materialWastePercent / 100));

  // Narzut na materiały (marża handlowa na materiałach)
  const materialMarkupAmount = round(materialBase * (model.materialMarkupPercent / 100));

  // ── 3. Koszty operacyjne ──────────────────────────────────────────────────
  const equipmentCost = round((baseNetto + additionalCostsNetto) * (model.equipmentCostPercent / 100));
  const travelCost = round(model.travelCostPerKm * model.estimatedDistanceKm);
  const permitCost = round(model.permitCosts);

  // Podstawa do kosztów pośrednich
  const subtotalForOverhead = round(
    baseNetto + additionalCostsNetto +
    laborAdjustment + materialWasteCost + materialMarkupAmount +
    equipmentCost + travelCost + permitCost
  );
  const overheadCost = round(subtotalForOverhead * (model.overheadPercent / 100));

  // ── 4. Ryzyko i złożoność ─────────────────────────────────────────────────
  const subtotalForRisk = round(subtotalForOverhead + overheadCost);
  const riskMarginAmount = round(subtotalForRisk * (model.riskMargin / 100));

  // Złożoność: factor 1.0 = brak, 1.5 = +50%
  const complexityAdjustment = round(subtotalForRisk * (model.complexityFactor - 1));

  // ── 5. Pilność ────────────────────────────────────────────────────────────
  const subtotalBeforeUrgency = round(subtotalForRisk + riskMarginAmount + complexityAdjustment);
  const urgencyAdjustment = round(subtotalBeforeUrgency * (model.urgencyMultiplier - 1));

  // ── 6. Korekty zewnętrzne ─────────────────────────────────────────────────
  const subtotalBeforeInflation = round(subtotalBeforeUrgency + urgencyAdjustment);
  const inflationAdjustmentAmount = round(subtotalBeforeInflation * (model.inflationAdjustment / 100));

  // Korekta sezonowa (może być ujemna — rabat poza sezonem)
  const subtotalBeforeSeasonal = round(subtotalBeforeInflation + inflationAdjustmentAmount);
  const seasonalAdjustment = round(subtotalBeforeSeasonal * (model.seasonalAdjustmentPercent / 100));

  // ── 7. Zabezpieczenia ─────────────────────────────────────────────────────
  const subtotalBeforeInsurance = round(subtotalBeforeSeasonal + seasonalAdjustment);
  const insuranceCost = round(subtotalBeforeInsurance * (model.insuranceCostPercent / 100));

  const subtotalBeforeWarranty = round(subtotalBeforeInsurance + insuranceCost);
  const warrantyReserve = round(subtotalBeforeWarranty * (model.warrantyReservePercent / 100));

  // ── 8. Marża zysku ────────────────────────────────────────────────────────
  const subtotalBeforeProfit = round(subtotalBeforeWarranty + warrantyReserve);
  const profitMarginAmount = round(subtotalBeforeProfit * (model.profitMarginPercent / 100));

  const subtotalBeforeDiscount = round(subtotalBeforeProfit + profitMarginAmount);

  // ── 9. Rabaty ─────────────────────────────────────────────────────────────
  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
  const volumeDiscountPercent = calcProgressiveDiscount(totalQuantity, model.volumeDiscounts);
  const volumeDiscountAmount = round(subtotalBeforeDiscount * (volumeDiscountPercent / 100));

  let finalNetto = round(subtotalBeforeDiscount - volumeDiscountAmount);

  const globalDiscountAmount = round(finalNetto * (globalDiscountPercent / 100));
  finalNetto = round(finalNetto - globalDiscountAmount);

  // ── 10. Minimum marży ─────────────────────────────────────────────────────
  const totalCostBase = round(baseNetto + additionalCostsNetto);
  if (model.minimumMarginPercent > 0 && totalCostBase > 0) {
    const requiredNetto = round(totalCostBase / (1 - model.minimumMarginPercent / 100));
    if (finalNetto < requiredNetto) {
      finalNetto = requiredNetto;
    }
  }

  // ── 11. Minimum kwotowe ───────────────────────────────────────────────────
  let minimumApplied = false;
  if (model.minimumQuoteAmount > 0 && finalNetto < model.minimumQuoteAmount) {
    finalNetto = round(model.minimumQuoteAmount);
    minimumApplied = true;
  }

  // ── 12. VAT — ważona stawka z pozycji ────────────────────────────────────
  // Zamiast zawsze 23%, używamy proporcji VAT z pozycji bazowych
  const weightedVatRate = baseNetto > 0
    ? round((baseVat / baseNetto) * 100)
    : 23;
  const effectiveVatRate = (Math.round(weightedVatRate / 8) * 8) as VatRate; // zaokrąglenie do 0/8/23
  const safeVatRate: VatRate = [0, 8, 23].includes(effectiveVatRate) ? effectiveVatRate : 23;

  const finalVat = calcItemVat(finalNetto, safeVatRate);
  const finalBrutto = calcItemBrutto(finalNetto, finalVat);

  // ── 13. Analityka ─────────────────────────────────────────────────────────
  const marginPercent = finalNetto > 0
    ? round(((finalNetto - totalCostBase) / finalNetto) * 100)
    : 0;

  const effectiveMarkupPercent = totalCostBase > 0
    ? round(((finalNetto - totalCostBase) / totalCostBase) * 100)
    : 0;

  const profitability = analyzeProfitability(finalNetto, totalCostBase, model.overheadPercent);

  // ── 14. Breakdown ─────────────────────────────────────────────────────────
  const breakdown: Record<string, number> = {};

  if (baseNetto > 0)              breakdown["Pozycje bazowe (netto)"] = baseNetto;
  if (additionalCostsNetto > 0)   breakdown["Koszty dodatkowe"] = additionalCostsNetto;
  if (laborAdjustment !== 0)      breakdown["Korekta robocizny"] = laborAdjustment;
  if (materialWasteCost > 0)      breakdown["Straty materiałowe"] = materialWasteCost;
  if (materialMarkupAmount > 0)   breakdown["Narzut na materiały"] = materialMarkupAmount;
  if (equipmentCost > 0)          breakdown["Koszt sprzętu"] = equipmentCost;
  if (travelCost > 0)             breakdown["Dojazdy"] = travelCost;
  if (permitCost > 0)             breakdown["Pozwolenia"] = permitCost;
  if (overheadCost > 0)           breakdown["Koszty pośrednie"] = overheadCost;
  if (riskMarginAmount > 0)       breakdown["Margines ryzyka"] = riskMarginAmount;
  if (complexityAdjustment !== 0) breakdown["Złożoność projektu"] = complexityAdjustment;
  if (urgencyAdjustment !== 0)    breakdown["Pilność zlecenia"] = urgencyAdjustment;
  if (inflationAdjustmentAmount !== 0) breakdown["Waloryzacja"] = inflationAdjustmentAmount;
  if (seasonalAdjustment !== 0)   breakdown["Korekta sezonowa"] = seasonalAdjustment;
  if (insuranceCost > 0)          breakdown["Ubezpieczenie"] = insuranceCost;
  if (warrantyReserve > 0)        breakdown["Rezerwa gwarancyjna"] = warrantyReserve;
  if (profitMarginAmount > 0)     breakdown["Marża zysku"] = profitMarginAmount;
  if (volumeDiscountAmount > 0)   breakdown["Rabat ilościowy"] = -volumeDiscountAmount;
  if (globalDiscountAmount > 0)   breakdown["Rabat globalny"] = -globalDiscountAmount;

  return {
    baseNetto,
    baseVat,
    baseBrutto,
    additionalCostsNetto,
    laborAdjustment,
    materialWasteCost,
    materialMarkupAmount,
    equipmentCost,
    travelCost,
    permitCost,
    overheadCost,
    riskMarginAmount,
    complexityAdjustment,
    urgencyAdjustment,
    inflationAdjustment: inflationAdjustmentAmount,
    seasonalAdjustment,
    insuranceCost,
    warrantyReserve,
    profitMarginAmount,
    subtotalBeforeDiscount,
    volumeDiscountAmount,
    globalDiscountAmount,
    finalNetto,
    finalVat,
    finalBrutto,
    marginPercent,
    effectiveMarkupPercent,
    breakdown,
    profitability,
    minimumApplied,
  };
}
