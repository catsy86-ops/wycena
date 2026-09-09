"use client";

import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * Zoptymalizowane tło instalatorskie (Hydraulika & Elektryka):
 * - Podwójne akcenty: błękit wodny (oklch 0.60 0.18 215) + iskra elektryczna (oklch 0.72 0.18 60)
 * - Mniej elementów na mobile (pełna wydajność 60 FPS)
 * - Brak animacji przy prefers-reduced-motion
 * - Płynne gradienty i subtelne linie obwodów
 */

const FLOW_DATA = [
  { id: 0, top: 12, duration: 7, delay: 0, width: 35, color: "oklch(0.60 0.18 215 / 0.7)" },
  { id: 1, top: 28, duration: 9, delay: 2, width: 25, color: "oklch(0.72 0.18 60 / 0.65)" },
  { id: 2, top: 48, duration: 8, delay: 1, width: 30, color: "oklch(0.60 0.18 215 / 0.6)" },
  { id: 3, top: 68, duration: 10, delay: 3, width: 28, color: "oklch(0.72 0.18 60 / 0.7)" },
  { id: 4, top: 88, duration: 6, delay: 4, width: 22, color: "oklch(0.60 0.18 215 / 0.5)" },
];

const SPARK_DATA_DESKTOP = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: 6 + (i * 7) % 88,
  size: 3 + (i * 2) % 7,
  duration: 9 + (i * 1.3) % 7,
  delay: (i * 1.5) % 8,
  isAmber: i % 2 === 1,
}));

const SPARK_DATA_MOBILE = SPARK_DATA_DESKTOP.slice(0, 6);

const TradeFlowLine = memo(({ data }: { data: typeof FLOW_DATA[0] }) => (
  <div
    className="absolute h-px overflow-hidden pointer-events-none"
    style={{ top: `${data.top}%`, left: 0, right: 0, opacity: 0.12 }}
  >
    <div
      style={{
        height: "100%",
        width: `${data.width}%`,
        background: `linear-gradient(90deg, transparent, ${data.color}, transparent)`,
        animation: `pipe-flow ${data.duration}s linear ${data.delay}s infinite`,
        willChange: "transform",
      }}
    />
  </div>
));
TradeFlowLine.displayName = "TradeFlowLine";

const TradeSpark = memo(({ data }: { data: typeof SPARK_DATA_DESKTOP[0] }) => (
  <div
    className="absolute rounded-full pointer-events-none"
    style={{
      left: `${data.left}%`,
      bottom: "-12px",
      width: data.size,
      height: data.size,
      background: data.isAmber
        ? "radial-gradient(circle, oklch(0.82 0.18 65 / 0.8) 0%, oklch(0.72 0.18 60 / 0) 70%)"
        : "radial-gradient(circle, oklch(0.65 0.18 215 / 0.8) 0%, oklch(0.55 0.18 215 / 0) 70%)",
      boxShadow: data.isAmber
        ? "0 0 6px oklch(0.72 0.18 60 / 0.5)"
        : "0 0 6px oklch(0.60 0.18 215 / 0.5)",
      animation: `bubble-rise ${data.duration}s ease-in-out ${data.delay}s infinite`,
      willChange: "transform, opacity",
    }}
  />
));
TradeSpark.displayName = "TradeSpark";

export function HydraulicBackground() {
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    setIsMobile(window.innerWidth < 768);

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return (
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 app-bg-gradient" />
        <div className="absolute inset-0 blueprint-grid opacity-30" />
      </div>
    );
  }

  if (!visible) return null;

  const sparks = isMobile ? SPARK_DATA_MOBILE : SPARK_DATA_DESKTOP;
  const flows = isMobile ? FLOW_DATA.slice(0, 3) : FLOW_DATA;

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ contain: "strict" }}
      aria-hidden="true"
    >
      {/* Bazowy gradient tła */}
      <div className="absolute inset-0 app-bg-gradient" />

      {/* Siatka techniczna z miękkim zanikaniem */}
      <div className="absolute inset-0 blueprint-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_90%)]" />

      {/* Linie przepływu prądu i wody */}
      {flows.map((line) => (
        <TradeFlowLine key={line.id} data={line} />
      ))}

      {/* Lśniące iskry i pęcherze */}
      {sparks.map((s) => (
        <TradeSpark key={s.id} data={s} />
      ))}

      {/* Świetliste aury w rogach ekranu (Cyan & Amber) */}
      <motion.div
        className="absolute -top-28 -left-28 w-80 h-80 rounded-full blur-3xl pointer-events-none hidden sm:block"
        style={{
          background: "radial-gradient(circle, oklch(0.60 0.18 215 / 0.09) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-28 -right-28 w-96 h-96 rounded-full blur-3xl pointer-events-none hidden sm:block"
        style={{
          background: "radial-gradient(circle, oklch(0.72 0.18 60 / 0.08) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.75, 0.4] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
    </div>
  );
}
