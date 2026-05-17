"use client";

import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * Zoptymalizowane tło hydrauliczne:
 * - Mniej elementów na mobile (performance)
 * - Brak animacji przy prefers-reduced-motion
 * - Lazy render — pojawia się po 200ms (nie blokuje FCP)
 * - CSS-only animacje zamiast framer-motion gdzie możliwe
 */

const FLOW_DATA = [
  { id: 0, top: 15, duration: 6, delay: 0, width: 30, opacity: 0.07 },
  { id: 1, top: 35, duration: 8, delay: 2, width: 25, opacity: 0.06 },
  { id: 2, top: 55, duration: 7, delay: 1, width: 35, opacity: 0.08 },
  { id: 3, top: 75, duration: 9, delay: 3, width: 28, opacity: 0.06 },
  { id: 4, top: 90, duration: 5, delay: 4, width: 20, opacity: 0.05 },
];

const BUBBLE_DATA_DESKTOP = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  left: 8 + (i * 7.5) % 84,
  size: 4 + (i * 2.3) % 10,
  duration: 10 + (i * 1.5) % 8,
  delay: (i * 1.8) % 10,
  opacity: 0.05 + (i * 0.005) % 0.06,
}));

// Mobile: tylko 5 bąbelków
const BUBBLE_DATA_MOBILE = BUBBLE_DATA_DESKTOP.slice(0, 5);

const FlowLine = memo(({ data }: { data: typeof FLOW_DATA[0] }) => (
  <div
    className="absolute h-px overflow-hidden"
    style={{ top: `${data.top}%`, left: 0, right: 0, opacity: data.opacity }}
  >
    <div
      style={{
        height: "100%",
        width: `${data.width}%`,
        background: "linear-gradient(90deg, transparent, oklch(0.52 0.19 220 / 0.6), transparent)",
        animation: `pipe-flow ${data.duration}s linear ${data.delay}s infinite`,
        willChange: "transform",
      }}
    />
  </div>
));
FlowLine.displayName = "FlowLine";

const Bubble = memo(({ data }: { data: typeof BUBBLE_DATA_DESKTOP[0] }) => (
  <div
    className="absolute rounded-full"
    style={{
      left: `${data.left}%`,
      bottom: "-10px",
      width: data.size,
      height: data.size,
      opacity: data.opacity,
      background: "oklch(0.52 0.19 220 / 0.5)",
      animation: `bubble-rise ${data.duration}s ease-in-out ${data.delay}s infinite`,
      willChange: "transform, opacity",
    }}
  />
));
Bubble.displayName = "Bubble";

export function HydraulicBackground() {
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Lazy render — nie blokuj FCP
    const timer = setTimeout(() => setVisible(true), 150);
    setIsMobile(window.innerWidth < 768);

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => { clearTimeout(timer); window.removeEventListener("resize", handleResize); };
  }, []);

  // Sprawdź prefers-reduced-motion
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return (
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 app-bg-gradient" />
        <div className="absolute inset-0 blueprint-grid opacity-40" />
      </div>
    );
  }

  if (!visible) return null;

  const bubbles = isMobile ? BUBBLE_DATA_MOBILE : BUBBLE_DATA_DESKTOP;
  const flows = isMobile ? FLOW_DATA.slice(0, 3) : FLOW_DATA;

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ contain: "strict" }}
      aria-hidden="true"
    >
      {/* Gradient — CSS only, no JS */}
      <div className="absolute inset-0 app-bg-gradient" />

      {/* Blueprint grid — CSS only */}
      <div className="absolute inset-0 blueprint-grid opacity-50" />

      {/* Flow lines — CSS animations */}
      {flows.map((line) => (
        <FlowLine key={line.id} data={line} />
      ))}

      {/* Bubbles — CSS animations */}
      {bubbles.map((b) => (
        <Bubble key={b.id} data={b} />
      ))}

      {/* Corner glows — single framer-motion element (lightweight) */}
      <motion.div
        className="absolute -top-20 -left-20 w-48 h-48 rounded-full blur-3xl hidden sm:block"
        style={{ background: "oklch(0.52 0.19 220 / 0.06)" }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-20 -right-20 w-48 h-48 rounded-full blur-3xl hidden sm:block"
        style={{ background: "oklch(0.62 0.17 195 / 0.05)" }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />
    </div>
  );
}
