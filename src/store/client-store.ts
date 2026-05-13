import { create } from "zustand";
import { db } from "@/lib/db";
import type { Client } from "@/types";

interface ClientState {
  clients: Client[];
  loading: boolean;
  search: string;
  setSearch: (s: string) => void;
  load: () => Promise<void>;
  add: (client: Omit<Client, "id" | "createdAt" | "updatedAt">) => Promise<number>;
  update: (id: number, client: Partial<Client>) => Promise<void>;
  remove: (id: number) => Promise<void>;
  getById: (id: number) => Client | undefined;
}

export const useClientStore = create<ClientState>((set, get) => ({
  clients: [],
  loading: false,
  search: "",
  setSearch: (s) => set({ search: s }),
  load: async () => {
    set({ loading: true });
    const clients = await db.clients.orderBy("name").toArray();
    set({ clients, loading: false });
  },
  add: async (client): Promise<number> => {
    const now = new Date();
    const id = await db.clients.add({ ...client, createdAt: now, updatedAt: now } as Client);
    await get().load();
    return id!;
  },
  update: async (id, client) => {
    await db.clients.update(id, { ...client, updatedAt: new Date() });
    await get().load();
  },
  remove: async (id) => {
    await db.clients.delete(id);
    await get().load();
  },
  getById: (id) => get().clients.find((c) => c.id === id),
}));