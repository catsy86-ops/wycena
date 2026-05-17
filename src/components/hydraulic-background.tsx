"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";

/* ─── Stałe dane generowane raz (poza komponentem) ─── */

const BUBBLE_DATA = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: 5 + (i * 5.5) % 90,
  size: 5 + (i * 3.7) % 14,
  duration: 9 + (i * 1.3) % 11,
  delay: (i * 1.7) % 12,
  opacity: 0.06 + (i * 0.007) % 0.10,
}));

const FLOW_DATA = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  top: 8 + i * 15,
  duration: 5 + (i * 1.4) % 7,
  delay: (i * 0.9) % 4,
  width: 25 + (i * 8) % 35,
  opacity: 0.08 + (i * 0.015) % 0.12,
}));

const PIPE_SEGMENTS = [
  { x1: "0%", y1: "25%", x2: "30%", y2: "25%", stroke: "oklch(0.52 0.19 220 / 0.08)" },
  { x1: "30%", y1: "25%", x2: "30%", y2: "55%", stroke: "oklch(0.52 0.19 220 / 0.06)" },
  { x1: "30%", y1: "55%", x2: "70%", y2: "55%", stroke: "oklch(0.62 0.17 195 / 0.07)" },
  { x1: "70%", y1: "55%", x2: "70%", y2: "30%", stroke: "oklch(0.52 0.19 220 / 0.06)" },
  { x1: "70%", y1: "30%", x2: "100%", y2: "30%", stroke: "oklch(0.52 0.19 220 / 0.08)" },
  { x1: "15%", y1: "75%", x2: "55%", y2: "75%", stroke: "oklch(0.62 0.17 195 / 0.06)" },
  { x1: "55%", y1: "75%", x2: "55%", y2: "90%", stroke: "oklch(0.52 0.19 220 / 0.05)" },
  { x1: "80%", y1: "10%", x2: "80%", y2: "45%", stroke: "oklch(0.62 0.17 195 / 0.07)" },
];

const GEAR_DATA = [
  { cx: "8%", cy: "15%", r: 28, duration: 22, rev: false, opacity: 0.06 },
  { cx: "92%", cy: "85%", r: 22, duration: 18, rev: true, opacity: 0.07 },
  { cx: "88%", cy: "12%", r: 16, duration: 14, rev: false, opacity: 0.05 },
  { cx: "5%", cy: "80%", r: 20, duration: 20, rev: true, opacity: 0.06 },
];

const RIVET_DATA = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: 5 + (i * 8.5) % 90,
  y: 5 + (i * 7.3) % 90,
  size: 3 + (i % 3),
}));

/* ─── Sub-komponenty ─── */

const Bubble = memo(({ data }: { data: typeof BUBBLE_DATA[0] }) => (
  <div
    className="absolute rounded-full"
    style={{
      left: `${data.left}%`,
      bottom: "-20px",
      width: data.size,
      height: data.size,
      opacity: data.opacity,
      background: "radial-gradient(circle at 35% 35%, oklch(0.72 0.17 195), oklch(0.42 0.19 220))",
      animation: `bubble-rise ${data.duration}s ease-in-out ${data.delay}s infinite`,
      willChange: "transform, opacity",
    }}
  />
));
Bubble.displayName = "Bubble";

const FlowLine = memo(({ data }: { data: typeof FLOW_DATA[0] }) => (
  <div
    className="absolute h-px overflow-hidden"
    style={{ top: `${data.top}%`, left: 0, right: 0, opacity: data.opacity }}
  >
    <div
      style={{
        height: "100%",
        width: `${data.width}%`,
        background: "linear-gradient(90deg, transparent, oklch(0.62 0.17 195), oklch(0.52 0.19 220), transparent)",
        animation: `pipe-flow ${data.duration}s linear ${data.delay}s infinite`,
        willChange: "transform",
      }}
    />
  </div>
));
FlowLine.displayName = "FlowLine";

function GearSVG({ cx, cy, r, teeth = 8 }: { cx: number; cy: number; r: number; teeth?: number }) {
  const outerR = r;
  const innerR = r * 0.72;
  const toothH = r * 0.28;
  const points: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const angle = (i * Math.PI) / teeth - Math.PI / 2;
    const radius = i % 2 === 0 ? outerR + toothH : outerR;
    points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return (
    <g>
      <polygon points={points.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r * 0.18} fill="currentColor" />
    </g>
  );
}

/* ─── Główny komponent ─── */

