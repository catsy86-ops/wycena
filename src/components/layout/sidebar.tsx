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
  Wrench,
  Gauge,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebarBadges } from "@/components/sidebar-badges";
import { PressureStatus } from "@/components/hydraulic-decorations";

const NAV_ITEMS = [
  { href: "/",             label: "Pulpit",       icon: LayoutDashboard, group: "main" },
  { href: "/wyceny",       label: "Wyceny",        icon: FileText,        group: "main" },
  { href: "/klienci",      label: "Klienci",       icon: Users,           group: "main" },
  { href: "/uslugi",       label: "Usługi",        icon: Wrench,          group: "catalog" },
  { href: "/materialy",    label: "Materiały",     icon: Package,         group: "catalog" },
  { href: "/szablony",     label: "Szablony",      icon: ClipboardList,   group: "catalog" },
  { href: "/harmonogram",  label: "Harmonogram",   icon: Calendar,        group: "ops" },
  { href: "/czas",         label: "Czas pracy",    icon: Clock,           group: "ops" },
  { href: "/faktury",      label: "Faktury",       icon: FileCheck,       group: "ops" },
  { href: "/raporty",      label: "Raporty",       icon: BarChart3,       group: "ops" },
  { href: "/ustawienia",   label: "Ustawienia",    icon: Settings,        group: "system" },
];

const GROUP_LABELS: Record<string, string> = {
  main:    "Główne",
  catalog: "Katalog",
  ops:     "Operacje",
  system:  "System",
};

/* ── Nit dekoracyjny ── */
function Rivet({ className }: { className?: string }) {
  return (
    <div
      className={cn("w-2 h-2 rounded-full shrink-0", className)}
      style={{
        background: "radial-gradient(circle at 35% 35%, oklch(0.72 0.02 225 / 0.6), oklch(0.32 0.03 225 / 0.4))",
        boxShadow: "inset 0 1px 1px oklch(0 0 0 / 0.5), 0 1px 0 oklch(1 0 0 / 0.1)",
      }}
    />
  );
}

