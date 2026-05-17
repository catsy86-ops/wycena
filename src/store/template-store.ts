import { create } from "zustand";
import { db } from "@/lib/db";
import type { QuoteTemplate } from "@/types";

interface TemplateState {
  templates: QuoteTemplate[];
  loading: boolean;
  search: string;
  categoryFilter: string;
  setSearch: (s: string) => void;
  setCategoryFilter: (c: string) => void;
  load: () => Promise<void>;
  add: (template: Omit<QuoteTemplate, "id" | "createdAt" | "updatedAt" | "usageCount">) => Promise<number>;
  update: (id: number, template: Partial<QuoteTemplate>) => Promise<void>;
  remove: (id: number) => Promise<void>;
  duplicate: (id: number) => Promise<number>;
  incrementUsage: (id: number) => Promise<void>;
  getById: (id: number) => QuoteTemplate | undefined;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  loading: false,
  search: "",
  categoryFilter: "all",
  setSearch: (s) => set({ search: s }),
  setCategoryFilter: (c) => set({ categoryFilter: c }),
  load: async () => {
    set({ loading: true });
    const templates = await db.quoteTemplates.orderBy("name").toArray();
    set({ templates, loading: false });
  },
  add: async (templateData): Promise<number> => {
    const now = new Date();
    const template: QuoteTemplate = { ...templateData, usageCount: 0, createdAt: now, updatedAt: now };
    const id = await db.quoteTemplates.add(template);
    const saved = { ...template, id: id! };
    set((s) => ({ templates: [...s.templates, saved].sort((a, b) => a.name.localeCompare(b.name)) }));
    return id!;
  },
  update: async (id, templateData) => {
    const updatedAt = new Date();
    await db.quoteTemplates.update(id, { ...templateData, updatedAt });
    set((s) => ({
      templates: s.templates.map((t) => (t.id === id ? { ...t, ...templateData, updatedAt } : t)),
    }));
  },
  remove: async (id) => {
    await db.quoteTemplates.delete(id);
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }));
  },
  duplicate: async (id) => {
    const existing = get().templates.find((t) => t.id === id);
    if (!existing) return 0;
    const now = new Date();
    const newTemplate: QuoteTemplate = {
      ...existing,
      id: undefined as unknown as number,
      name: `${existing.name} (kopia)`,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const newId = await db.quoteTemplates.add(newTemplate);
    const saved = { ...newTemplate, id: newId! };
    set((s) => ({ templates: [...s.templates, saved].sort((a, b) => a.name.localeCompare(b.name)) }));
    return newId!;
  },
  incrementUsage: async (id) => {
    const template = get().templates.find((t) => t.id === id);
    if (!template) return;
    const usageCount = template.usageCount + 1;
    await db.quoteTemplates.update(id, { usageCount, updatedAt: new Date() });
    set((s) => ({
      templates: s.templates.map((t) => (t.id === id ? { ...t, usageCount } : t)),
    }));
  },
  getById: (id) => get().templates.find((t) => t.id === id),
}));
