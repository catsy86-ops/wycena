import { create } from "zustand";
import { db } from "@/lib/db";
import type { TimeEntry } from "@/types";
import { calcTimeEntryCost } from "@/lib/calculations";

interface TimeState {
  entries: TimeEntry[];
  loading: boolean;
  search: string;
  categoryFilter: string;
  activeTimer: { quoteId?: number; clientId?: number; clientName: string; description: string; startTime: Date; hourlyRate: number; category: TimeEntry["category"] } | null;
  setSearch: (s: string) => void;
  setCategoryFilter: (c: string) => void;
  startTimer: (data: { quoteId?: number; clientId?: number; clientName: string; description: string; hourlyRate: number; category: TimeEntry["category"] }) => void;
  stopTimer: () => Promise<number | null>;
  load: () => Promise<void>;
  add: (entry: Omit<TimeEntry, "id" | "durationMinutes" | "totalCost" | "createdAt" | "updatedAt">) => Promise<number>;
  update: (id: number, entry: Partial<TimeEntry>) => Promise<void>;
  remove: (id: number) => Promise<void>;
  getById: (id: number) => TimeEntry | undefined;
  getTotalHours: () => number;
  getTotalEarnings: () => number;
}

export const useTimeStore = create<TimeState>((set, get) => ({
  entries: [],
  loading: false,
  search: "",
  categoryFilter: "all",
  activeTimer: null,
  setSearch: (s) => set({ search: s }),
  setCategoryFilter: (c) => set({ categoryFilter: c }),
  startTimer: (data) => {
    set({
      activeTimer: {
        ...data,
        startTime: new Date(),
      },
    });
  },
  stopTimer: async () => {
    const timer = get().activeTimer;
    if (!timer) return null;
    const endTime = new Date();
    const { durationMinutes, totalCost } = calcTimeEntryCost(timer.startTime, endTime, timer.hourlyRate);
    const entry: Omit<TimeEntry, "id" | "createdAt" | "updatedAt"> = {
      quoteId: timer.quoteId,
      clientId: timer.clientId,
      clientName: timer.clientName,
      description: timer.description,
      startTime: timer.startTime,
      endTime,
      durationMinutes,
      hourlyRate: timer.hourlyRate,
      totalCost,
      category: timer.category,
    };
    set({ activeTimer: null });
    return await get().add(entry);
  },
  load: async () => {
    set({ loading: true });
    const entries = await db.timeEntries.orderBy("startTime").reverse().toArray();
    set({ entries, loading: false });
  },
  add: async (entryData): Promise<number> => {
    const now = new Date();
    const endTime = entryData.endTime || now;
    const { durationMinutes, totalCost } = calcTimeEntryCost(entryData.startTime, endTime, entryData.hourlyRate);
    const entry: TimeEntry = {
      ...entryData,
      endTime,
      durationMinutes,
      totalCost,
      createdAt: now,
      updatedAt: now,
    };
    const id = await db.timeEntries.add(entry);
    await get().load();
    return id!;
  },
  update: async (id, entryData) => {
    await db.timeEntries.update(id, { ...entryData, updatedAt: new Date() });
    await get().load();
  },
  remove: async (id) => {
    await db.timeEntries.delete(id);
    await get().load();
  },
  getById: (id) => get().entries.find((e) => e.id === id),
  getTotalHours: () => {
    const totalMinutes = get().entries.reduce((sum, e) => sum + e.durationMinutes, 0);
    return Math.round((totalMinutes / 60) * 100) / 100;
  },
  getTotalEarnings: () => {
    return get().entries.reduce((sum, e) => sum + e.totalCost, 0);
  },
}));
