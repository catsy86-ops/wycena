import type { VatRate, QuoteItem, QuoteAdditionalCost, ProgressiveDiscount, PricingModelConfig } from "@/types";
import { DEFAULT_PRICING_MODEL } from "@/types";
import { subMonths, differenceInDays, format } from "date-fns";

// ─── Precyzja ─────────────────────────────────────────────────────────────────

/**
 * Zaokrągla do 2 miejsc po przecinku (groszy).
 * Używa metody "round half away from zero" — poprawna dla kwot finansowych.
 */
export function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Zaokrągla do N miejsc po przecinku.
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

// ─── Kalkulacje pozycji ───────────────────────────────────────────────────────

/**
 * Oblicza wartość netto pozycji z rabatem.
 * Rabat jest clampowany do [0, 100].
 */
export function calcItemNetto(price: number, quantity: number, discountPercent: number): number {
  if (price < 0 || quantity <= 0) return 0;
  const raw = price * quantity;
  const safeDiscount = Math.min(100, Math.max(0, discountPercent));
  if (safeDiscount <= 0) return round(raw);
  // Mnożnik zamiast odejmowania — unika błędów groszowych
  return round(raw * (1 - safeDiscount / 100));
}

/**
 * Oblicza kwotę VAT od wartości netto.
 * Zaokrąglenie na końcu — nie na pośrednich krokach.
 */
export function calcItemVat(netto: number, vatRate: VatRate): number {
  if (vatRate === 0) return 0;
  return round(netto * (vatRate / 100));
}

/**
 * Oblicza wartość brutto = netto + VAT.
 */
export function calcItemBrutto(netto: number, vatAmount: number): number {
  return round(netto + vatAmount);
}

/**
 * Przelicza wszystkie pola pozycji wyceny.
 * Jedyne miejsce gdzie pozycja jest przeliczana — zapewnia spójność.
 */
export function calcQuoteItem(item: QuoteItem): QuoteItem {
  const nettotal = calcItemNetto(item.priceNettoPerUnit, item.quantity, item.discountPercent);
  const vatAmount = calcItemVat(nettotal, item.vatRate);
  const bruttoTotal = calcItemBrutto(nettotal, vatAmount);
  return { ...item, nettotal, vatAmount, bruttoTotal };
}

// ─── Sumy wyceny ─────────────────────────────────────────────────────────────

/**
 * Suma netto wszystkich pozycji.
 * Sumuje bez pośrednich zaokrągleń, zaokrągla tylko wynik końcowy.
 */
export function calcTotalNetto(items: QuoteItem[]): number {
  return round(items.reduce((sum, item) => sum + item.nettotal, 0));
}

/**
 * Suma VAT wszystkich pozycji.
 * Każda pozycja ma już zaokrąglony VAT — sumujemy i zaokrąglamy wynik.
 */
export function calcTotalVat(items: QuoteItem[]): number {
  return round(items.reduce((sum, item) => sum + item.vatAmount, 0));
}

/**
 * Suma brutto wszystkich pozycji.
 */
export function calcTotalBrutto(items: QuoteItem[]): number {
  return round(items.reduce((sum, item) => sum + item.bruttoTotal, 0));
}

/**
 * Oblicza sumy kosztów dodatkowych (netto, VAT, brutto).
 * Każdy koszt ma własną stawkę VAT.
 */
export function calcAdditionalCostsTotal(
  additionalCosts: QuoteAdditionalCost[]
): { netto: number; vat: number; brutto: number } {
  let netto = 0;
  let vat = 0;
  for (const c of additionalCosts) {
    const costNetto = c.amount;
    const costVat = calcItemVat(costNetto, c.vatRate);
    netto += costNetto;
    vat += costVat;
  }
  const roundedNetto = round(netto);
  const roundedVat = round(vat);
  return {
    netto: roundedNetto,
    vat: roundedVat,
    brutto: round(roundedNetto + roundedVat),
  };
}

/**
 * Oblicza kwotę rabatu globalnego od wartości brutto.
 */
export function calcGlobalDiscount(totalBrutto: number, discountPercent: number): number {
  if (discountPercent <= 0) return 0;
  const safeDiscount = Math.min(100, Math.max(0, discountPercent));
  return round(totalBrutto * (safeDiscount / 100));
}

/**
 * Oblicza końcową wartość brutto po rabacie globalnym.
 */
export function calcFinalBrutto(totalBrutto: number, globalDiscountPercent: number): number {
  if (globalDiscountPercent <= 0) return totalBrutto;
  const safeDiscount = Math.min(100, Math.max(0, globalDiscountPercent));
  return round(totalBrutto * (1 - safeDiscount / 100));
}

/**
 * Oblicza pełne sumy wyceny (netto + VAT + brutto) z uwzględnieniem:
 * - kosztów dodatkowych
 * - rabatu globalnego
 *
 * To jest JEDYNE miejsce gdzie liczymy końcowe sumy wyceny.
 * Używaj tej funkcji w handleSave zamiast osobnych calcTotalNetto/Vat/Brutto.
 */
export function calcQuoteTotals(
  items: QuoteItem[],
  additionalCosts: QuoteAdditionalCost[],
  globalDiscountPercent: number
): { totalNetto: number; totalVat: number; totalBrutto: number; discountAmount: number } {
  const itemsNetto = calcTotalNetto(items);
  const itemsVat = calcTotalVat(items);
  const itemsBrutto = calcTotalBrutto(items);

  const costs = calcAdditionalCostsTotal(additionalCosts);

  const combinedNetto = round(itemsNetto + costs.netto);
  const combinedVat = round(itemsVat + costs.vat);
  const combinedBrutto = round(itemsBrutto + costs.brutto);

  const discountAmount = calcGlobalDiscount(combinedBrutto, globalDiscountPercent);
  const finalBrutto = round(combinedBrutto - discountAmount);

  // Proporcjonalne zmniejszenie netto i VAT przy rabacie
  let finalNetto = combinedNetto;
  let finalVat = combinedVat;
  if (discountAmount > 0 && combinedBrutto > 0) {
    const discountRatio = 1 - discountAmount / combinedBrutto;
    finalNetto = round(combinedNetto * discountRatio);
    finalVat = round(finalBrutto - finalNetto);
  }

  return {
    totalNetto: finalNetto,
    totalVat: finalVat,
    totalBrutto: finalBrutto,
    discountAmount,
  };
}

