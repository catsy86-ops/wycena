"use client";

import { useEffect, useState } from "react";
import { seedDatabase } from "@/lib/seed";
import { useServiceStore } from "@/store/service-store";
import { useClientStore } from "@/store/client-store";
import { useQuoteStore } from "@/store/quote-store";
import { useSettingsStore } from "@/store/settings-store";

export function DataInitializer({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await seedDatabase();
      await Promise.all([
        useServiceStore.getState().load(),
        useClientStore.getState().load(),
        useQuoteStore.getState().load(),
        useSettingsStore.getState().load(),
      ]);
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Ładowanie danych...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}