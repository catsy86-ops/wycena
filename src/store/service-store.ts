import { create } from "zustand";
import { db } from "@/lib/db";
import type { Service, ServiceCategory } from "@/types";

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
    const id = await db.services.add({ ...service, createdAt: now, updatedAt: now } as Service);
    await get().load();
    return id!;
  },
  update: async (id, service) => {
    await db.services.update(id, { ...service, updatedAt: new Date() });
    await get().load();
  },
  remove: async (id) => {
    await db.services.delete(id);
    await get().load();
  },
  getById: (id) => get().services.find((s) => s.id === id),
}));