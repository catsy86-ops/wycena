"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { DataInitializer } from "@/components/data-initializer";
import { Sidebar, MobileNav } from "@/components/layout/sidebar";
import { HydraulicBackground } from "@/components/hydraulic-background";
import { CommandPalette } from "@/components/command-palette";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <DataInitializer>
          <div className="flex h-screen overflow-hidden relative">
            <HydraulicBackground />
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden relative z-10">
              <MobileNav />
              <main className="flex-1 overflow-y-auto bg-transparent">
                <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
                  {children}
                </div>
              </main>
            </div>
          </div>
          <CommandPalette />
        </DataInitializer>
        <Toaster richColors position="bottom-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
