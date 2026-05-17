"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Users, Clock, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Package, Calendar, FileCheck, BarChart3, ClipboardList, Settings, Wrench,
} from "lucide-react";

const MAIN_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Pulpit" },
  { href: "/wyceny", icon: FileText, label: "Wyceny" },
  { href: "/klienci", icon: Users, label: "Klienci" },
  { href: "/czas", icon: Clock, label: "Czas" },
];

const MORE_ITEMS = [
  { href: "/uslugi", icon: Wrench, label: "Usługi" },
  { href: "/materialy", icon: Package, label: "Materiały" },
  { href: "/szablony", icon: ClipboardList, label: "Szablony" },
  { href: "/harmonogram", icon: Calendar, label: "Harmonogram" },
  { href: "/faktury", icon: FileCheck, label: "Faktury" },
  { href: "/raporty", icon: BarChart3, label: "Raporty" },
  { href: "/ustawienia", icon: Settings, label: "Ustawienia" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        background: "oklch(0.13 0.022 228 / 0.97)",
        backdropFilter: "blur(12px)",
        borderColor: "oklch(1 0 0 / 0.08)",
      }}
    >
      <div className="flex items-center justify-around h-14 px-2 max-w-lg mx-auto">
        {MAIN_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors relative",
                isActive ? "text-white" : "text-slate-400"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: "oklch(0.52 0.19 220 / 0.2)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="h-5 w-5 relative z-10" />
              <span className="text-[9px] font-medium relative z-10">{item.label}</span>
            </Link>
          );
        })}

        {/* More button */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger>
            <button className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-slate-400 transition-colors">
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[9px] font-medium">Więcej</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl" style={{ background: "oklch(0.13 0.022 228)", borderColor: "oklch(1 0 0 / 0.08)" }}>
            <div className="grid grid-cols-4 gap-4 py-4">
              {MORE_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors",
                      isActive ? "bg-primary/20 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