/* ── Logo ── */
function Logo({ size = "default" }: { size?: "default" | "sm" }) {
  const isSmall = size === "sm";

  return (
    <div className="flex items-center gap-3">
      {/* Ikona — manometr / rura */}
      <div className="relative">
        <motion.div
          className="absolute inset-0 rounded-xl blur-lg"
          style={{ background: "oklch(0.52 0.19 220 / 0.4)" }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className={cn(
            "relative flex items-center justify-center rounded-xl",
            "border border-white/10",
            isSmall ? "h-8 w-8" : "h-10 w-10"
          )}
          style={{
            background: "linear-gradient(135deg, oklch(0.52 0.19 220), oklch(0.44 0.20 230))",
            boxShadow: "0 4px 16px oklch(0.52 0.19 220 / 0.4), inset 0 1px 0 oklch(1 0 0 / 0.15)",
          }}
          whileHover={{ rotate: 15, scale: 1.08 }}
          transition={{ type: "spring", stiffness: 400, damping: 12 }}
        >
          <Droplets className={cn("text-white", isSmall ? "h-4 w-4" : "h-5 w-5")} />
        </motion.div>
      </div>

      {/* Tekst */}
      <div>
        <motion.div
          className={cn(
            "font-black tracking-widest uppercase",
            isSmall ? "text-base" : "text-lg"
          )}
          style={{
            background: "linear-gradient(135deg, oklch(0.92 0.01 220), oklch(0.72 0.17 195), oklch(0.92 0.01 220))",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "text-weld 5s ease-in-out infinite",
          }}
          whileHover={{ scale: 1.02 }}
        >
          WYCENKA
        </motion.div>
        <div
          className="text-[9px] font-semibold tracking-[0.2em] uppercase -mt-0.5"
          style={{ color: "oklch(0.62 0.17 195 / 0.7)" }}
        >
          System wycen
        </div>
      </div>
    </div>
  );
}

/* ── Pozycja nawigacji ── */
function NavItem({
  item,
  index,
  isActive,
  onNavigate,
  badge,
}: {
  item: typeof NAV_ITEMS[0];
  index: number;
  isActive: boolean;
  onNavigate?: () => void;
  badge?: number;
}) {
  const Icon = item.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
    >
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
          "transition-all duration-200 overflow-hidden",
          isActive
            ? "text-white"
            : "text-slate-400 hover:text-white"
        )}
      >
        {/* Aktywne tło — efekt spawu */}
        {isActive && (
          <motion.div
            layoutId="active-nav-bg"
            className="absolute inset-0 rounded-lg"
            style={{
              background: "linear-gradient(135deg, oklch(0.52 0.19 220 / 0.9), oklch(0.44 0.20 230 / 0.9))",
              boxShadow: "0 2px 12px oklch(0.52 0.19 220 / 0.4), inset 0 1px 0 oklch(1 0 0 / 0.1)",
            }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}

        {/* Hover tło */}
        {!isActive && (
          <div
            className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: "oklch(1 0 0 / 0.06)" }}
          />
        )}

        {/* Lewa krawędź — rura */}
        {isActive && (
          <motion.div
            layoutId="active-nav-pipe"
            className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
            style={{ background: "oklch(0.72 0.17 195)" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}

        {/* Ikona */}
        <motion.div
          className="relative z-10 shrink-0"
          whileHover={{ rotate: 8, scale: 1.15 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
        >
          <Icon className="h-4 w-4" />
        </motion.div>

        {/* Label */}
        <span className="relative z-10 flex-1">{item.label}</span>

        {/* Badge powiadomień */}
        {badge && badge > 0 && !isActive && (
          <span className="relative z-10 badge-notify">{badge}</span>
        )}

        {/* Nit aktywny */}
        {isActive && (
          <motion.div
            layoutId="active-nav-rivet"
            className="relative z-10"
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          >
            <Rivet />
          </motion.div>
        )}
      </Link>
    </motion.div>
  );
}

/* ── Zawartość nawigacji ── */
function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = ["main", "catalog", "ops", "system"];

  // Badge powiadomień
  const badges = useSidebarBadges();

  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {groups.map((group) => {
        const items = NAV_ITEMS.filter((i) => i.group === group);
        const globalIndex = NAV_ITEMS.findIndex((i) => i.group === group);
        return (
          <div key={group} className="mb-2">
            {/* Separator grupy */}
            <div className="flex items-center gap-2 px-3 mb-1 mt-1">
              <div className="h-px flex-1" style={{ background: "oklch(1 0 0 / 0.08)" }} />
              <span
                className="text-[9px] font-bold tracking-[0.15em] uppercase"
                style={{ color: "oklch(0.52 0.19 220 / 0.5)" }}
              >
                {GROUP_LABELS[group]}
              </span>
              <div className="h-px flex-1" style={{ background: "oklch(1 0 0 / 0.08)" }} />
            </div>
            {items.map((item, i) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              // Mapuj badge na href
              const badgeCount = item.href === "/wyceny" ? badges.wyceny : item.href === "/faktury" ? badges.faktury : undefined;
              return (
                <NavItem
                  key={item.href}
                  item={item}
                  index={globalIndex + i}
                  isActive={isActive}
                  onNavigate={onNavigate}
                  badge={badgeCount}
                />
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

/* ── Sidebar desktop ── */
export function Sidebar() {
  return (
    <aside
      className="hidden md:flex md:w-60 md:flex-col relative overflow-hidden shrink-0"
      style={{
        background: "linear-gradient(180deg, oklch(0.13 0.022 228) 0%, oklch(0.10 0.018 230) 100%)",
        borderRight: "1px solid oklch(1 0 0 / 0.07)",
      }}
    >
      {/* Blueprint grid w tle sidebara */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.52 0.19 220 / 0.08) 1px, transparent 1px), linear-gradient(90deg, oklch(0.52 0.19 220 / 0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Pionowa linia rury po lewej */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5"
        style={{
          background: "linear-gradient(to bottom, transparent, oklch(0.52 0.19 220 / 0.5) 20%, oklch(0.62 0.17 195 / 0.7) 50%, oklch(0.52 0.19 220 / 0.5) 80%, transparent)",
          animation: "pressure-pulse 5s ease-in-out infinite",
        }}
      />

      {/* Header z logo */}
      <motion.div
        className="relative z-10 flex h-16 items-center px-4 shrink-0"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Nity w headerze */}
        <div className="absolute top-2 left-2"><Rivet /></div>
        <div className="absolute top-2 right-2"><Rivet /></div>
        <div className="absolute bottom-2 left-2"><Rivet /></div>
        <div className="absolute bottom-2 right-2"><Rivet /></div>
        <Logo />
      </motion.div>

      {/* Nawigacja */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <NavContent />
      </div>

      {/* Footer */}
      <motion.div
        className="relative z-10 p-3 shrink-0"
        style={{ borderTop: "1px solid oklch(1 0 0 / 0.07)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {/* Pasek ciśnienia */}
        <div className="mb-3 px-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Gauge className="h-3 w-3" style={{ color: "oklch(0.62 0.17 195 / 0.6)" }} />
              <span className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "oklch(0.52 0.19 220 / 0.5)" }}>
                System
              </span>
            </div>
            <PressureStatus level="ok" label="OK" />
          </div>
          <div
            className="h-1 rounded-full overflow-hidden"
            style={{ background: "oklch(1 0 0 / 0.06)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, oklch(0.52 0.19 220), oklch(0.62 0.17 195))",
              }}
              animate={{ width: ["60%", "85%", "72%", "90%", "68%"] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-1">
          <ThemeToggle />
          <div className="flex gap-1">
            <Rivet />
            <Rivet />
          </div>
        </div>
      </motion.div>
    </aside>
  );
}

/* ── Mobile nav ── */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Zamknij przy zmianie strony
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div
      className="md:hidden flex items-center justify-between px-4 h-14 sticky top-0 z-50"
      style={{
        background: "linear-gradient(90deg, oklch(0.13 0.022 228), oklch(0.10 0.018 230))",
        borderBottom: "1px solid oklch(1 0 0 / 0.08)",
        boxShadow: "0 2px 16px oklch(0 0 0 / 0.3)",
      }}
    >
      {/* Nity w rogach */}
      <div className="absolute top-1.5 left-1.5"><Rivet /></div>
      <div className="absolute top-1.5 right-1.5"><Rivet /></div>

      {/* Linia rury na dole */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, oklch(0.52 0.19 220 / 0.6) 30%, oklch(0.62 0.17 195 / 0.8) 50%, oklch(0.52 0.19 220 / 0.6) 70%, transparent)",
          animation: "pipe-flow 4s linear infinite",
        }}
      />

      <Logo size="sm" />

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg text-white hover:bg-white/10"
              aria-label="Menu"
            >
              <AnimatePresence mode="wait">
                {open ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </SheetTrigger>

          <SheetContent
            side="left"
            className="w-72 p-0 border-r-0"
            style={{
              background: "linear-gradient(180deg, oklch(0.13 0.022 228) 0%, oklch(0.10 0.018 230) 100%)",
              borderRight: "1px solid oklch(1 0 0 / 0.07)",
            }}
          >
            {/* Header */}
            <div
              className="relative flex h-16 items-center px-4"
              style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
            >
              <div className="absolute top-2 left-2"><Rivet /></div>
              <div className="absolute top-2 right-2"><Rivet /></div>
              <div className="absolute bottom-2 left-2"><Rivet /></div>
              <div className="absolute bottom-2 right-2"><Rivet /></div>
              <Logo />
            </div>

            {/* Blueprint grid */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(oklch(0.52 0.19 220 / 0.1) 1px, transparent 1px), linear-gradient(90deg, oklch(0.52 0.19 220 / 0.1) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />

            {/* Nawigacja */}
            <div className="relative overflow-y-auto h-[calc(100%-8rem)]">
              <NavContent onNavigate={() => setOpen(false)} />
            </div>

            {/* Footer */}
            <div
              className="absolute bottom-0 left-0 right-0 p-3"
              style={{ borderTop: "1px solid oklch(1 0 0 / 0.07)" }}
            >
              <div className="flex items-center justify-between px-1">
                <ThemeToggle />
                <div className="flex gap-1">
                  <Rivet />
                  <Rivet />
                  <Rivet />
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
