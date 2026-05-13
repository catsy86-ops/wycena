"use client";

import { motion } from "framer-motion";
import { Wrench, Droplets, Pipette, Bolt, Cog, Hammer, Ruler, Gauge, Flame, Fan } from "lucide-react";

const ICONS = [Wrench, Droplets, Pipette, Bolt, Cog, Hammer, Ruler, Gauge, Flame, Fan];

function FloatingIcon({
  Icon,
  delay,
  x,
  y,
  duration,
  size,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  delay: number;
  x: number;
  y: number;
  duration: number;
  size: number;
}) {
  return (
    <motion.div
      className="absolute text-blue-500/10 dark:text-blue-400/5"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, y: 30, rotate: 0, scale: 0.8 }}
      animate={{
        opacity: [0, 0.15, 0.15, 0],
        y: -60,
        rotate: [0, 180, 360],
        scale: [0.8, 1.2, 0.8],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <Icon className={`h-${size} w-${size}`} />
    </motion.div>
  );
}

export function ConstructionBackground() {
  const icons = Array.from({ length: 30 }, (_, i) => ({
    Icon: ICONS[i % ICONS.length],
    delay: i * 1.2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: 18 + Math.random() * 20,
    size: 4 + Math.floor(Math.random() * 4),
  }));

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0 construction-pattern"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="grid-pattern absolute inset-0" />
      {icons.map((icon, i) => (
        <FloatingIcon key={i} {...icon} />
      ))}
    </div>
  );
}
