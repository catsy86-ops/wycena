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
    const template: QuoteTemplate = {
      ...templateData,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const id = await db.quoteTemplates.add(template);
    await get().load();
    return id!;
  },
  update: async (id, templateData) => {
    await db.quoteTemplates.update(id, { ...templateData, updatedAt: new Date() });
    await get().load();
  },
  remove: async (id) => {
    await db.quoteTemplates.delete(id);
    await get().load();
  },
  incrementUsage: async (id) => {
    const template = await db.quoteTemplates.get(id);
    if (!template) return;
    await db.quoteTemplates.update(id, { usageCount: template.usageCount + 1, updatedAt: new Date() });
    await get().load();
  },
  getById: (id) => get().templates.find((t) => t.id === id),
}));
