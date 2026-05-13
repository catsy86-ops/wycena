"use client";

import { motion } from "framer-motion";
import { Wrench, Droplets, Pipette, Bolt, Cog, Hammer, Ruler } from "lucide-react";

const ICONS = [Wrench, Droplets, Pipette, Bolt, Cog, Hammer, Ruler];

function FloatingIcon({ Icon, delay, x, y, duration }: { Icon: React.ComponentType<{ className?: string }>; delay: number; x: number; y: number; duration: number }) {
  return (
    <motion.div
      className="absolute text-blue-500/10 dark:text-blue-400/5"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, y: 20, rotate: 0 }}
      animate={{ opacity: [0, 0.15, 0], y: -40, rotate: 360 }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      <Icon className="h-6 w-6" />
    </motion.div>
  );
}

export function ConstructionBackground() {
  const icons = Array.from({ length: 20 }, (_, i) => ({
    Icon: ICONS[i % ICONS.length],
    delay: i * 1.5,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: 15 + Math.random() * 15,
  }));

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="construction-pattern absolute inset-0" />
      <div className="grid-pattern absolute inset-0" />
      {icons.map((icon, i) => (
        <FloatingIcon key={i} {...icon} />
      ))}
    </div>
  );
}