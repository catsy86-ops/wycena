import { create } from "zustand";
import { db } from "@/lib/db";
import type { Quote, QuoteItem, QuoteStatus, QuoteVersion } from "@/types";
import { calcQuoteItem, generateSequentialQuoteNumber } from "@/lib/calculations";

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
    const items = quoteData.items.map(calcQuoteItem);
    const totalNetto = items.reduce((s, i) => s + i.nettotal, 0);
    const totalVat = items.reduce((s, i) => s + i.vatAmount, 0);
    let totalBrutto = items.reduce((s, i) => s + i.bruttoTotal, 0);
    if (quoteData.globalDiscountPercent > 0) {
      totalBrutto = totalBrutto * (1 - quoteData.globalDiscountPercent / 100);
      totalBrutto = Math.round(totalBrutto * 100) / 100;
    }
    const quote: Quote = {
      ...quoteData,
      number,
      items,
      additionalCosts: quoteData.additionalCosts || [],
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
      updated.totalNetto = updated.items.reduce((s, i) => s + i.nettotal, 0);
      updated.totalVat = updated.items.reduce((s, i) => s + i.vatAmount, 0);
      updated.totalBrutto = updated.items.reduce((s, i) => s + i.bruttoTotal, 0);
      if (updated.globalDiscountPercent > 0) {
        updated.totalBrutto = Math.round(updated.totalBrutto * (1 - updated.globalDiscountPercent / 100) * 100) / 100;
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
