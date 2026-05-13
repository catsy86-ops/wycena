"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Settings,
  Menu,
  Droplets,
  Calendar,
  Clock,
  FileCheck,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/", label: "Pulpit", icon: LayoutDashboard },
  { href: "/uslugi", label: "Usługi", icon: Package },
  { href: "/klienci", label: "Klienci", icon: Users },
  { href: "/wyceny", label: "Wyceny", icon: FileText },
  { href: "/materialy", label: "Materiały", icon: Package },
  { href: "/harmonogram", label: "Harmonogram", icon: Calendar },
  { href: "/czas", label: "Czas pracy", icon: Clock },
  { href: "/faktury", label: "Faktury", icon: FileCheck },
  { href: "/raporty", label: "Raporty", icon: BarChart3 },
  { href: "/szablony", label: "Szablony", icon: ClipboardList },
  { href: "/ustawienia", label: "Ustawienia", icon: Settings },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item, index) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, duration: 0.3 }}
          >
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 overflow-hidden",
                isActive
                  ? "text-white shadow-lg shadow-blue-500/25"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <motion.div
                whileHover={{ rotate: 10, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Icon className="h-4 w-4 shrink-0" />
              </motion.div>
              <span>{item.label}</span>
              {isActive && (
                <motion.div
                  className="absolute right-2 h-1.5 w-1.5 rounded-full bg-white"
                  layoutId="active-dot"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          </motion.div>
        );
      })}
    </nav>
  );
}

function Logo({ size = "default" }: { size?: "default" | "sm" }) {
  const sizeClasses = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const textSize = size === "sm" ? "text-lg" : "text-xl";

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <motion.div
          className="absolute inset-0 bg-blue-500/40 blur-xl rounded-2xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className={cn("relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 shadow-xl shadow-blue-500/30", sizeClasses)}
          whileHover={{ rotate: 10, scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <Droplets className="h-5 w-5 text-white" />
        </motion.div>
      </div>
      <div>
        <motion.span
          className={cn("font-black tracking-tight text-white", textSize)}
          whileHover={{ scale: 1.02 }}
        >
          WYCENKA
        </motion.span>
        <div className="text-[10px] text-slate-400 -mt-0.5 font-medium tracking-wide uppercase">System wycen</div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 grid-pattern" />
      </div>
      <motion.div
        className="relative z-10 flex h-16 items-center px-5 border-b border-white/10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Logo />
      </motion.div>
      <div className="relative z-10 flex-1 overflow-y-auto">
        <NavContent />
      </div>
      <motion.div
        className="relative z-10 border-t border-white/10 p-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-between px-3">
          <ThemeToggle />
        </div>
      </motion.div>
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden flex items-center justify-between border-b px-4 h-14 bg-gradient-to-r from-slate-900 to-slate-950 sticky top-0 z-50">
      <Logo size="sm" />
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/10 rounded-xl" />}>
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-slate-900 border-white/10">
            <div className="flex h-16 items-center px-5 border-b border-white/10">
              <Logo />
            </div>
            <div className="relative flex-1 overflow-y-auto">
              <NavContent onNavigate={() => setOpen(false)} />
            </div>
            <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-3">
              <div className="flex items-center justify-between px-3">
                <ThemeToggle />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
