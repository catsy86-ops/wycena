"use client";

import { useEffect, useState, useCallback } from "react";
import { seedDatabase } from "@/lib/seed";
import { useServiceStore } from "@/store/service-store";
import { useClientStore } from "@/store/client-store";
import { useQuoteStore } from "@/store/quote-store";
import { useSettingsStore } from "@/store/settings-store";
import { useMaterialStore } from "@/store/material-store";
import { useInvoiceStore } from "@/store/invoice-store";
import { useTemplateStore } from "@/store/template-store";
import { useTimeStore } from "@/store/time-store";
import { useScheduleStore } from "@/store/schedule-store";
import { useProtocolStore } from "@/store/protocol-store";

/**
 * Optymalizowany DataInitializer:
 * - Faza 1 (krytyczna): settings + quotes + clients — wystarczy do renderowania pulpitu
 * - Faza 2 (w tle): reszta store'ów — ładowana po pierwszym renderze
 * - Nie blokuje renderowania na pełne załadowanie wszystkich danych
 */
export function DataInitializer({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"loading" | "ready">("loading");

  const loadCritical = useCallback(async () => {
    // Zabezpieczenie IndexedDB przed automatycznym czyszczeniem pamięci przez przeglądarki mobilne
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }
    await seedDatabase();
    // Faza 1: krytyczne dane (potrzebne do pulpitu)
    await Promise.all([
      useSettingsStore.getState().load(),
      useQuoteStore.getState().load(),
      useClientStore.getState().load(),
    ]);
    setPhase("ready");
  }, []);

  const loadSecondary = useCallback(async () => {
    // Faza 2: reszta — w tle, nie blokuje UI
    await Promise.all([
      useServiceStore.getState().load(),
      useMaterialStore.getState().load(),
      useInvoiceStore.getState().load(),
      useInvoiceStore.getState().loadPayments(),
      useTemplateStore.getState().load(),
      useTimeStore.getState().load(),
      useScheduleStore.getState().load(),
      useProtocolStore.getState().load(),
    ]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadCritical();
      if (!cancelled) {
        // Ładuj resztę po krótkim opóźnieniu (daj UI czas na render)
        requestIdleCallback
          ? requestIdleCallback(() => { if (!cancelled) loadSecondary(); })
          : setTimeout(() => { if (!cancelled) loadSecondary(); }, 100);
      }
    })();
    return () => { cancelled = true; };
  }, [loadCritical, loadSecondary]);

  if (phase === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-xs">Ładowanie...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
