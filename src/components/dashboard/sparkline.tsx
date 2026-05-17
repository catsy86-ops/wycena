"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

/**
 * Mini wykres sparkline — SVG, lekki, bez recharts.
 * Używany w kartach KPI do pokazania trendu.
 */
export function Sparkline({ data, color = "oklch(0.52 0.19 220)", height = 24, width = 64 }: SparklineProps) {
  const path = useMemo(() => {
    if (data.length < 2) return "";
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const step = width / (data.length - 1);

    const points = data.map((v, i) => ({
      x: i * step,
      y: height - ((v - min) / range) * (height - 4) - 2,
    }));

    // Smooth curve
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [data, height, width]);

  if (data.length < 2) return null;

  const trend = data[data.length - 1] - data[0];
  const trendColor = trend > 0 ? "oklch(0.55 0.18 155)" : trend < 0 ? "oklch(0.60 0.20 25)" : color;

  return (
    <motion.svg
      width={width}
      height={height}
      className="shrink-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <motion.path
        d={path}
        fill="none"
        stroke={trendColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
      />
      {/* Punkt na końcu */}
      <circle
        cx={width}
        cy={(() => {
          const max = Math.max(...data, 1);
          const min = Math.min(...data, 0);
          const range = max - min || 1;
          return height - ((data[data.length - 1] - min) / range) * (height - 4) - 2;
        })()}
        r="2"
        fill={trendColor}
      />
    </motion.svg>
  );
}
