import { create } from "zustand";
import { db } from "@/lib/db";
import type { Quote, QuoteItem, QuoteStatus, QuoteVersion } from "@/types";
import { calcQuoteItem, calcQuoteTotals, generateSequentialQuoteNumber } from "@/lib/calculations";

interface QuoteState {
  quotes: Quote[];
  loading: boolean;
  search: string;
  statusFilter: QuoteStatus | "all";
  setSearch: (s: string) => void;
  setStatusFilter: (s: QuoteStatus | "all") => void;
  load: () => Promise<void>;
  add: (quote: Omit<Quote, "id" | "createdAt" | "updatedAt" | "number" | "versions">) => Promise<number>;
  update: (id: number, quote: Partial<Quote>) => Promise<void>;
  remove: (id: number) => Promise<void>;
  changeStatus: (id: number, status: QuoteStatus) => Promise<void>;
  duplicate: (id: number) => Promise<number>;
  addVersion: (id: number, version: Omit<QuoteVersion, "versionNumber" | "createdAt">) => Promise<void>;
  getById: (id: number) => Quote | undefined;
}

export const useQuoteStore = create<QuoteState>((set, get) => ({
  quotes: [],
  loading: false,
  search: "",
  statusFilter: "all",
  setSearch: (s) => set({ search: s }),
  setStatusFilter: (s) => set({ statusFilter: s }),
  load: async () => {
    set({ loading: true });
    const quotes = await db.quotes.orderBy("createdAt").reverse().toArray();
    set({ quotes, loading: false });
  },
  add: async (quoteData): Promise<number> => {
    const now = new Date();
    const existingNumbers = get().quotes.map((q) => q.number);
    const number = generateSequentialQuoteNumber(existingNumbers);
    // Recalculate items to ensure consistency
    const items = quoteData.items.map(calcQuoteItem);
    const additionalCosts = quoteData.additionalCosts || [];

    // Use calcQuoteTotals for correct totals (includes additional costs + discount)
    // If the caller already computed totals (e.g. advanced pricing), trust those values
    // by checking if they differ significantly from the standard calculation
    const standardTotals = calcQuoteTotals(items, additionalCosts, quoteData.globalDiscountPercent);

    // If caller passed non-zero totals that differ from standard (advanced pricing), use caller's
    const useCallerTotals = quoteData.totalBrutto > 0 &&
      Math.abs(quoteData.totalBrutto - standardTotals.totalBrutto) > 0.01;

    const totalNetto = useCallerTotals ? quoteData.totalNetto : standardTotals.totalNetto;
    const totalVat = useCallerTotals ? quoteData.totalVat : standardTotals.totalVat;
    const totalBrutto = useCallerTotals ? quoteData.totalBrutto : standardTotals.totalBrutto;

    const quote: Quote = {
      ...quoteData,
      number,
      items,
      additionalCosts,
      progressiveDiscounts: quoteData.progressiveDiscounts || [],
      totalNetto,
      totalVat,
      totalBrutto,
      versions: [],
      createdAt: now,
      updatedAt: now,
    };
    const id = await db.quotes.add(quote);
    const saved = { ...quote, id: id! };
    set((s) => ({ quotes: [saved, ...s.quotes] }));
    return id!;
  },
  update: async (id, quoteData) => {
    const existing = await db.quotes.get(id);
    if (!existing) return;
    const updated = { ...existing, ...quoteData, updatedAt: new Date() };
    if (quoteData.items) {
      updated.items = quoteData.items.map(calcQuoteItem);
      // If caller passed explicit totals (e.g. from advanced pricing), trust them
      // Otherwise recalculate using calcQuoteTotals for correctness
      const callerHasTotals = quoteData.totalBrutto !== undefined && quoteData.totalBrutto > 0;
      if (!callerHasTotals) {
        const totals = calcQuoteTotals(updated.items, updated.additionalCosts || [], updated.globalDiscountPercent || 0);
        updated.totalNetto = totals.totalNetto;
        updated.totalVat = totals.totalVat;
        updated.totalBrutto = totals.totalBrutto;
      }
    }
    await db.quotes.update(id, updated);
    set((s) => ({
      quotes: s.quotes.map((q) => (q.id === id ? updated : q)),
    }));
  },
  remove: async (id) => {
    await db.quotes.delete(id);
    set((s) => ({ quotes: s.quotes.filter((q) => q.id !== id) }));
  },
  changeStatus: async (id, status) => {
    const updatedAt = new Date();
    await db.quotes.update(id, { status, updatedAt });
    set((s) => ({
      quotes: s.quotes.map((q) => (q.id === id ? { ...q, status, updatedAt } : q)),
    }));
  },
  duplicate: async (id) => {
    const existing = await db.quotes.get(id);
    if (!existing) return 0;
    const now = new Date();
    const existingNumbers = get().quotes.map((q) => q.number);
    const number = generateSequentialQuoteNumber(existingNumbers);
    const newQuote: Quote = {
      ...existing,
      id: undefined as unknown as number,
      number,
      status: "szkic",
      versions: [],
      createdAt: now,
      updatedAt: now,
    };
    const newId = await db.quotes.add(newQuote);
    const saved = { ...newQuote, id: newId! };
    set((s) => ({ quotes: [saved, ...s.quotes] }));
    return newId!;
  },
  addVersion: async (id, versionData) => {
    const quote = await db.quotes.get(id);
    if (!quote) return;
    const versionNumber = (quote.versions || []).length + 1;
    const version: QuoteVersion = {
      ...versionData,
      versionNumber,
      createdAt: new Date(),
    };
    const updatedVersions = [...(quote.versions || []), version];
    const updatedAt = new Date();
    await db.quotes.update(id, { versions: updatedVersions, updatedAt });
    set((s) => ({
      quotes: s.quotes.map((q) => (q.id === id ? { ...q, versions: updatedVersions, updatedAt } : q)),
    }));
  },
  getById: (id) => get().quotes.find((q) => q.id === id),
}));
