import { create } from "zustand";
import { db } from "@/lib/db";
import type { CompanySettings, VatRate } from "@/types";

interface SettingsState {
  settings: CompanySettings | null;
  loading: boolean;
  load: () => Promise<void>;
  save: (settings: Partial<CompanySettings> & { name: string; address: string; phone: string; email: string; defaultVatRate: VatRate; defaultValidityDays: number }) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: false,
  load: async () => {
    set({ loading: true });
    const all = await db.settings.toArray();
    const settings = all[0] || null;
    set({ settings, loading: false });
  },
  save: async (settingsData) => {
    const all = await db.settings.toArray();
    if (all.length > 0) {
      await db.settings.update(all[0].id!, settingsData);
    } else {
      await db.settings.add(settingsData as CompanySettings);
    }
    await get().load();
  },
}));