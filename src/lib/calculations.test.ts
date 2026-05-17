import { describe, it, expect } from "vitest";
import {
  round, calcItemNetto, calcItemVat, calcItemBrutto, calcQuoteItem,
  calcTotalNetto, calcTotalVat, calcTotalBrutto, calcAdditionalCostsTotal,
  calcGlobalDiscount, calcFinalBrutto, calcProgressiveDiscount, calcMargin,
  formatCurrency, generateSequentialQuoteNumber, generateSequentialInvoiceNumber,
  analyzeProfitability, clampDiscount, calcAdvancedPricing,
} from "./calculations";
import type { QuoteItem, QuoteAdditionalCost } from "@/types";
import { DEFAULT_PRICING_MODEL } from "@/types";

// ─── round ────────────────────────────────────────────────────────────────────

describe("round", () => {
  it("rounds to 2 decimal places", () => {
    expect(round(1.006)).toBe(1.01);
    expect(round(1.004)).toBe(1);
    expect(round(123.456)).toBe(123.46);
    expect(round(0)).toBe(0);
    expect(round(-1.556)).toBe(-1.56);
  });
});

// ─── calcItemNetto ────────────────────────────────────────────────────────────

describe("calcItemNetto", () => {
  it("calculates netto without discount", () => {
    expect(calcItemNetto(100, 2, 0)).toBe(200);
    expect(calcItemNetto(50.5, 3, 0)).toBe(151.5);
  });

  it("applies discount correctly", () => {
    expect(calcItemNetto(100, 1, 10)).toBe(90);
    expect(calcItemNetto(200, 2, 25)).toBe(300);
  });

  it("clamps discount to 0-100", () => {
    expect(calcItemNetto(100, 1, 150)).toBe(0); // clamped to 100%
    expect(calcItemNetto(100, 1, -10)).toBe(100); // clamped to 0%
  });

  it("handles zero price", () => {
    expect(calcItemNetto(0, 5, 10)).toBe(0);
  });
});

// ─── calcItemVat ──────────────────────────────────────────────────────────────

describe("calcItemVat", () => {
  it("calculates VAT for different rates", () => {
    expect(calcItemVat(100, 23)).toBe(23);
    expect(calcItemVat(100, 8)).toBe(8);
    expect(calcItemVat(100, 0)).toBe(0);
    expect(calcItemVat(150.5, 23)).toBe(34.62);
  });
});

// ─── calcItemBrutto ───────────────────────────────────────────────────────────

describe("calcItemBrutto", () => {
  it("sums netto and vat", () => {
    expect(calcItemBrutto(100, 23)).toBe(123);
    expect(calcItemBrutto(200, 16)).toBe(216);
  });
});

// ─── calcQuoteItem ────────────────────────────────────────────────────────────

describe("calcQuoteItem", () => {
  it("recalculates all fields", () => {
    const item: QuoteItem = {
      id: "1", name: "Test", quantity: 3, unit: "szt",
      priceNettoPerUnit: 100, vatRate: 23, discountPercent: 10,
      nettotal: 0, vatAmount: 0, bruttoTotal: 0,
    };
    const result = calcQuoteItem(item);
    expect(result.nettotal).toBe(270); // 100*3*(1-0.1)
    expect(result.vatAmount).toBe(62.1); // 270*0.23
    expect(result.bruttoTotal).toBe(332.1);
  });
});

// ─── calcTotalNetto / Vat / Brutto ────────────────────────────────────────────

describe("calcTotals", () => {
  const items: QuoteItem[] = [
    { id: "1", name: "A", quantity: 1, unit: "szt", priceNettoPerUnit: 100, vatRate: 23, discountPercent: 0, nettotal: 100, vatAmount: 23, bruttoTotal: 123 },
    { id: "2", name: "B", quantity: 2, unit: "szt", priceNettoPerUnit: 50, vatRate: 8, discountPercent: 0, nettotal: 100, vatAmount: 8, bruttoTotal: 108 },
  ];

  it("sums netto", () => { expect(calcTotalNetto(items)).toBe(200); });
  it("sums vat", () => { expect(calcTotalVat(items)).toBe(31); });
  it("sums brutto", () => { expect(calcTotalBrutto(items)).toBe(231); });
  it("handles empty array", () => {
    expect(calcTotalNetto([])).toBe(0);
    expect(calcTotalVat([])).toBe(0);
    expect(calcTotalBrutto([])).toBe(0);
  });
});

