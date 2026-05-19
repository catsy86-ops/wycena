"use client";

import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * Tło elektryczne:
 * - Obwody i iskry zamiast rur i bąbelków
 * - Kolory: amber/żółty (hue ~60) zamiast niebieskiego (hue ~220)
 * - Lazy render — nie blokuje FCP
 * - CSS-only animacje gdzie możliwe
 */

const CIRCUIT_DATA = [
  { id: 0, top: 12, duration: 4, delay: 0, width: 25, opacity: 0.08 },
  { id: 1, top: 30, duration: 6, delay: 1.5, width: 30, opacity: 0.06 },
  { id: 2, top: 50, duration: 5, delay: 0.8, width: 35, opacity: 0.07 },
  { id: 3, top: 70, duration: 7, delay: 2.5, width: 22, opacity: 0.06 },
  { id: 4, top: 88, duration: 4.5, delay: 3, width: 28, opacity: 0.05 },
];

const SPARK_DATA_DESKTOP = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  left: 5 + (i * 9.5) % 85,
  size: 3 + (i * 1.8) % 6,
  duration: 8 + (i * 1.2) % 6,
  delay: (i * 2.1) % 8,
  opacity: 0.06 + (i * 0.006) % 0.05,
}));

const SPARK_DATA_MOBILE = SPARK_DATA_DESKTOP.slice(0, 4);

const CircuitLine = memo(({ data }: { data: typeof CIRCUIT_DATA[0] }) => (
  <div
    className="absolute h-px overflow-hidden"
    style={{ top: `${data.top}%`, left: 0, right: 0, opacity: data.opacity }}
  >
    <div
      style={{
        height: "100%",
        width: `${data.width}%`,
        background: "linear-gradient(90deg, transparent, oklch(0.72 0.18 60 / 0.7), transparent)",
        animation: `circuit-pulse ${data.duration}s linear ${data.delay}s infinite`,
        willChange: "transform",
      }}
    />
  </div>
));
CircuitLine.displayName = "CircuitLine";

const Spark = memo(({ data }: { data: typeof SPARK_DATA_DESKTOP[0] }) => (
  <div
    className="absolute rounded-full"
    style={{
      left: `${data.left}%`,
      top: `${20 + (data.id * 7) % 60}%`,
      width: data.size,
      height: data.size,
      opacity: data.opacity,
      background: "oklch(0.82 0.18 60 / 0.6)",
      animation: `spark-flash ${data.duration}s ease-in-out ${data.delay}s infinite`,
      willChange: "opacity, transform",
    }}
  />
));
Spark.displayName = "Spark";

export function ElectricalBackground() {
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 150);
    setIsMobile(window.innerWidth < 768);

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => { clearTimeout(timer); window.removeEventListener("resize", handleResize); };
  }, []);

  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return (
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 electrical-bg-gradient" />
        <div className="absolute inset-0 circuit-grid opacity-40" />
      </div>
    );
  }

  if (!visible) return null;

  const sparks = isMobile ? SPARK_DATA_MOBILE : SPARK_DATA_DESKTOP;
  const circuits = isMobile ? CIRCUIT_DATA.slice(0, 3) : CIRCUIT_DATA;

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ contain: "strict" }}
      aria-hidden="true"
    >
      {/* Gradient */}
      <div className="absolute inset-0 electrical-bg-gradient" />

      {/* Circuit grid */}
      <div className="absolute inset-0 circuit-grid opacity-50" />

      {/* Circuit lines */}
      {circuits.map((line) => (
        <CircuitLine key={line.id} data={line} />
      ))}

      {/* Sparks */}
      {sparks.map((s) => (
        <Spark key={s.id} data={s} />
      ))}

      {/* Corner glows — amber */}
      <motion.div
        className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl hidden sm:block"
        style={{ background: "oklch(0.72 0.18 60 / 0.06)" }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full blur-3xl hidden sm:block"
        style={{ background: "oklch(0.82 0.16 85 / 0.05)" }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
    </div>
  );
}
