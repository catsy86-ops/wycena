import { create } from "zustand";
import { db } from "@/lib/db";
import type { Material } from "@/types";

interface MaterialState {
  materials: Material[];
  loading: boolean;
  search: string;
  categoryFilter: string;
  setSearch: (s: string) => void;
  setCategoryFilter: (c: string) => void;
  load: () => Promise<void>;
  add: (material: Omit<Material, "id" | "createdAt" | "updatedAt">) => Promise<number>;
  update: (id: number, material: Partial<Material>) => Promise<void>;
  remove: (id: number) => Promise<void>;
  getById: (id: number) => Material | undefined;
  getCategories: () => string[];
  getLowStock: () => Material[];
}

export const useMaterialStore = create<MaterialState>((set, get) => ({
  materials: [],
  loading: false,
  search: "",
  categoryFilter: "all",
  setSearch: (s) => set({ search: s }),
  setCategoryFilter: (c) => set({ categoryFilter: c }),
  load: async () => {
    set({ loading: true });
    const materials = await db.materials.orderBy("name").toArray();
    set({ materials, loading: false });
  },
  add: async (material): Promise<number> => {
    const now = new Date();
    const id = await db.materials.add({ ...material, createdAt: now, updatedAt: now } as Material);
    await get().load();
    return id!;
  },
  update: async (id, material) => {
    await db.materials.update(id, { ...material, updatedAt: new Date() });
    await get().load();
  },
  remove: async (id) => {
    await db.materials.delete(id);
    await get().load();
  },
  getById: (id) => get().materials.find((m) => m.id === id),
  getCategories: () => {
    const cats = new Set(get().materials.map((m) => m.category));
    return Array.from(cats).sort();
  },
  getLowStock: () => get().materials.filter((m) => m.stockQuantity <= m.minStockLevel),
}));
