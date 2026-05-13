"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { DataInitializer } from "@/components/data-initializer";
import { Sidebar, MobileNav } from "@/components/layout/sidebar";
import { ConstructionBackground } from "@/components/construction-background";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <DataInitializer>
          <div className="flex h-screen overflow-hidden relative">
            <ConstructionBackground />
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
        </DataInitializer>
        <Toaster richColors position="bottom-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}