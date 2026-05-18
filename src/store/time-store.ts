import { create } from "zustand";
import { db } from "@/lib/db";
import type { TimeEntry, TimeTemplate, RecurringTimeEntry } from "@/types";
import { calcTimeEntryCost } from "@/lib/calculations";
import { addDays, addWeeks, addMonths } from "date-fns";

interface TimeState {
  entries: TimeEntry[];
  templates: TimeTemplate[];
  recurringEntries: RecurringTimeEntry[];
  loading: boolean;
  search: string;
  categoryFilter: string;
  selectedEntries: Set<number>;
  dateFilter: "all" | "today" | "week" | "month";
  activeTimer: { quoteId?: number; clientId?: number; clientName: string; description: string; startTime: Date; hourlyRate: number; category: TimeEntry["category"]; pausedAt?: Date; totalPausedMs: number } | null;
  setSearch: (s: string) => void;
  setCategoryFilter: (c: string) => void;
  setDateFilter: (f: "all" | "today" | "week" | "month") => void;
  toggleEntrySelection: (id: number) => void;
  clearSelection: () => void;
  selectAll: (ids: number[]) => void;
  startTimer: (data: { quoteId?: number; clientId?: number; clientName: string; description: string; hourlyRate: number; category: TimeEntry["category"] }) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => Promise<number | null>;
  load: () => Promise<void>;
  add: (entry: Omit<TimeEntry, "id" | "durationMinutes" | "totalCost" | "createdAt" | "updatedAt">) => Promise<number>;
  update: (id: number, entry: Partial<TimeEntry>) => Promise<void>;
  remove: (id: number) => Promise<void>;
  bulkDelete: (ids: number[]) => Promise<void>;
  bulkChangeCategory: (ids: number[], category: TimeEntry["category"]) => Promise<void>;
  bulkDuplicate: (ids: number[]) => Promise<void>;
  getById: (id: number) => TimeEntry | undefined;
  getTotalHours: () => number;
  getTotalEarnings: () => number;
  // Templates
  addTemplate: (template: Omit<TimeTemplate, "id" | "usageCount" | "createdAt" | "updatedAt">) => Promise<number>;
  removeTemplate: (id: number) => Promise<void>;
  loadTemplates: () => Promise<void>;
  // Recurring
  addRecurring: (recurring: Omit<RecurringTimeEntry, "id" | "createdAt" | "updatedAt">) => Promise<number>;
  removeRecurring: (id: number) => Promise<void>;
  loadRecurring: () => Promise<void>;
  generateRecurringEntries: () => Promise<void>;
}

