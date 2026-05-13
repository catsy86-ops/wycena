"use client";

import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className = "", count = 1 }: SkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className={`h-4 rounded-lg bg-gradient-to-r from-muted/60 via-muted/80 to-muted/60 bg-[length:200%_100%] ${className}`}
          animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-6 space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
