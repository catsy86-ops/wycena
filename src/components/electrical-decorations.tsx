"use client";

import { motion } from "framer-motion";
import { Zap, Cable, CircuitBoard } from "lucide-react";

/**
 * Dekoracyjny separator w stylu kabla elektrycznego.
 */
export function CableSeparator({ className }: { className?: string }) {
  return (
    <div className={`cable-separator ${className || ""}`}>
      <div className="cable-icon">
        <Zap className="h-3 w-3" style={{ color: "oklch(0.72 0.18 60 / 0.7)" }} />
      </div>
    </div>
  );
}

/**
 * Dekoracyjny nagłówek sekcji w stylu elektrycznym.
 */
export function ElectricalSectionHeader({
  children,
  icon,
  className,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`section-electrical ${className || ""}`}>
      <div className="flex items-center gap-2">
        {icon && <span style={{ color: "oklch(0.72 0.18 60)" }}>{icon}</span>}
        <span className="text-sm font-bold">{children}</span>
      </div>
    </div>
  );
}

/**
 * Wskaźnik napięcia — animowana kropka z etykietą.
 */
export function VoltageStatus({
  level,
  label,
}: {
  level: "ok" | "warning" | "danger";
  label: string;
}) {
  const cls = level === "danger" ? "danger" : level === "warning" ? "warning" : "";
  return (
    <div className={`voltage-indicator ${cls}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * Wyświetlacz w stylu multimetru cyfrowego.
 */
export function MultimeterDisplay({ value, unit }: { value: string | number; unit?: string }) {
  return (
    <div className="multimeter-display">
      <span className="value">{value}</span>
      {unit && <span className="text-[10px] text-muted-foreground ml-1">{unit}</span>}
    </div>
  );
}

/**
 * Pasek postępu w stylu kabla elektrycznego.
 */
export function WireProgress({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={`progress-wire ${className || ""}`}>
      <motion.div
        className="progress-wire-fill"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </div>
  );
}

/**
 * Rząd śrub dekoracyjnych z tekstem pośrodku (styl elektryczny).
 */
export function ScrewRow({ children }: { children?: React.ReactNode }) {
  return (
    <div className="screw-row">
      {children && <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 shrink-0 px-2">{children}</span>}
    </div>
  );
}

/**
 * Badge w stylu tabliczki elektrycznej.
 */
export function ElectricalBadge({ children }: { children: React.ReactNode }) {
  return <span className="badge-electrical">{children}</span>;
}

/**
 * Animowany wskaźnik "prądu" — pulsująca linia.
 */
export function CurrentIndicator({ active = true }: { active?: boolean }) {
  if (!active) return null;
  return (
    <motion.div
      className="h-0.5 rounded-full overflow-hidden"
      style={{ background: "oklch(0.72 0.18 60 / 0.1)" }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{
          background: "linear-gradient(90deg, transparent, oklch(0.82 0.18 60), transparent)",
          width: "30%",
        }}
        animate={{ x: ["-100%", "400%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}

/**
 * Ikona błyskawicy dekoracyjna.
 */
export function LightningBolt({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-6 w-6" : size === "md" ? "h-4 w-4" : "h-3 w-3";
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <Zap className={sizeClass} style={{ color: "oklch(0.82 0.18 60)" }} />
    </motion.div>
  );
}
