"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { DataInitializer } from "@/components/data-initializer";
import { Sidebar, MobileNav } from "@/components/layout/sidebar";
import { HydraulicBackground } from "@/components/hydraulic-background";
import { CommandPalette } from "@/components/command-palette";
import { OfflineIndicator } from "@/components/offline-indicator";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <DataInitializer>
          <div className="flex h-screen overflow-hidden relative">
            {/* Tło hydrauliczno-budowlane */}
            <HydraulicBackground />

            {/* Sidebar */}
            <Sidebar />

            {/* Główna treść */}
            <div className="flex flex-1 flex-col overflow-hidden relative z-10 min-w-0">
              {/* Mobile header */}
              <MobileNav />

              {/* Zawartość strony */}
              <main className="flex-1 overflow-y-auto">
                {/* Subtelny wzór rur w tle treści */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-40"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(-60deg, transparent, transparent 40px, oklch(0.52 0.19 220 / 0.02) 40px, oklch(0.52 0.19 220 / 0.02) 41px)",
                  }}
                />
                <div className="relative z-10 p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
                  {children}
                </div>
              </main>
            </div>
          </div>

          <CommandPalette />
          <OfflineIndicator />
        </DataInitializer>

        <Toaster
          richColors
          position="bottom-right"
          toastOptions={{
            style: {
              background: "oklch(0.15 0.022 228)",
              border: "1px solid oklch(0.52 0.19 220 / 0.3)",
              color: "oklch(0.96 0.005 220)",
              borderRadius: "0.625rem",
            },
          }}
        />
      </TooltipProvider>
    </ThemeProvider>
  );
}
