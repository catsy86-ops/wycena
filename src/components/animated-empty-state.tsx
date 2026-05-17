"use client";

import { motion } from "framer-motion";
import { LucideIcon, Wrench } from "lucide-react";

interface AnimatedEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function AnimatedEmptyState({
  icon: Icon = Wrench,
  title,
  description,
  action,
}: AnimatedEmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-4"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Ikona z efektem manometru */}
      <motion.div
        className="relative mb-6"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Zewnętrzny pierścień — manometr */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            border: "2px solid oklch(0.52 0.19 220 / 0.2)",
            boxShadow: "0 0 0 6px oklch(0.52 0.19 220 / 0.06)",
          }}
          animate={{
            boxShadow: [
              "0 0 0 6px oklch(0.52 0.19 220 / 0.06)",
              "0 0 0 12px oklch(0.52 0.19 220 / 0.10)",
              "0 0 0 6px oklch(0.52 0.19 220 / 0.06)",
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Glow */}
        <div
          className="absolute inset-0 rounded-full blur-xl"
          style={{ background: "oklch(0.52 0.19 220 / 0.12)" }}
        />

        {/* Ikona */}
        <div
          className="relative flex h-20 w-20 items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(135deg, oklch(0.52 0.19 220 / 0.12), oklch(0.62 0.17 195 / 0.08))",
            border: "1px solid oklch(0.52 0.19 220 / 0.2)",
          }}
        >
          <Icon
            className="h-9 w-9"
            style={{ color: "oklch(0.52 0.19 220 / 0.5)" }}
          />
        </div>

        {/* Nity dekoracyjne */}
        {[0, 90, 180, 270].map((deg) => (
          <div
            key={deg}
            className="absolute w-2 h-2 rounded-full"
            style={{
              top: "50%",
              left: "50%",
              transform: `rotate(${deg}deg) translateX(44px) translateY(-50%)`,
              background: "radial-gradient(circle at 35% 35%, oklch(0.72 0.02 225 / 0.4), oklch(0.32 0.03 225 / 0.25))",
              boxShadow: "inset 0 1px 1px oklch(0 0 0 / 0.4)",
            }}
          />
        ))}
      </motion.div>

      {/* Tytuł */}
      <motion.h3
        className="text-lg font-bold text-foreground mb-1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {title}
      </motion.h3>

      {/* Opis */}
      {description && (
        <motion.p
          className="text-sm text-muted-foreground text-center max-w-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {description}
        </motion.p>
      )}

      {/* Pasek "ciśnienia" dekoracyjny */}
      <motion.div
        className="mt-4 w-24 h-0.5 rounded-full overflow-hidden"
        style={{ background: "oklch(0.52 0.19 220 / 0.1)" }}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.35, duration: 0.4 }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, oklch(0.52 0.19 220), oklch(0.62 0.17 195))",
          }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Akcja */}
      {action && (
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}
