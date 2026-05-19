import type { VatRate, QuoteItem, QuoteAdditionalCost, ProgressiveDiscount, PricingModelConfig } from "@/types";
import { DEFAULT_PRICING_MODEL } from "@/types";

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
    // Wymagane netto = koszt / (1 - marża%)
    const requiredNetto = round(totalCostBase / (1 - clampDiscount(model.minimumMarginPercent) / 100));
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
