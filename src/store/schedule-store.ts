import { create } from "zustand";
import { db } from "@/lib/db";
import type { ScheduleEvent, ScheduleStatus } from "@/types";

interface ScheduleState {
  events: ScheduleEvent[];
  loading: boolean;
  search: string;
  typeFilter: string;
  statusFilter: string;
  setSearch: (s: string) => void;
  setTypeFilter: (t: string) => void;
  setStatusFilter: (s: string) => void;
  load: () => Promise<void>;
  add: (event: Omit<ScheduleEvent, "id" | "createdAt" | "updatedAt">) => Promise<number>;
  update: (id: number, event: Partial<ScheduleEvent>) => Promise<void>;
  remove: (id: number) => Promise<void>;
  changeStatus: (id: number, status: ScheduleStatus) => Promise<void>;
  getById: (id: number) => ScheduleEvent | undefined;
  getEventsForDate: (date: Date) => ScheduleEvent[];
  getEventsForRange: (start: Date, end: Date) => ScheduleEvent[];
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  events: [],
  loading: false,
  search: "",
  typeFilter: "all",
  statusFilter: "all",
  setSearch: (s) => set({ search: s }),
  setTypeFilter: (t) => set({ typeFilter: t }),
  setStatusFilter: (s) => set({ statusFilter: s }),
  load: async () => {
    set({ loading: true });
    const events = await db.scheduleEvents.orderBy("startTime").toArray();
    set({ events, loading: false });
  },
  add: async (eventData): Promise<number> => {
    const now = new Date();
    const event: ScheduleEvent = {
      ...eventData,
      createdAt: now,
      updatedAt: now,
    };
    const id = await db.scheduleEvents.add(event);
    await get().load();
    return id!;
  },
  update: async (id, eventData) => {
    await db.scheduleEvents.update(id, { ...eventData, updatedAt: new Date() });
    await get().load();
  },
  remove: async (id) => {
    await db.scheduleEvents.delete(id);
    await get().load();
  },
  changeStatus: async (id, status) => {
    await db.scheduleEvents.update(id, { status, updatedAt: new Date() });
    await get().load();
  },
  getById: (id) => get().events.find((e) => e.id === id),
  getEventsForDate: (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    return get().events.filter((e) => {
      const eventStart = new Date(e.startTime);
      return eventStart >= start && eventStart < end;
    });
  },
  getEventsForRange: (start: Date, end: Date) => {
    return get().events.filter((e) => {
      const eventStart = new Date(e.startTime);
      return eventStart >= start && eventStart <= end;
    });
  },
}));
