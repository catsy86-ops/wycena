import { create } from "zustand";
import { db } from "@/lib/db";
import type { Service, ServiceCategory, VatRate } from "@/types";

interface ServiceState {
  services: Service[];
  loading: boolean;
  search: string;
  categoryFilter: ServiceCategory | "all";
  setSearch: (s: string) => void;
  setCategoryFilter: (c: ServiceCategory | "all") => void;
  load: () => Promise<void>;
  add: (service: Omit<Service, "id" | "createdAt" | "updatedAt">) => Promise<number>;
  update: (id: number, service: Partial<Service>) => Promise<void>;
  remove: (id: number) => Promise<void>;
  duplicate: (id: number) => Promise<number>;
  bulkUpdatePrice: (ids: number[], percentChange: number) => Promise<void>;
  bulkUpdateCategory: (ids: number[], category: ServiceCategory) => Promise<void>;
  bulkUpdateVat: (ids: number[], vatRate: number) => Promise<void>;
  bulkDelete: (ids: number[]) => Promise<void>;
  getById: (id: number) => Service | undefined;
}

export const useServiceStore = create<ServiceState>((set, get) => ({
  services: [],
  loading: false,
  search: "",
  categoryFilter: "all",
  setSearch: (s) => set({ search: s }),
  setCategoryFilter: (c) => set({ categoryFilter: c }),
  load: async () => {
    set({ loading: true });
    const services = await db.services.orderBy("name").toArray();
    set({ services, loading: false });
  },
  add: async (service): Promise<number> => {
    const now = new Date();
    const newService = {
      ...service,
      isActive: service.isActive ?? true,
      priceHistory: [{ date: now.toISOString(), priceNetto: service.priceNetto, reason: "Utworzenie usługi" }],
      createdAt: now,
      updatedAt: now,
    } as Service;
    const id = await db.services.add(newService);
    const saved = { ...newService, id: id! };
    set((s) => ({ services: [...s.services, saved].sort((a, b) => a.name.localeCompare(b.name)) }));
    return id!;
  },
  update: async (id, service) => {
    const existing = get().services.find((s) => s.id === id);
    const updatedAt = new Date();

    // Jeśli zmieniono cenę — dodaj do historii
    let priceHistory = existing?.priceHistory || [];
    if (service.priceNetto !== undefined && existing && service.priceNetto !== existing.priceNetto) {
      priceHistory = [...priceHistory, { date: updatedAt.toISOString(), priceNetto: service.priceNetto, reason: "Zmiana ceny" }];
    }

    await db.services.update(id, { ...service, priceHistory, updatedAt });
    set((s) => ({
      services: s.services.map((srv) => (srv.id === id ? { ...srv, ...service, priceHistory, updatedAt } : srv)),
    }));
  },
  remove: async (id) => {
    await db.services.delete(id);
    set((s) => ({ services: s.services.filter((srv) => srv.id !== id) }));
  },
  duplicate: async (id) => {
    const existing = get().services.find((s) => s.id === id);
    if (!existing) return 0;
    const now = new Date();
    const newService: Service = {
      ...existing,
      id: undefined,
      name: `${existing.name} (kopia)`,
      priceHistory: [{ date: now.toISOString(), priceNetto: existing.priceNetto, reason: "Duplikacja" }],
      createdAt: now,
      updatedAt: now,
    };
    const newId = await db.services.add(newService);
    const saved = { ...newService, id: newId! };
    set((s) => ({ services: [...s.services, saved].sort((a, b) => a.name.localeCompare(b.name)) }));
    return newId!;
  },
  bulkUpdatePrice: async (ids, percentChange) => {
    const now = new Date();
    const reason = `Waloryzacja ${percentChange > 0 ? "+" : ""}${percentChange}%`;
    const updates: Promise<void>[] = [];

    set((s) => ({
      services: s.services.map((srv) => {
        if (!ids.includes(srv.id!)) return srv;
        const newPrice = Math.round(srv.priceNetto * (1 + percentChange / 100) * 100) / 100;
        const priceHistory = [...(srv.priceHistory || []), { date: now.toISOString(), priceNetto: newPrice, reason }];
        updates.push(db.services.update(srv.id!, { priceNetto: newPrice, priceHistory, updatedAt: now }) as unknown as Promise<void>);
        return { ...srv, priceNetto: newPrice, priceHistory, updatedAt: now };
      }),
    }));

    await Promise.all(updates);
  },
  bulkUpdateCategory: async (ids, category) => {
    const now = new Date();
    const updates = ids.map((id) => db.services.update(id, { category, updatedAt: now }));
    await Promise.all(updates);
    set((s) => ({
      services: s.services.map((srv) => ids.includes(srv.id!) ? { ...srv, category, updatedAt: now } : srv),
    }));
  },
  bulkUpdateVat: async (ids, vatRate) => {
    const now = new Date();
    const safeVat = vatRate as VatRate;
    const updates = ids.map((id) => db.services.update(id, { vatRate: safeVat, updatedAt: now }));
    await Promise.all(updates);
    set((s) => ({
      services: s.services.map((srv) => ids.includes(srv.id!) ? { ...srv, vatRate: safeVat, updatedAt: now } : srv),
    }));
  },
  bulkDelete: async (ids) => {
    await Promise.all(ids.map((id) => db.services.delete(id)));
    set((s) => ({ services: s.services.filter((srv) => !ids.includes(srv.id!)) }));
  },
  getById: (id) => get().services.find((s) => s.id === id),
}));
