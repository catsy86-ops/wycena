"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Wrench, Droplets, Gauge, Cog, Hammer, Ruler, Bolt, Flame } from "lucide-react";

const ICONS = [Wrench, Droplets, Gauge, Cog, Hammer, Ruler, Bolt, Flame];

const TOOL_DATA = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  Icon: ICONS[i % ICONS.length],
  x: 3 + (i * 6.1) % 94,
  y: 3 + (i * 5.7) % 94,
  size: 14 + (i * 2.3) % 14,
  duration: 16 + (i * 1.7) % 18,
  delay: (i * 1.4) % 14,
  rotation: (i * 47) % 360,
}));

const FloatingTool = memo(({ data }: { data: typeof TOOL_DATA[0] }) => (
  <motion.div
    className="absolute"
    style={{
      left: `${data.x}%`,
      top: `${data.y}%`,
      color: "oklch(0.52 0.19 220 / 0.07)",
    }}
    animate={{
      y: [0, -20, -8, -24, 0],
      rotate: [data.rotation, data.rotation + 30, data.rotation - 10, data.rotation + 20, data.rotation],
      opacity: [0, 0.12, 0.10, 0.14, 0],
      scale: [0.8, 1.1, 0.95, 1.05, 0.8],
    }}
    transition={{
      duration: data.duration,
      delay: data.delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  >
    <data.Icon style={{ width: data.size, height: data.size }} />
  </motion.div>
));
FloatingTool.displayName = "FloatingTool";

export function ConstructionBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {/* Wzór kratki spawalniczej */}
      <div className="absolute inset-0 weld-pattern opacity-50" />

      {/* Pływające narzędzia */}
      {TOOL_DATA.map((tool) => (
        <FloatingTool key={tool.id} data={tool} />
      ))}

      {/* Pasy ostrzegawcze w rogach */}
      <div
        className="absolute top-0 left-0 w-16 h-16 opacity-20"
        style={{
          background: "repeating-linear-gradient(-45deg, oklch(0.82 0.18 85), oklch(0.82 0.18 85) 4px, oklch(0.15 0.01 0) 4px, oklch(0.15 0.01 0) 8px)",
          clipPath: "polygon(0 0, 100% 0, 0 100%)",
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-16 h-16 opacity-20"
        style={{
          background: "repeating-linear-gradient(-45deg, oklch(0.82 0.18 85), oklch(0.82 0.18 85) 4px, oklch(0.15 0.01 0) 4px, oklch(0.15 0.01 0) 8px)",
          clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
        }}
      />
    </div>
  );
}