// ─── calcAdditionalCostsTotal ─────────────────────────────────────────────────

describe("calcAdditionalCostsTotal", () => {
  it("calculates costs with VAT", () => {
    const costs: QuoteAdditionalCost[] = [
      { id: "1", name: "Dojazd", amount: 100, vatRate: 23, category: "dojazd" },
      { id: "2", name: "Sprzęt", amount: 50, vatRate: 8, category: "sprzet" },
    ];
    const result = calcAdditionalCostsTotal(costs);
    expect(result.netto).toBe(150);
    expect(result.vat).toBe(27); // 23 + 4
    expect(result.brutto).toBe(177);
  });

  it("handles empty array", () => {
    const result = calcAdditionalCostsTotal([]);
    expect(result.netto).toBe(0);
    expect(result.vat).toBe(0);
    expect(result.brutto).toBe(0);
  });
});

// ─── calcGlobalDiscount / calcFinalBrutto ─────────────────────────────────────

describe("discounts", () => {
  it("calculates global discount", () => {
    expect(calcGlobalDiscount(1000, 10)).toBe(100);
    expect(calcGlobalDiscount(1000, 0)).toBe(0);
  });

  it("calculates final brutto", () => {
    expect(calcFinalBrutto(1000, 10)).toBe(900);
    expect(calcFinalBrutto(1000, 0)).toBe(1000);
  });
});

// ─── calcProgressiveDiscount ──────────────────────────────────────────────────

describe("calcProgressiveDiscount", () => {
  const discounts = [
    { minQuantity: 5, discountPercent: 5 },
    { minQuantity: 10, discountPercent: 10 },
    { minQuantity: 20, discountPercent: 15 },
  ];

  it("returns 0 for quantity below minimum", () => {
    expect(calcProgressiveDiscount(3, discounts)).toBe(0);
  });

  it("returns correct tier", () => {
    expect(calcProgressiveDiscount(5, discounts)).toBe(5);
    expect(calcProgressiveDiscount(12, discounts)).toBe(10);
    expect(calcProgressiveDiscount(25, discounts)).toBe(15);
  });

  it("handles empty discounts", () => {
    expect(calcProgressiveDiscount(100, [])).toBe(0);
  });
});

// ─── calcMargin ───────────────────────────────────────────────────────────────

describe("calcMargin", () => {
  it("calculates margin correctly", () => {
    const result = calcMargin(100, 60);
    expect(result.profitAmount).toBe(40);
    expect(result.marginPercent).toBe(40);
  });

  it("handles zero values", () => {
    expect(calcMargin(0, 0).marginPercent).toBe(0);
    expect(calcMargin(0, 0).profitAmount).toBe(0);
  });
});

// ─── generateSequentialQuoteNumber ────────────────────────────────────────────

describe("generateSequentialQuoteNumber", () => {
  it("generates first number", () => {
    const result = generateSequentialQuoteNumber([]);
    expect(result).toMatch(/^WYC\/\d{4}\/\d{2}\/0001$/);
  });

  it("increments from existing", () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const existing = [`WYC/${year}/${month}/0001`, `WYC/${year}/${month}/0003`];
    const result = generateSequentialQuoteNumber(existing);
    expect(result).toBe(`WYC/${year}/${month}/0004`);
  });
});

// ─── generateSequentialInvoiceNumber ──────────────────────────────────────────

describe("generateSequentialInvoiceNumber", () => {
  it("generates first number", () => {
    const result = generateSequentialInvoiceNumber([]);
    expect(result).toMatch(/^FV\/\d{4}\/\d{2}\/0001$/);
  });
});

// ─── analyzeProfitability ─────────────────────────────────────────────────────

