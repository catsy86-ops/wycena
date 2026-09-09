import { create } from "zustand";
import { db } from "@/lib/db";
import type { MeasurementProtocol } from "@/lib/electrical-protocols";

interface ProtocolState {
  protocols: MeasurementProtocol[];
  loading: boolean;
  search: string;
  statusFilter: "all" | "draft" | "completed" | "signed";
  selectedProtocol: MeasurementProtocol | null;

  setSearch: (s: string) => void;
  setStatusFilter: (s: "all" | "draft" | "completed" | "signed") => void;
  setSelectedProtocol: (p: MeasurementProtocol | null) => void;

  load: () => Promise<void>;
  add: (protocol: MeasurementProtocol) => Promise<void>;
  update: (id: string, protocol: Partial<MeasurementProtocol>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  getById: (id: string) => MeasurementProtocol | undefined;
}

export const useProtocolStore = create<ProtocolState>((set, get) => ({
  protocols: [],
  loading: false,
  search: "",
  statusFilter: "all",
  selectedProtocol: null,

  setSearch: (s) => set({ search: s }),
  setStatusFilter: (s) => set({ statusFilter: s }),
  setSelectedProtocol: (p) => set({ selectedProtocol: p }),

  load: async () => {
    set({ loading: true });
    try {
      const protocols = await db.protocols.toArray();
      set({ protocols, loading: false });
    } catch (error) {
      console.error("Error loading protocols:", error);
      set({ loading: false });
    }
  },

  add: async (protocol) => {
    try {
      await db.protocols.put(protocol);
      set((state) => ({
        protocols: [protocol, ...state.protocols.filter((p) => p.id !== protocol.id)],
      }));
    } catch (error) {
      console.error("Error adding protocol:", error);
    }
  },

  update: async (id, updates) => {
    try {
      await db.protocols.update(id, updates);
      set((state) => ({
        protocols: state.protocols.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      }));
    } catch (error) {
      console.error("Error updating protocol:", error);
    }
  },

  remove: async (id) => {
    try {
      await db.protocols.delete(id);
      set((state) => ({
        protocols: state.protocols.filter((p) => p.id !== id),
      }));
    } catch (error) {
      console.error("Error removing protocol:", error);
    }
  },

  getById: (id) => get().protocols.find((p) => p.id === id),
}));