export function HydraulicBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ contain: "strict" }}
      aria-hidden="true"
    >
      {/* Gradient atmosferyczny */}
      <div className="absolute inset-0 app-bg-gradient" />

      {/* Blueprint grid */}
      <div className="absolute inset-0 blueprint-grid opacity-60" />

      {/* SVG — rury i zębatki */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 1 }}
        preserveAspectRatio="none"
      >
        {/* Rury */}
        {PIPE_SEGMENTS.map((seg, i) => (
          <line
            key={i}
            x1={seg.x1} y1={seg.y1}
            x2={seg.x2} y2={seg.y2}
            stroke={seg.stroke}
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}
        {/* Złączki na rogach rur */}
        {[
          { cx: "30%", cy: "25%", r: 5 },
          { cx: "30%", cy: "55%", r: 5 },
          { cx: "70%", cy: "55%", r: 5 },
          { cx: "70%", cy: "30%", r: 5 },
          { cx: "55%", cy: "75%", r: 4 },
        ].map((c, i) => (
          <circle
            key={i}
            cx={c.cx} cy={c.cy} r={c.r}
            fill="none"
            stroke="oklch(0.52 0.19 220 / 0.12)"
            strokeWidth="2"
          />
        ))}

        {/* Zębatki */}
        {GEAR_DATA.map((g, i) => (
          <motion.g
            key={i}
            style={{
              color: `oklch(0.52 0.19 220 / ${g.opacity})`,
              transformOrigin: `${g.cx} ${g.cy}`,
            }}
            animate={{ rotate: g.rev ? -360 : 360 }}
            transition={{ duration: g.duration, repeat: Infinity, ease: "linear" }}
          >
            <GearSVG
              cx={parseFloat(g.cx) * 10}
              cy={parseFloat(g.cy) * 10}
              r={g.r}
              teeth={10}
            />
          </motion.g>
        ))}
      </svg>

      {/* Nity / śruby dekoracyjne */}
      {RIVET_DATA.map((r) => (
        <div
          key={r.id}
          className="absolute rounded-full"
          style={{
            left: `${r.x}%`,
            top: `${r.y}%`,
            width: r.size,
            height: r.size,
            background: "radial-gradient(circle at 35% 35%, oklch(0.82 0.02 225 / 0.25), oklch(0.42 0.03 225 / 0.15))",
            boxShadow: "inset 0 1px 1px oklch(0 0 0 / 0.3)",
          }}
        />
      ))}

      {/* Linie przepływu */}
      {FLOW_DATA.map((line) => (
        <FlowLine key={line.id} data={line} />
      ))}

      {/* Bąbelki */}
      {BUBBLE_DATA.map((b) => (
        <Bubble key={b.id} data={b} />
      ))}

      {/* Glowy świetlne w rogach */}
      <motion.div
        className="absolute -top-24 -left-24 w-64 h-64 rounded-full blur-3xl"
        style={{ background: "oklch(0.52 0.19 220 / 0.08)" }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full blur-3xl"
        style={{ background: "oklch(0.62 0.17 195 / 0.07)" }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
      <motion.div
        className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full blur-3xl"
        style={{ background: "oklch(0.55 0.18 240 / 0.05)" }}
        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 6 }}
      />

      {/* Manometr dekoracyjny — prawy górny róg */}
      <motion.div
        className="absolute top-6 right-6 w-16 h-16 rounded-full hidden lg:flex items-center justify-center"
        style={{
          border: "2px solid oklch(0.52 0.19 220 / 0.12)",
          boxShadow: "0 0 0 4px oklch(0.52 0.19 220 / 0.05), inset 0 0 12px oklch(0.52 0.19 220 / 0.06)",
        }}
        animate={{ boxShadow: [
          "0 0 0 4px oklch(0.52 0.19 220 / 0.05), inset 0 0 12px oklch(0.52 0.19 220 / 0.06)",
          "0 0 0 8px oklch(0.52 0.19 220 / 0.10), inset 0 0 20px oklch(0.52 0.19 220 / 0.12)",
          "0 0 0 4px oklch(0.52 0.19 220 / 0.05), inset 0 0 12px oklch(0.52 0.19 220 / 0.06)",
        ]}}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="w-8 h-8 rounded-full"
          style={{
            background: "radial-gradient(circle at 40% 40%, oklch(0.62 0.17 195 / 0.2), oklch(0.52 0.19 220 / 0.08))",
            border: "1px solid oklch(0.52 0.19 220 / 0.15)",
          }}
        />
      </motion.div>
    </div>
  );
}