/**
 * Oblicza rabat progresywny (ilościowy) dla danej ilości.
 * Zwraca najwyższy pasujący próg.
 */
export function calcProgressiveDiscount(quantity: number, discounts: ProgressiveDiscount[]): number {
  if (!discounts || discounts.length === 0) return 0;
  const applicable = discounts
    .filter((d) => quantity >= d.minQuantity)
    .sort((a, b) => b.minQuantity - a.minQuantity);
  return applicable.length > 0 ? applicable[0].discountPercent : 0;
}

/**
 * Oblicza marżę i zysk.
 */
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

/**
 * Grupuje pozycje wyceny wg kategorii (usługi vs materiały).
 */
export function calcCategoryTotals(
  items: QuoteItem[]
): Record<string, { netto: number; brutto: number }> {
  const totals: Record<string, { netto: number; brutto: number }> = {};
  items.forEach((item) => {
    const category = item.serviceId !== undefined ? "uslugi" : "materialy";
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

/**
 * Oblicza koszt wpisu czasu pracy.
 */
export function calcTimeEntryCost(
  startTime: Date,
  endTime: Date,
  hourlyRate: number
): { durationMinutes: number; totalCost: number } {
  const durationMs = Math.max(0, endTime.getTime() - startTime.getTime());
  const durationMinutes = Math.round(durationMs / (1000 * 60));
  const totalCost = round((durationMinutes / 60) * hourlyRate);
  return { durationMinutes, totalCost };
}

// ─── Formatowanie ─────────────────────────────────────────────────────────────

export function formatCurrency(value: number): string {
  if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
    return "0,00 zł";
  }
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
    return "0%";
  }
  return `${value.toFixed(decimals)}%`;
}

// ─── Numeracja ────────────────────────────────────────────────────────────────

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

// ─── Pomocnicze ───────────────────────────────────────────────────────────────

export function clampDiscount(discountPercent: number): number {
  return Math.min(100, Math.max(0, discountPercent));
}

/**
 * Naprawia błąd groszowy VAT — liczy VAT od sumy netto.
 */
export function calcVatFromSum(totalNetto: number, vatRate: VatRate): number {
  return round(totalNetto * (vatRate / 100));
}

// ─── Analiza rentowności ──────────────────────────────────────────────────────

export interface ProfitabilityAnalysis {
  totalCost: number;
  revenue: number;
  grossProfit: number;
  grossMarginPercent: number;
  breakEvenAmount: number;
  rating: "excellent" | "good" | "acceptable" | "poor" | "loss";
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
  baseNetto: number;
  baseVat: number;
  baseBrutto: number;
  additionalCostsNetto: number;
  laborAdjustment: number;
  materialWasteCost: number;
  materialMarkupAmount: number;
  equipmentCost: number;
  travelCost: number;
  permitCost: number;
  overheadCost: number;
  riskMarginAmount: number;
  complexityAdjustment: number;
  urgencyAdjustment: number;
  inflationAdjustment: number;
  seasonalAdjustment: number;
  insuranceCost: number;
  warrantyReserve: number;
  profitMarginAmount: number;
  subtotalBeforeDiscount: number;
  volumeDiscountAmount: number;
  globalDiscountAmount: number;
  finalNetto: number;
  finalVat: number;
  finalBrutto: number;
  marginPercent: number;
  effectiveMarkupPercent: number;
  breakdown: Record<string, number>;
  profitability: ProfitabilityAnalysis;
  minimumApplied: boolean;
}

/**
 * Zaawansowany model wyceny.
 *
 * Kolejność operacji (każdy krok buduje na poprzednim):
 * 1. Baza (pozycje + koszty dodatkowe)
 * 2. Korekty robocizny i materiałów
 * 3. Koszty operacyjne (sprzęt, dojazd, pozwolenia)
 * 4. Koszty pośrednie (overhead)
 * 5. Ryzyko i złożoność
 * 6. Pilność
 * 7. Inflacja i sezonowość
 * 8. Zabezpieczenia (ubezpieczenie, gwarancja)
 * 9. Marża zysku
 * 10. Rabaty (ilościowy, globalny)
 * 11. Minimum marży i minimum kwotowe
 * 12. VAT (ważona stawka z pozycji)
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
  const laborBase = round(items.filter((i) => i.serviceId !== undefined).reduce((s, i) => s + i.nettotal, 0));
  const materialBase = round(items.filter((i) => i.serviceId === undefined).reduce((s, i) => s + i.nettotal, 0));

  const laborAdjustment = round(laborBase * (model.laborCostMultiplier - 1));
  const materialWasteCost = round(materialBase * (model.materialWastePercent / 100));
  const materialMarkupAmount = round(materialBase * (model.materialMarkupPercent / 100));

  // ── 3. Koszty operacyjne ──────────────────────────────────────────────────
  const equipmentCost = round((baseNetto + additionalCostsNetto) * (model.equipmentCostPercent / 100));
  const travelCost = round(model.travelCostPerKm * model.estimatedDistanceKm);
  const permitCost = round(model.permitCosts);

  // ── 4. Koszty pośrednie ───────────────────────────────────────────────────
  const subtotalForOverhead = round(
    baseNetto + additionalCostsNetto +
    laborAdjustment + materialWasteCost + materialMarkupAmount +
    equipmentCost + travelCost + permitCost
  );
  const overheadCost = round(subtotalForOverhead * (model.overheadPercent / 100));

  // ── 5. Ryzyko i złożoność ─────────────────────────────────────────────────
  const subtotalForRisk = round(subtotalForOverhead + overheadCost);
  const riskMarginAmount = round(subtotalForRisk * (model.riskMargin / 100));
  // complexityFactor: 1.0 = brak korekty, 1.5 = +50%
  const complexityAdjustment = round(subtotalForRisk * (model.complexityFactor - 1));

  // ── 6. Pilność ────────────────────────────────────────────────────────────
  const subtotalBeforeUrgency = round(subtotalForRisk + riskMarginAmount + complexityAdjustment);
  // urgencyMultiplier: 1.0 = brak, 2.0 = +100%
  const urgencyAdjustment = round(subtotalBeforeUrgency * (model.urgencyMultiplier - 1));

  // ── 7. Inflacja i sezonowość ──────────────────────────────────────────────
  const subtotalBeforeInflation = round(subtotalBeforeUrgency + urgencyAdjustment);
  const inflationAdjustmentAmount = round(subtotalBeforeInflation * (model.inflationAdjustment / 100));

  const subtotalBeforeSeasonal = round(subtotalBeforeInflation + inflationAdjustmentAmount);
  // seasonalAdjustmentPercent może być ujemny (rabat poza sezonem)
  const seasonalAdjustment = round(subtotalBeforeSeasonal * (model.seasonalAdjustmentPercent / 100));

  // ── 8. Zabezpieczenia ─────────────────────────────────────────────────────
  const subtotalBeforeInsurance = round(subtotalBeforeSeasonal + seasonalAdjustment);
  const insuranceCost = round(subtotalBeforeInsurance * (model.insuranceCostPercent / 100));

  const subtotalBeforeWarranty = round(subtotalBeforeInsurance + insuranceCost);
  const warrantyReserve = round(subtotalBeforeWarranty * (model.warrantyReservePercent / 100));

  // ── 9. Marża zysku ────────────────────────────────────────────────────────
  const subtotalBeforeProfit = round(subtotalBeforeWarranty + warrantyReserve);
  const profitMarginAmount = round(subtotalBeforeProfit * (model.profitMarginPercent / 100));
  const subtotalBeforeDiscount = round(subtotalBeforeProfit + profitMarginAmount);

  // ── 10. Rabaty ────────────────────────────────────────────────────────────
  // Rabat ilościowy — od łącznej ilości wszystkich pozycji
  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
  const volumeDiscountPercent = calcProgressiveDiscount(totalQuantity, model.volumeDiscounts);
  const volumeDiscountAmount = round(subtotalBeforeDiscount * (volumeDiscountPercent / 100));

  let finalNetto = round(subtotalBeforeDiscount - volumeDiscountAmount);

  const safeGlobalDiscount = clampDiscount(globalDiscountPercent);
  const globalDiscountAmount = round(finalNetto * (safeGlobalDiscount / 100));
  finalNetto = round(finalNetto - globalDiscountAmount);

  // ── 11. Minimum marży ─────────────────────────────────────────────────────
  const totalCostBase = round(baseNetto + additionalCostsNetto);
  if (model.minimumMarginPercent > 0 && totalCostBase > 0) {
    // Wymagane netto = koszt / (1 - marża%) — limit 99% zabezpiecza przed dzieleniem przez zero
    const safeMargin = Math.min(99.0, Math.max(0, clampDiscount(model.minimumMarginPercent)));
    const requiredNetto = round(totalCostBase / (1 - safeMargin / 100));
    if (finalNetto < requiredNetto) {
      finalNetto = requiredNetto;
    }
  }

  // ── 11b. Minimum kwotowe ──────────────────────────────────────────────────
  let minimumApplied = false;
  if (model.minimumQuoteAmount > 0 && finalNetto < model.minimumQuoteAmount) {
    finalNetto = round(model.minimumQuoteAmount);
    minimumApplied = true;
  }

  // ── 12. VAT — ważona stawka z pozycji ────────────────────────────────────
  // Obliczamy efektywną stawkę VAT jako stosunek sumy VAT do sumy netto
  // Nie snapujemy do 0/8/23 — używamy rzeczywistej proporcji
  let finalVat: number;
  let finalBrutto: number;

  if (baseNetto > 0) {
    // Efektywna stawka VAT z pozycji (może być mieszana np. 8% + 23%)
    const effectiveVatRatio = baseVat / baseNetto;
    finalVat = round(finalNetto * effectiveVatRatio);
    finalBrutto = round(finalNetto + finalVat);
  } else {
    // Brak pozycji — użyj domyślnej stawki 23%
    finalVat = round(finalNetto * 0.23);
    finalBrutto = round(finalNetto + finalVat);
  }

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
  if (baseNetto > 0)                breakdown["Pozycje bazowe (netto)"] = baseNetto;
  if (additionalCostsNetto > 0)     breakdown["Koszty dodatkowe"] = additionalCostsNetto;
  if (laborAdjustment !== 0)        breakdown["Korekta robocizny"] = laborAdjustment;
  if (materialWasteCost > 0)        breakdown["Straty materiałowe"] = materialWasteCost;
  if (materialMarkupAmount > 0)     breakdown["Narzut na materiały"] = materialMarkupAmount;
  if (equipmentCost > 0)            breakdown["Koszt sprzętu"] = equipmentCost;
  if (travelCost > 0)               breakdown["Dojazdy"] = travelCost;
  if (permitCost > 0)               breakdown["Pozwolenia"] = permitCost;
  if (overheadCost > 0)             breakdown["Koszty pośrednie"] = overheadCost;
  if (riskMarginAmount > 0)         breakdown["Margines ryzyka"] = riskMarginAmount;
  if (complexityAdjustment !== 0)   breakdown["Złożoność projektu"] = complexityAdjustment;
  if (urgencyAdjustment !== 0)      breakdown["Pilność zlecenia"] = urgencyAdjustment;
  if (inflationAdjustmentAmount !== 0) breakdown["Waloryzacja"] = inflationAdjustmentAmount;
  if (seasonalAdjustment !== 0)     breakdown["Korekta sezonowa"] = seasonalAdjustment;
  if (insuranceCost > 0)            breakdown["Ubezpieczenie"] = insuranceCost;
  if (warrantyReserve > 0)          breakdown["Rezerwa gwarancyjna"] = warrantyReserve;
  if (profitMarginAmount > 0)       breakdown["Marża zysku"] = profitMarginAmount;
  if (volumeDiscountAmount > 0)     breakdown["Rabat ilościowy"] = -volumeDiscountAmount;
  if (globalDiscountAmount > 0)     breakdown["Rabat globalny"] = -globalDiscountAmount;

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


// ─── Analiza Rentowności per Usługa ────────────────────────────────────────

export interface ServiceProfitability {
  serviceId?: number;
  serviceName: string;
  count: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgMarginPercent: number;
  avgPrice: number;
  avgCost: number;
  trend: number; // % zmiana vs poprzedni okres
  recommendation: string;
}

export function analyzeServiceProfitability(
  items: QuoteItem[],
  services: any[],
  previousItems?: QuoteItem[]
): ServiceProfitability[] {
  const current: Record<string, { count: number; revenue: number; cost: number }> = {};
  const previous: Record<string, { count: number; revenue: number }> = {};

  items.forEach((item) => {
    const key = item.name;
    if (!current[key]) current[key] = { count: 0, revenue: 0, cost: 0 };
    current[key].count += item.quantity;
    current[key].revenue += item.bruttoTotal;
    // Szacunkowy koszt z usługi
    const service = services.find((s) => s.id === item.serviceId);
    current[key].cost += (service?.costPrice || 0) * item.quantity;
  });

  if (previousItems) {
    previousItems.forEach((item) => {
      const key = item.name;
      if (!previous[key]) previous[key] = { count: 0, revenue: 0 };
      previous[key].count += item.quantity;
      previous[key].revenue += item.bruttoTotal;
    });
  }

  return Object.entries(current)
    .map(([name, data]) => {
      const profit = round(data.revenue - data.cost);
      const marginPercent = data.revenue > 0 ? round((profit / data.revenue) * 100) : 0;
      const avgPrice = data.count > 0 ? round(data.revenue / data.count) : 0;
      const avgCost = data.count > 0 ? round(data.cost / data.count) : 0;

      const prevRevenue = previous[name]?.revenue || 0;
      const trend = prevRevenue > 0 ? round(((data.revenue - prevRevenue) / prevRevenue) * 100) : 0;

      let recommendation = "";
      if (marginPercent >= 35) recommendation = "Utrzymaj cenę — doskonała marża";
      else if (marginPercent >= 20) recommendation = "Dobra rentowność — monitoruj koszty";
      else if (marginPercent >= 10) recommendation = "Rozważ podwyżkę ceny o 5-10%";
      else if (marginPercent >= 0) recommendation = "Pilnie: podnieś cenę lub zmniejsz koszty";
      else recommendation = "Krytyczne: usługa nierenta bilna!";

      return {
        serviceName: name,
        count: data.count,
        totalRevenue: round(data.revenue),
        totalCost: round(data.cost),
        totalProfit: profit,
        avgMarginPercent: marginPercent,
        avgPrice,
        avgCost,
        trend,
        recommendation,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

// ─── Metryki Zaawansowane ─────────────────────────────────────────────────

export interface AdvancedMetrics {
  cac: number; // Customer Acquisition Cost
  ltv: number; // Lifetime Value
  ltv_cac_ratio: number; // LTV/CAC ratio (powinno być > 3)
  churnRate: number; // % klientów którzy nie wrócili
  repeatRate: number; // % klientów którzy wrócili
  avgClientValue: number; // Średnia wartość klienta
  clientRetention: number; // % klientów utrzymanych
  newClientsCount: number;
  returningClientsCount: number;
  churnedClientsCount: number;
}

export function calculateAdvancedMetrics(
  quotes: any[],
  clients: any[],
  timeEntries: any[],
  period: number = 12
): AdvancedMetrics {
  const now = new Date();
  const periodStart = subMonths(now, period);

  // Wyceny w okresie
  const periodQuotes = quotes.filter((q) => new Date(q.createdAt) >= periodStart);
  const acceptedQuotes = periodQuotes.filter((q) => q.status === "zaakceptowana");
  const totalRevenue = acceptedQuotes.reduce((s, q) => s + q.totalBrutto, 0);

  // Koszty pozyskania (marketing, czas sprzedaży)
  const acquisitionCost = timeEntries
    .filter((t) => t.category === "sprzedaż" && new Date(t.startTime) >= periodStart)
    .reduce((s, t) => s + t.totalCost, 0);

  // Nowi klienci w okresie
  const newClients = new Set();
  const returningClients = new Set();
  const allClients = new Set();

  periodQuotes.forEach((q) => {
    if (q.clientId) {
      allClients.add(q.clientId);
      const clientQuotes = quotes.filter((qx) => qx.clientId === q.clientId);
      if (clientQuotes.length === 1) newClients.add(q.clientId);
      else returningClients.add(q.clientId);
    }
  });

  // Churned clients (byli w poprzednim okresie, nie ma ich teraz)
  const previousPeriodStart = subMonths(now, period * 2);
  const previousPeriodEnd = subMonths(now, period);
  const previousClients = new Set(
    quotes
      .filter((q) => new Date(q.createdAt) >= previousPeriodStart && new Date(q.createdAt) < previousPeriodEnd)
      .map((q) => q.clientId)
      .filter(Boolean)
  );
  const churnedClients = new Set([...previousClients].filter((c) => !allClients.has(c)));

  const newClientsCount = newClients.size;
  const returningClientsCount = returningClients.size;
  const churnedClientsCount = churnedClients.size;
  const totalActiveClients = allClients.size;

  // CAC = Acquisition Cost / New Customers
  const cac = newClientsCount > 0 ? round(acquisitionCost / newClientsCount) : 0;

  // LTV = Average Revenue per Client * Retention Period
  const avgClientValue = totalActiveClients > 0 ? round(totalRevenue / totalActiveClients) : 0;
  const ltv = round(avgClientValue * (period / 12)); // Annualized

  const ltv_cac_ratio = cac > 0 ? round((ltv / cac) * 100) / 100 : 0;

  // Churn rate = Churned / Previous Period Clients
  const churnRate = previousClients.size > 0 ? round((churnedClientsCount / previousClients.size) * 100) : 0;

  // Repeat rate = Returning / Total Active
  const repeatRate = totalActiveClients > 0 ? round((returningClientsCount / totalActiveClients) * 100) : 0;

  // Retention = 1 - Churn
  const clientRetention = 100 - churnRate;

  return {
    cac,
    ltv,
    ltv_cac_ratio,
    churnRate,
    repeatRate,
    avgClientValue,
    clientRetention,
    newClientsCount,
    returningClientsCount,
    churnedClientsCount,
  };
}

// ─── Analiza Czasu Pracy ──────────────────────────────────────────────────

export interface TimeAccuracyAnalysis {
  totalEstimated: number; // Suma szacunków (minuty)
  totalActual: number; // Suma rzeczywistych (minuty)
  accuracyPercent: number; // Jak blisko szacunków
  overrunPercent: number; // % przekroczenia
  underrunPercent: number; // % niedoestymacji
  avgAccuracy: number; // Średnia dokładność per entry
  productivityScore: number; // 0-100, gdzie 100 = idealna dokładność
  recommendation: string;
}

export function analyzeTimeAccuracy(timeEntries: any[]): TimeAccuracyAnalysis {
  const withEstimate = timeEntries.filter((t) => t.estimatedMinutes && t.estimatedMinutes > 0);

  if (withEstimate.length === 0) {
    return {
      totalEstimated: 0,
      totalActual: 0,
      accuracyPercent: 0,
      overrunPercent: 0,
      underrunPercent: 0,
      avgAccuracy: 0,
      productivityScore: 0,
      recommendation: "Brak danych — dodaj szacunki czasu do wpisów",
    };
  }

  const totalEstimated = withEstimate.reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
  const totalActual = withEstimate.reduce((s, t) => s + t.durationMinutes, 0);

  const accuracyPercent = totalEstimated > 0 ? round((totalActual / totalEstimated) * 100) : 0;

  let overrunPercent = 0;
  let underrunPercent = 0;
  let sumAccuracy = 0;

  withEstimate.forEach((t) => {
    const ratio = t.durationMinutes / (t.estimatedMinutes || 1);
    if (ratio > 1) overrunPercent += (ratio - 1) * 100;
    else underrunPercent += (1 - ratio) * 100;
    sumAccuracy += Math.min(100, (ratio <= 1 ? ratio : 1 / ratio) * 100);
  });

  overrunPercent = round(overrunPercent / withEstimate.length);
  underrunPercent = round(underrunPercent / withEstimate.length);
  const avgAccuracy = round(sumAccuracy / withEstimate.length);
  const productivityScore = Math.max(0, Math.min(100, avgAccuracy));

  let recommendation = "";
  if (productivityScore >= 90) recommendation = "Doskonała dokładność szacunków — utrzymaj tempo";
  else if (productivityScore >= 75) recommendation = "Dobra dokładność — drobne ulepszenia";
  else if (productivityScore >= 60) recommendation = "Średnia dokładność — pracuj nad szacunkami";
  else recommendation = "Niska dokładność — przeanalizuj przyczyny opóźnień";

  return {
    totalEstimated,
    totalActual,
    accuracyPercent,
    overrunPercent,
    underrunPercent,
    avgAccuracy,
    productivityScore,
    recommendation,
  };
}

// ─── Analiza Klientów ──────────────────────────────────────────────────────

export interface ClientSegment {
  clientId?: number;
  clientName: string;
  segment: "VIP" | "Regular" | "At-Risk" | "Churned";
  totalRevenue: number;
  quoteCount: number;
  avgQuoteValue: number;
  lastQuoteDate: Date;
  daysSinceLastQuote: number;
  frequency: number; // Wyceny per miesiąc
  trend: number; // % zmiana vs poprzedni okres
  churnRisk: number; // 0-100, gdzie 100 = wysoki risk
  recommendation: string;
}

export function analyzeClientSegmentation(quotes: any[], period: number = 12): ClientSegment[] {
  const now = new Date();
  const periodStart = subMonths(now, period);
  const previousStart = subMonths(now, period * 2);
  const previousEnd = subMonths(now, period);

  const clientData: Record<string, any> = {};

  // Dane z bieżącego okresu
  quotes
    .filter((q) => new Date(q.createdAt) >= periodStart)
    .forEach((q) => {
      const key = q.clientId || q.clientName;
      if (!clientData[key]) {
        clientData[key] = {
          clientId: q.clientId,
          clientName: q.clientName,
          revenue: 0,
          count: 0,
          lastDate: new Date(q.createdAt),
          dates: [],
        };
      }
      clientData[key].revenue += q.totalBrutto;
      clientData[key].count += 1;
      clientData[key].dates.push(new Date(q.createdAt));
      if (new Date(q.createdAt) > clientData[key].lastDate) {
        clientData[key].lastDate = new Date(q.createdAt);
      }
    });

  // Dane z poprzedniego okresu (dla trendu)
  const previousData: Record<string, number> = {};
  quotes
    .filter((q) => new Date(q.createdAt) >= previousStart && new Date(q.createdAt) < previousEnd)
    .forEach((q) => {
      const key = q.clientId || q.clientName;
      previousData[key] = (previousData[key] || 0) + q.totalBrutto;
    });

  return Object.entries(clientData)
    .map(([key, data]) => {
      const avgQuoteValue = data.count > 0 ? round(data.revenue / data.count) : 0;
      const daysSinceLastQuote = differenceInDays(now, data.lastDate);
      const frequency = round((data.count / period) * 12); // Per rok
      const prevRevenue = previousData[key] || 0;
      const trend = prevRevenue > 0 ? round(((data.revenue - prevRevenue) / prevRevenue) * 100) : 0;

      // Churn risk: wysoki jeśli nie było wyceny > 90 dni
      let churnRisk = 0;
      if (daysSinceLastQuote > 180) churnRisk = 90;
      else if (daysSinceLastQuote > 120) churnRisk = 70;
      else if (daysSinceLastQuote > 90) churnRisk = 50;
      else if (daysSinceLastQuote > 60) churnRisk = 20;

      // Segmentacja
      let segment: ClientSegment["segment"] = "Regular";
      if (data.revenue > 50000) segment = "VIP";
      else if (churnRisk > 50) segment = "At-Risk";

      let recommendation = "";
      if (segment === "VIP") recommendation = "Priorytet: utrzymaj relację, oferuj specjalne warunki";
      else if (segment === "At-Risk") recommendation = "Pilnie: skontaktuj się, zaproponuj nową usługę";
      else if (trend > 20) recommendation = "Rosnący klient — rozważ upsell";
      else if (trend < -20) recommendation = "Spadek zainteresowania — zbadaj przyczyny";
      else recommendation = "Stabilny klient — utrzymuj kontakt";

      return {
        clientId: data.clientId,
        clientName: data.clientName,
        segment,
        totalRevenue: round(data.revenue),
        quoteCount: data.count,
        avgQuoteValue,
        lastQuoteDate: data.lastDate,
        daysSinceLastQuote,
        frequency,
        trend,
        churnRisk,
        recommendation,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

// ─── Dashboard Operacyjny ─────────────────────────────────────────────────

export interface OperationalAlert {
  id: string;
  type: "warning" | "critical" | "info";
  title: string;
  description: string;
  action?: string;
  actionUrl?: string;
  priority: number; // 1-10
}

export function generateOperationalAlerts(
  quotes: any[],
  invoices: any[],
  timeEntries: any[],
  getTotalPaidForInvoice: (id: number) => number
): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  const now = new Date();

  // 1. Wyceny oczekujące na akcję (wysłane > 14 dni bez odpowiedzi)
  const pendingQuotes = quotes.filter((q) => q.status === "wyslana");
  pendingQuotes.forEach((q) => {
    const daysPending = differenceInDays(now, new Date(q.createdAt));
    if (daysPending > 14) {
      alerts.push({
        id: `pending-${q.id}`,
        type: "warning",
        title: `Wycena ${q.number} oczekuje ${daysPending} dni`,
        description: `Klient: ${q.clientName}. Wysłana: ${format(new Date(q.createdAt), "dd.MM.yyyy")}`,
        action: "Wyślij przypomnienie",
        actionUrl: `/wyceny/${q.id}`,
        priority: 6,
      });
    }
  });

  // 2. Faktury przeterminowane
  const unpaidInvoices = invoices.filter((i) => i.status !== "zaplacona" && i.status !== "anulowana");
  unpaidInvoices.forEach((inv) => {
    const daysOverdue = differenceInDays(now, new Date(inv.dueDate));
    if (daysOverdue > 0) {
      const remaining = inv.totalBrutto - getTotalPaidForInvoice(inv.id!);
      alerts.push({
        id: `overdue-${inv.id}`,
        type: daysOverdue > 30 ? "critical" : "warning",
        title: `Faktura ${inv.number} przeterminowana o ${daysOverdue} dni`,
        description: `Kwota: ${formatCurrency(remaining)}. Termin: ${format(new Date(inv.dueDate), "dd.MM.yyyy")}`,
        action: "Wyślij przypomnienie",
        actionUrl: `/faktury`,
        priority: daysOverdue > 30 ? 10 : 8,
      });
    }
  });

  // 3. Projekty z niską marżą (< 10%)
  const lowMarginQuotes = quotes.filter((q) => q.status === "zaakceptowana" && q.marginPercent !== undefined && q.marginPercent < 10);
  if (lowMarginQuotes.length > 0) {
    alerts.push({
      id: "low-margin",
      type: "warning",
      title: `${lowMarginQuotes.length} projektów z marżą < 10%`,
      description: `Średnia marża: ${round(lowMarginQuotes.reduce((s, q) => s + (q.marginPercent || 0), 0) / lowMarginQuotes.length)}%`,
      action: "Przejrzyj projekty",
      actionUrl: `/raporty?tab=profit`,
      priority: 7,
    });
  }

  // 4. Brak szacunków czasu
  const noEstimate = timeEntries.filter((t) => !t.estimatedMinutes || t.estimatedMinutes === 0);
  if (noEstimate.length > 5) {
    alerts.push({
      id: "no-estimates",
      type: "info",
      title: `${noEstimate.length} wpisów bez szacunków czasu`,
      description: "Dodaj szacunki aby poprawić dokładność prognoz",
      action: "Dodaj szacunki",
      actionUrl: `/czas`,
      priority: 3,
    });
  }

  // 5. Klienci At-Risk
  const clientSegments = analyzeClientSegmentation(quotes);
  const atRiskClients = clientSegments.filter((c) => c.segment === "At-Risk");
  if (atRiskClients.length > 0) {
    alerts.push({
      id: "at-risk-clients",
      type: "warning",
      title: `${atRiskClients.length} klientów w grupie At-Risk`,
      description: `Brak kontaktu > 90 dni. Średni risk: ${round(atRiskClients.reduce((s, c) => s + c.churnRisk, 0) / atRiskClients.length)}%`,
      action: "Przejrzyj klientów",
      actionUrl: `/raporty?tab=clients`,
      priority: 8,
    });
  }

  // 6. Wyceny bez przypisanego czasu pracy
  const acceptedQuotes = quotes.filter((q) => q.status === "zaakceptowana");
  const quotesWithoutTime = acceptedQuotes.filter((q) => !timeEntries.some((t) => t.quoteId === q.id));
  if (quotesWithoutTime.length > 3) {
    alerts.push({
      id: "no-time-entries",
      type: "info",
      title: `${quotesWithoutTime.length} wycen bez czasu pracy`,
      description: "Przypisz czas pracy aby poprawić analizę rentowności",
      action: "Dodaj czas",
      actionUrl: `/czas`,
      priority: 4,
    });
  }

  return alerts.sort((a, b) => b.priority - a.priority);
}


// ─── Raport Rentowności per Pracownik ──────────────────────────────────────

export interface EmployeeProfitability {
  employeeId?: string;
  employeeName: string;
  totalHours: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  marginPercent: number;
  revenuePerHour: number;
  quoteCount: number;
  avgQuoteValue: number;
  trend: number; // % change vs previous period
  recommendation: string;
}

export function analyzeEmployeeProfitability(
  timeEntries: any[],
  quotes: any[],
  previousTimeEntries: any[] = []
): EmployeeProfitability[] {
  const employeeData: Record<string, {
    hours: number;
    cost: number;
    revenue: number;
    quoteCount: number;
    quoteIds: Set<string>;
  }> = {};

  // Current period
  timeEntries.forEach((t) => {
    const key = t.employeeName || "Nieznany";
    if (!employeeData[key]) {
      employeeData[key] = { hours: 0, cost: 0, revenue: 0, quoteCount: 0, quoteIds: new Set() };
    }
    employeeData[key].hours += t.durationMinutes / 60;
    employeeData[key].cost += t.totalCost;
    if (t.quoteId) employeeData[key].quoteIds.add(t.quoteId);
  });

  // Add revenue from quotes
  quotes.filter((q) => q.status === "zaakceptowana").forEach((q) => {
    const timeEntry = timeEntries.find((t) => t.quoteId === q.id);
    if (timeEntry) {
      const key = timeEntry.employeeName || "Nieznany";
      if (employeeData[key]) {
        employeeData[key].revenue += q.totalBrutto;
        employeeData[key].quoteCount = employeeData[key].quoteIds.size;
      }
    }
  });

  // Previous period for trend
  const previousData: Record<string, { hours: number; cost: number; revenue: number }> = {};
  previousTimeEntries.forEach((t) => {
    const key = t.employeeName || "Nieznany";
    if (!previousData[key]) previousData[key] = { hours: 0, cost: 0, revenue: 0 };
    previousData[key].hours += t.durationMinutes / 60;
    previousData[key].cost += t.totalCost;
  });

  return Object.entries(employeeData)
    .map(([name, data]) => {
      const totalProfit = data.revenue - data.cost;
      const marginPercent = data.revenue > 0 ? round((totalProfit / data.revenue) * 100) : 0;
      const revenuePerHour = data.hours > 0 ? round(data.revenue / data.hours) : 0;
      const avgQuoteValue = data.quoteCount > 0 ? round(data.revenue / data.quoteCount) : 0;

      // Trend calculation
      const prevData = previousData[name];
      let trend = 0;
      if (prevData && prevData.revenue > 0) {
        trend = round(((data.revenue - prevData.revenue) / prevData.revenue) * 100);
      }

      // Recommendation
      let recommendation = "";
      if (marginPercent >= 40) {
        recommendation = "Doskonała rentowność — utrzymaj tempo";
      } else if (marginPercent >= 30) {
        recommendation = "Dobra rentowność — monitoruj koszty";
      } else if (marginPercent >= 20) {
        recommendation = "Średnia rentowność — optymalizuj procesy";
      } else if (marginPercent >= 10) {
        recommendation = "Niska rentowność — przeanalizuj przyczyny";
      } else {
        recommendation = "Krytycznie niska rentowność — pilna akcja";
      }

      return {
        employeeName: name,
        totalHours: round(data.hours),
        totalRevenue: round(data.revenue),
        totalCost: round(data.cost),
        totalProfit: round(totalProfit),
        marginPercent,
        revenuePerHour,
        quoteCount: data.quoteCount,
        avgQuoteValue,
        trend,
        recommendation,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

// ─── Raport Materiałów ────────────────────────────────────────────────────

export interface MaterialReport {
  materialId?: number;
  materialName: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  usageCount: number;
  avgPricePerUnit: number;
  trend: number; // % price change
  recommendation: string;
}

export function analyzeMaterialUsage(
  quotes: any[],
  materials: any[],
  previousQuotes: any[] = []
): MaterialReport[] {
  const materialUsage: Record<string, {
    quantity: number;
    cost: number;
    count: number;
    prices: number[];
  }> = {};

  // Current period
  quotes.filter((q) => q.status === "zaakceptowana").forEach((q) => {
    q.items.forEach((item: any) => {
      const key = item.name;
      if (!materialUsage[key]) {
        materialUsage[key] = { quantity: 0, cost: 0, count: 0, prices: [] };
      }
      materialUsage[key].quantity += item.quantity;
      materialUsage[key].cost += item.nettoTotal || item.bruttoTotal;
      materialUsage[key].count += 1;
      materialUsage[key].prices.push(item.unitPrice || 0);
    });
  });

  // Previous period for trend
  const previousUsage: Record<string, { cost: number }> = {};
  previousQuotes.filter((q) => q.status === "zaakceptowana").forEach((q) => {
    q.items.forEach((item: any) => {
      const key = item.name;
      if (!previousUsage[key]) previousUsage[key] = { cost: 0 };
      previousUsage[key].cost += item.nettoTotal || item.bruttoTotal;
    });
  });

  return Object.entries(materialUsage)
    .map(([name, data]) => {
      const avgPrice = data.quantity > 0 ? round(data.cost / data.quantity) : 0;
      const avgPricePerUnit = data.prices.length > 0 ? round(data.prices.reduce((s, p) => s + p, 0) / data.prices.length) : 0;

      // Trend calculation
      const prevData = previousUsage[name];
      let trend = 0;
      if (prevData && prevData.cost > 0) {
        trend = round(((data.cost - prevData.cost) / prevData.cost) * 100);
      }

      // Recommendation
      let recommendation = "";
      if (trend > 20) {
        recommendation = "Cena rośnie szybko — rozważ zmianę dostawcy";
      } else if (trend > 10) {
        recommendation = "Cena rośnie — monitoruj rynek";
      } else if (trend < -10) {
        recommendation = "Cena spada — dobra okazja";
      } else {
        recommendation = "Cena stabilna";
      }

      return {
        materialName: name,
        quantity: round(data.quantity),
        unitPrice: avgPricePerUnit,
        totalCost: round(data.cost),
        usageCount: data.count,
        avgPricePerUnit,
        trend,
        recommendation,
      };
    })
    .sort((a, b) => b.totalCost - a.totalCost);
}

// ─── Funnel Analysis (Konwersja) ──────────────────────────────────────────

export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
  conversionRate: number; // % of previous stage
  avgDays: number;
  revenue: number;
}

export function analyzeFunnel(quotes: any[]): FunnelStage[] {
  const stages = {
    draft: quotes.filter((q) => q.status === "szkic"),
    sent: quotes.filter((q) => q.status === "wyslana"),
    accepted: quotes.filter((q) => q.status === "zaakceptowana"),
    rejected: quotes.filter((q) => q.status === "odrzucona"),
  };

  const stageLabels = [
    { key: "draft", label: "Szkic", revenue: false },
    { key: "sent", label: "Wysłana", revenue: false },
    { key: "accepted", label: "Zaakceptowana", revenue: true },
    { key: "rejected", label: "Odrzucona", revenue: false },
  ];

  const now = new Date();
  const funnel: FunnelStage[] = [];
  let previousCount = 0;

  stageLabels.forEach((stage) => {
    const stageQuotes = (stages as any)[stage.key];
    const count = stageQuotes.length;
    const percentage = quotes.length > 0 ? round((count / quotes.length) * 100) : 0;
    const conversionRate = previousCount > 0 ? round((count / previousCount) * 100) : 100;

    // Calculate average days in stage
    let avgDays = 0;
    if (count > 0) {
      const totalDays = (stageQuotes as Array<{ createdAt: string | Date }>).reduce((sum: number, q: { createdAt: string | Date }) => {
        const createdDate = new Date(q.createdAt);
        const days = differenceInDays(now, createdDate);
        return sum + days;
      }, 0);
      avgDays = round(totalDays / count);
    }

    // Calculate revenue for this stage
    const revenue = stage.revenue
      ? (stageQuotes as Array<{ totalBrutto: number }>).reduce((sum: number, q: { totalBrutto: number }) => sum + q.totalBrutto, 0)
      : 0;

    funnel.push({
      stage: stage.label,
      count,
      percentage,
      conversionRate,
      avgDays,
      revenue: round(revenue),
    });

    previousCount = count;
  });

  return funnel;
}

// ─── Heatmap Marż (Usługa × Klient) ───────────────────────────────────────

export interface MarginHeatmapCell {
  service: string;
  client: string;
  margin: number;
  revenue: number;
  count: number;
  recommendation: string;
}

export function analyzeMarginHeatmap(quotes: any[], services: any[]): MarginHeatmapCell[] {
  const heatmap: Record<string, {
    margin: number;
    revenue: number;
    count: number;
  }> = {};

  quotes.filter((q) => q.status === "zaakceptowana").forEach((q) => {
    q.items.forEach((item: any) => {
      const key = `${item.name}|${q.clientName}`;
      if (!heatmap[key]) {
        heatmap[key] = { margin: 0, revenue: 0, count: 0 };
      }
      heatmap[key].revenue += item.bruttoTotal;
      heatmap[key].count += 1;

      // Calculate margin
      const service = services.find((s) => s.id === item.serviceId);
      if (service) {
        const cost = (service.costPrice || 0) * item.quantity;
        const profit = item.bruttoTotal - cost;
        const margin = item.bruttoTotal > 0 ? (profit / item.bruttoTotal) * 100 : 0;
        heatmap[key].margin = (heatmap[key].margin + margin) / 2;
      }
    });
  });

  return Object.entries(heatmap)
    .map(([key, data]) => {
      const [service, client] = key.split("|");
      let recommendation = "";
      if (data.margin >= 40) {
        recommendation = "Doskonała marża — utrzymaj";
      } else if (data.margin >= 30) {
        recommendation = "Dobra marża — monitoruj";
      } else if (data.margin >= 20) {
        recommendation = "Średnia marża — optymalizuj";
      } else if (data.margin >= 10) {
        recommendation = "Niska marża — podnieś cenę";
      } else {
        recommendation = "Krytycznie niska — pilna akcja";
      }

      return {
        service,
        client,
        margin: round(data.margin),
        revenue: round(data.revenue),
        count: data.count,
        recommendation,
      };
    })
    .sort((a, b) => b.margin - a.margin);
}