describe("analyzeProfitability", () => {
  it("rates excellent for high margin", () => {
    const result = analyzeProfitability(1000, 500, 10);
    expect(result.rating).toBe("excellent");
    expect(result.grossProfit).toBeGreaterThan(0);
  });

  it("rates loss for negative margin", () => {
    const result = analyzeProfitability(100, 200, 10);
    expect(result.rating).toBe("loss");
    expect(result.grossProfit).toBeLessThan(0);
  });
});

// ─── clampDiscount ────────────────────────────────────────────────────────────

describe("clampDiscount", () => {
  it("clamps to 0-100", () => {
    expect(clampDiscount(50)).toBe(50);
    expect(clampDiscount(-10)).toBe(0);
    expect(clampDiscount(150)).toBe(100);
  });
});

// ─── calcAdvancedPricing ──────────────────────────────────────────────────────

describe("calcAdvancedPricing", () => {
  const items: QuoteItem[] = [
    { id: "1", serviceId: 1, name: "Montaż", quantity: 1, unit: "szt", priceNettoPerUnit: 500, vatRate: 8, discountPercent: 0, nettotal: 500, vatAmount: 40, bruttoTotal: 540 },
    { id: "2", name: "Materiał", quantity: 10, unit: "mb", priceNettoPerUnit: 20, vatRate: 23, discountPercent: 0, nettotal: 200, vatAmount: 46, bruttoTotal: 246 },
  ];

  it("returns correct base values", () => {
    const result = calcAdvancedPricing(items, [], 0, DEFAULT_PRICING_MODEL);
    expect(result.baseNetto).toBe(700);
    expect(result.finalNetto).toBeGreaterThan(700); // profit margin applied
    expect(result.finalBrutto).toBeGreaterThan(result.finalNetto);
  });

  it("applies minimum quote amount", () => {
    const model = { ...DEFAULT_PRICING_MODEL, minimumQuoteAmount: 5000 };
    const result = calcAdvancedPricing(items, [], 0, model);
    expect(result.finalNetto).toBe(5000);
    expect(result.minimumApplied).toBe(true);
  });

  it("applies seasonal adjustment", () => {
    const model = { ...DEFAULT_PRICING_MODEL, seasonalAdjustmentPercent: 20 };
    const result = calcAdvancedPricing(items, [], 0, model);
    const baseResult = calcAdvancedPricing(items, [], 0, DEFAULT_PRICING_MODEL);
    expect(result.finalNetto).toBeGreaterThan(baseResult.finalNetto);
  });

  it("applies material markup", () => {
    const model = { ...DEFAULT_PRICING_MODEL, materialMarkupPercent: 50 };
    const result = calcAdvancedPricing(items, [], 0, model);
    expect(result.materialMarkupAmount).toBe(100); // 200 * 50%
  });

  it("applies global discount", () => {
    const result = calcAdvancedPricing(items, [], 10, DEFAULT_PRICING_MODEL);
    const noDiscount = calcAdvancedPricing(items, [], 0, DEFAULT_PRICING_MODEL);
    expect(result.finalNetto).toBeLessThan(noDiscount.finalNetto);
    expect(result.globalDiscountAmount).toBeGreaterThan(0);
  });

  it("includes profitability analysis", () => {
    const result = calcAdvancedPricing(items, [], 0, DEFAULT_PRICING_MODEL);
    expect(result.profitability).toBeDefined();
    expect(result.profitability.rating).toBeDefined();
    expect(result.profitability.grossMarginPercent).toBeGreaterThan(0);
  });

  it("handles empty items", () => {
    const result = calcAdvancedPricing([], [], 0, DEFAULT_PRICING_MODEL);
    expect(result.baseNetto).toBe(0);
    expect(result.finalNetto).toBe(0);
    expect(result.finalBrutto).toBe(0);
  });
});

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe("formatCurrency", () => {
  it("formats PLN correctly", () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain("1");
    expect(result).toContain("234");
    expect(result).toContain("56");
  });

  it("handles zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0,00");
  });
});
