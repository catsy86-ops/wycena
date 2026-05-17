"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  count?: number;
}

/* Pojedynczy pasek — efekt "spawu" (shimmer w kolorze stali) */
export function Skeleton({ className = "", count = 1 }: SkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn("h-4 rounded-md overflow-hidden relative", className)}
          style={{ background: "oklch(0.52 0.19 220 / 0.06)" }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, oklch(0.52 0.19 220 / 0.12) 40%, oklch(0.62 0.17 195 / 0.15) 50%, oklch(0.52 0.19 220 / 0.12) 60%, transparent 100%)",
              backgroundSize: "200% 100%",
            }}
            animate={{ backgroundPosition: ["-200% 0", "200% 0"] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.08,
            }}
          />
        </div>
      ))}
    </div>
  );
}

/* Karta skeleton */
export function CardSkeleton() {
  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{
        background: "oklch(0.52 0.19 220 / 0.04)",
        border: "1px solid oklch(0.52 0.19 220 / 0.1)",
      }}
    >
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  );
}

/* Tabela skeleton — wiersze jak segmenty rury */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {/* Nagłówek */}
      <div
        className="h-10 rounded-lg overflow-hidden relative"
        style={{ background: "oklch(0.52 0.19 220 / 0.08)" }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent, oklch(0.62 0.17 195 / 0.15), transparent)",
            backgroundSize: "200% 100%",
          }}
          animate={{ backgroundPosition: ["-200% 0", "200% 0"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Wiersze */}
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          className="h-12 rounded-lg overflow-hidden relative"
          style={{ background: "oklch(0.52 0.19 220 / 0.04)" }}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06, duration: 0.3 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.52 0.19 220 / 0.10), transparent)",
              backgroundSize: "200% 100%",
            }}
            animate={{ backgroundPosition: ["-200% 0", "200% 0"] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.1,
            }}
          />
          {/* Nit po lewej */}
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 35% 35%, oklch(0.72 0.02 225 / 0.3), oklch(0.32 0.03 225 / 0.2))",
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}
