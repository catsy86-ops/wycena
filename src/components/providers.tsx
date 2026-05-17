"use client";

import { lazy, Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { DataInitializer } from "@/components/data-initializer";
import { Sidebar, MobileNav } from "@/components/layout/sidebar";
import { HydraulicBackground } from "@/components/hydraulic-background";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { FabButton } from "@/components/fab-button";
import { SkipToContent } from "@/components/skip-to-content";
import { OnboardingTour } from "@/components/onboarding-tour";

// Lazy load non-critical components
const CommandPalette = lazy(() => import("@/components/command-palette").then((m) => ({ default: m.CommandPalette })));
const OfflineIndicator = lazy(() => import("@/components/offline-indicator").then((m) => ({ default: m.OfflineIndicator })));

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <SkipToContent />
        <DataInitializer>
          <div className="flex h-screen overflow-hidden relative">
            <HydraulicBackground />
            <Sidebar />

            <div className="flex flex-1 flex-col overflow-hidden relative z-10 min-w-0">
              <MobileNav />
              <main id="main-content" className="flex-1 overflow-y-auto pb-16 md:pb-0">
                <div
                  className="absolute inset-0 pointer-events-none opacity-30"
                  style={{
                    backgroundImage: "repeating-linear-gradient(-60deg, transparent, transparent 40px, oklch(0.52 0.19 220 / 0.015) 40px, oklch(0.52 0.19 220 / 0.015) 41px)",
                  }}
                />
                <div className="relative z-10 p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
                  <Breadcrumbs />
                  {children}
                </div>
              </main>
            </div>
          </div>

          {/* Mobile bottom nav + FAB */}
          <MobileBottomNav />
          <FabButton />

          {/* Keyboard shortcuts */}
          <KeyboardShortcuts />

          <Suspense fallback={null}>
            <CommandPalette />
            <OfflineIndicator />
          </Suspense>
          <OnboardingTour />
        </DataInitializer>

        <Toaster richColors position="bottom-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
