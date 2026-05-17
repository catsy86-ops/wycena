"use client";

import { motion } from "framer-motion";
import { Droplets, Wrench, Gauge } from "lucide-react";

/**
 * Dekoracyjny separator w stylu rury z zaworem.
 */
export function PipeSeparator({ className }: { className?: string }) {
  return (
    <div className={`joint-separator ${className || ""}`}>
      <div className="joint-icon">
        <Droplets className="h-3 w-3" style={{ color: "oklch(0.52 0.19 220 / 0.5)" }} />
      </div>
    </div>
  );
}

/**
 * Dekoracyjny nagłówek sekcji w stylu przemysłowym.
 */
export function IndustrialSectionHeader({
  children,
  icon,
  className,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`section-industrial ${className || ""}`}>
      <div className="flex items-center gap-2">
        {icon && <span style={{ color: "oklch(0.52 0.19 220)" }}>{icon}</span>}
        <span className="text-sm font-bold">{children}</span>
      </div>
    </div>
  );
}

/**
 * Wskaźnik ciśnienia — animowana kropka z etykietą.
 */
export function PressureStatus({
  level,
  label,
}: {
  level: "ok" | "warning" | "danger";
  label: string;
}) {
  const cls = level === "danger" ? "danger" : level === "warning" ? "warning" : "";
  return (
    <div className={`pressure-indicator ${cls}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * Wyświetlacz w stylu manometru cyfrowego.
 */
export function GaugeDisplay({ value, unit }: { value: string | number; unit?: string }) {
  return (
    <div className="gauge-display">
      <span className="value">{value}</span>
      {unit && <span className="text-[10px] text-muted-foreground ml-1">{unit}</span>}
    </div>
  );
}

/**
 * Pasek postępu w stylu rury hydraulicznej.
 */
export function PipeProgress({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={`progress-pipe ${className || ""}`}>
      <motion.div
        className="progress-pipe-fill"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </div>
  );
}

/**
 * Rząd nitów dekoracyjnych z tekstem pośrodku.
 */
export function BoltRow({ children }: { children?: React.ReactNode }) {
  return (
    <div className="bolt-row">
      {children && <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 shrink-0 px-2">{children}</span>}
    </div>
  );
}

/**
 * Badge w stylu tabliczki znamionowej.
 */
export function HydraulicBadge({ children }: { children: React.ReactNode }) {
  return <span className="badge-hydraulic">{children}</span>;
}

/**
 * Animowany wskaźnik "przepływu" — pulsująca linia.
 */
export function FlowIndicator({ active = true }: { active?: boolean }) {
  if (!active) return null;
  return (
    <motion.div
      className="h-0.5 rounded-full overflow-hidden"
      style={{ background: "oklch(0.52 0.19 220 / 0.1)" }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{
          background: "linear-gradient(90deg, transparent, oklch(0.62 0.17 195), transparent)",
          width: "30%",
        }}
        animate={{ x: ["-100%", "400%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}