export const useTimeStore = create<TimeState>((set, get) => ({
  entries: [],
  templates: [],
  recurringEntries: [],
  loading: false,
  search: "",
  categoryFilter: "all",
  dateFilter: "all",
  selectedEntries: new Set(),
  activeTimer: null,
  setSearch: (s) => set({ search: s }),
  setCategoryFilter: (c) => set({ categoryFilter: c }),
  setDateFilter: (f) => set({ dateFilter: f }),
  toggleEntrySelection: (id) => {
    const selected = new Set(get().selectedEntries);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    set({ selectedEntries: selected });
  },
  clearSelection: () => set({ selectedEntries: new Set() }),
  selectAll: (ids) => set({ selectedEntries: new Set(ids) }),
  startTimer: (data) => {
    set({
      activeTimer: {
        ...data,
        startTime: new Date(),
        totalPausedMs: 0,
      },
    });
  },
  pauseTimer: () => {
    const timer = get().activeTimer;
    if (!timer || timer.pausedAt) return;
    set({
      activeTimer: {
        ...timer,
        pausedAt: new Date(),
      },
    });
  },
  resumeTimer: () => {
    const timer = get().activeTimer;
    if (!timer || !timer.pausedAt) return;
    const pausedDuration = new Date().getTime() - timer.pausedAt.getTime();
    set({
      activeTimer: {
        ...timer,
        pausedAt: undefined,
        totalPausedMs: timer.totalPausedMs + pausedDuration,
      },
    });
  },
  stopTimer: async () => {
    const timer = get().activeTimer;
    if (!timer) return null;
    const endTime = new Date();
    const totalMs = endTime.getTime() - new Date(timer.startTime).getTime() - timer.totalPausedMs;
    const { durationMinutes, totalCost } = calcTimeEntryCost(new Date(timer.startTime), new Date(timer.startTime.getTime() + totalMs), timer.hourlyRate);
    const entry: Omit<TimeEntry, "id" | "createdAt" | "updatedAt"> = {
      quoteId: timer.quoteId,
      clientId: timer.clientId,
      clientName: timer.clientName,
      description: timer.description,
      startTime: timer.startTime,
      endTime: new Date(timer.startTime.getTime() + totalMs),
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
  bulkDelete: async (ids) => {
    await db.timeEntries.bulkDelete(ids);
    await get().load();
  },
  bulkChangeCategory: async (ids, category) => {
    const now = new Date();
    await Promise.all(ids.map((id) => db.timeEntries.update(id, { category, updatedAt: now })));
    await get().load();
  },
  bulkDuplicate: async (ids) => {
    const entries = ids.map((id) => get().getById(id)).filter(Boolean) as TimeEntry[];
    const now = new Date();
    const newEntries = entries.map((e) => ({
      ...e,
      id: undefined,
      startTime: now,
      endTime: new Date(now.getTime() + e.durationMinutes * 60000),
      createdAt: now,
      updatedAt: now,
    }));
    await db.timeEntries.bulkAdd(newEntries);
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
  // Templates
  addTemplate: async (templateData) => {
    const now = new Date();
    const template: TimeTemplate = {
      ...templateData,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const id = await db.timeTemplates.add(template);
    await get().loadTemplates();
    return id!;
  },
  removeTemplate: async (id) => {
    await db.timeTemplates.delete(id);
    await get().loadTemplates();
  },
  loadTemplates: async () => {
    const templates = await db.timeTemplates.orderBy("usageCount").reverse().toArray();
    set({ templates });
  },
  // Recurring
  addRecurring: async (recurringData) => {
    const now = new Date();
    const recurring: RecurringTimeEntry = {
      ...recurringData,
      createdAt: now,
      updatedAt: now,
    };
    const id = await db.recurringTimeEntries.add(recurring);
    await get().loadRecurring();
    return id!;
  },
  removeRecurring: async (id) => {
    await db.recurringTimeEntries.delete(id);
    await get().loadRecurring();
  },
  loadRecurring: async () => {
    const recurringEntries = await db.recurringTimeEntries.toArray();
    set({ recurringEntries });
  },
  generateRecurringEntries: async () => {
    const recurring = get().recurringEntries.filter((r) => r.isActive);
    const now = new Date();
    
    for (const r of recurring) {
      if (r.endDate && new Date(r.endDate) < now) continue;
      if (r.nextDueDate && new Date(r.nextDueDate) > now) continue;
      
      const template = get().templates.find((t) => t.id === r.templateId);
      if (!template) continue;
      
      // Create entry
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + template.estimatedMinutes * 60000);
      await get().add({
        clientName: template.clientName,
        description: template.name,
        startTime,
        endTime,
        hourlyRate: template.hourlyRate,
        category: template.category,
        estimatedMinutes: template.estimatedMinutes,
      });
      
      // Update next due date
      let nextDue = new Date(r.nextDueDate || now);
      if (r.frequency === "daily") nextDue = addDays(nextDue, 1);
      else if (r.frequency === "weekly") nextDue = addWeeks(nextDue, 1);
      else if (r.frequency === "biweekly") nextDue = addWeeks(nextDue, 2);
      else if (r.frequency === "monthly") nextDue = addMonths(nextDue, 1);
      
      await db.recurringTimeEntries.update(r.id!, {
        nextDueDate: nextDue,
        lastGeneratedDate: now,
        updatedAt: now,
      });
    }
    
    await get().loadRecurring();
  },
}));
